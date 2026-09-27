import type { BoardOrientation, PositionOccurrence, PositionVideoMatch } from './position-match';

export const POSITION_DATA_SCHEMA_VERSION = 'yt-chess-search-channel-data/v1';
export const POSITION_SEARCH_BATCH_SIZE = 50;

export type PositionIndex = ReadonlyMap<string, readonly PositionVideoMatch[]>;

interface SearchBatch {
  results: PositionVideoMatch[];
  total: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`Position data has an invalid ${context}.${key}.`);
  }

  return value;
}

function requireNullableString(
  record: Record<string, unknown>,
  key: string,
  context: string,
): string | null {
  const value = record[key];
  if (value !== null && typeof value !== 'string') {
    throw new Error(`Position data has an invalid ${context}.${key}.`);
  }

  return value;
}

function requireFiniteNumber(
  record: Record<string, unknown>,
  key: string,
  context: string,
): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Position data has an invalid ${context}.${key}.`);
  }

  return value;
}

function readUploadDate(record: Record<string, unknown>, videoId: string): string | null {
  const value = record['uploadDate'];
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string' || !isValidUploadDate(value)) {
    throw new Error(`Position data has an invalid video.uploadDate for video ${videoId}.`);
  }

  return value;
}

function readDurationSeconds(record: Record<string, unknown>, videoId: string): number | null {
  const value = record['durationSeconds'];
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Position data has an invalid video.durationSeconds for video ${videoId}.`);
  }

  return value;
}

function isValidUploadDate(value: string): boolean {
  if (!/^\d{8}$/.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (year < 1 || month < 1 || month > 12) {
    return false;
  }

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1];
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareOccurrences(left: PositionOccurrence, right: PositionOccurrence): number {
  return (
    left.timeFromSeconds - right.timeFromSeconds ||
    left.timeToSeconds - right.timeToSeconds ||
    compareText(left.boardOrientation ?? '', right.boardOrientation ?? '')
  );
}

function compareVideos(left: PositionVideoMatch, right: PositionVideoMatch): number {
  if (left.uploadDate === null && right.uploadDate !== null) {
    return 1;
  }
  if (left.uploadDate !== null && right.uploadDate === null) {
    return -1;
  }

  return (
    compareText(right.uploadDate ?? '', left.uploadDate ?? '') ||
    compareText(left.videoName, right.videoName) ||
    compareText(left.videoId, right.videoId)
  );
}

export function buildPositionIndex(data: unknown): PositionIndex {
  if (!isRecord(data) || data['schemaVersion'] !== POSITION_DATA_SCHEMA_VERSION) {
    throw new Error('Position data has an unsupported schema version.');
  }

  if (typeof data['channelId'] !== 'string' || !Array.isArray(data['videos'])) {
    throw new Error('Position data is missing its channel or video list.');
  }

  const matchesByPlacement = new Map<string, Map<string, PositionVideoMatch>>();

  for (const rawVideo of data['videos']) {
    if (!isRecord(rawVideo)) {
      throw new Error('Position data contains an invalid video entry.');
    }

    const videoId = requireString(rawVideo, 'videoId', 'video');
    const videoName = requireString(rawVideo, 'videoName', 'video');
    const sourceUrl = requireString(rawVideo, 'sourceUrl', 'video');
    const thumbnailUrl = requireNullableString(rawVideo, 'thumbnailUrl', 'video');
    const uploadDate = readUploadDate(rawVideo, videoId);
    const durationSeconds = readDurationSeconds(rawVideo, videoId);
    const rawPositions = rawVideo['positions'];
    if (!Array.isArray(rawPositions)) {
      throw new Error(`Position data has an invalid positions list for video ${videoId}.`);
    }

    for (const rawPosition of rawPositions) {
      if (!isRecord(rawPosition)) {
        throw new Error(`Position data contains an invalid position for video ${videoId}.`);
      }

      const piecePlacement = requireString(rawPosition, 'piecePlacement', 'position');
      const occurrence: PositionOccurrence = {
        timeFromSeconds: requireFiniteNumber(rawPosition, 'timeFromSeconds', 'position'),
        timeToSeconds: requireFiniteNumber(rawPosition, 'timeToSeconds', 'position'),
        boardOrientation: requireNullableString(rawPosition, 'boardOrientation', 'position'),
      };

      let videosForPlacement = matchesByPlacement.get(piecePlacement);
      if (!videosForPlacement) {
        videosForPlacement = new Map<string, PositionVideoMatch>();
        matchesByPlacement.set(piecePlacement, videosForPlacement);
      }

      let videoMatch = videosForPlacement.get(videoId);
      if (!videoMatch) {
        videoMatch = {
          videoId,
          videoName,
          sourceUrl,
          thumbnailUrl,
          uploadDate,
          durationSeconds,
          positions: [],
        };
        videosForPlacement.set(videoId, videoMatch);
      }

      videoMatch.positions.push(occurrence);
    }
  }

  const index = new Map<string, PositionVideoMatch[]>();
  for (const [piecePlacement, videosById] of matchesByPlacement) {
    const videos = [...videosById.values()];
    for (const video of videos) {
      video.positions.sort(compareOccurrences);
    }
    videos.sort(compareVideos);
    index.set(piecePlacement, videos);
  }

  return index;
}

export function readPositionBatch(
  index: PositionIndex,
  piecePlacement: string,
  offset: number,
  limit = POSITION_SEARCH_BATCH_SIZE,
  boardOrientation: BoardOrientation | null = null,
): SearchBatch {
  const videos = index.get(piecePlacement) ?? [];
  const matchingVideos =
    boardOrientation === null
      ? videos
      : videos.filter((video) =>
          video.positions.some((position) => position.boardOrientation === boardOrientation),
        );
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.trunc(offset)) : 0;
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 0;
  const page = matchingVideos.slice(safeOffset, safeOffset + safeLimit);

  return {
    results:
      boardOrientation === null
        ? page
        : page.map((video) => ({
            ...video,
            positions: video.positions.filter(
              (position) => position.boardOrientation === boardOrientation,
            ),
          })),
    total: matchingVideos.length,
  };
}
