import type { PositionMatch } from './position-match';

export const POSITION_DATA_SCHEMA_VERSION = 'yt-chess-search-channel-data/v1';
export const POSITION_SEARCH_BATCH_SIZE = 50;

export type PositionIndex = ReadonlyMap<string, readonly PositionMatch[]>;

interface SearchBatch {
  results: PositionMatch[];
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

function requireFiniteNumber(record: Record<string, unknown>, key: string, context: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Position data has an invalid ${context}.${key}.`);
  }

  return value;
}

function compareMatches(left: PositionMatch, right: PositionMatch): number {
  return (
    left.videoName.localeCompare(right.videoName) ||
    left.timeFromSeconds - right.timeFromSeconds
  );
}

export function buildPositionIndex(data: unknown): PositionIndex {
  if (!isRecord(data) || data['schemaVersion'] !== POSITION_DATA_SCHEMA_VERSION) {
    throw new Error('Position data has an unsupported schema version.');
  }

  if (typeof data['channelId'] !== 'string' || !Array.isArray(data['videos'])) {
    throw new Error('Position data is missing its channel or video list.');
  }

  const matchesByPlacement = new Map<string, PositionMatch[]>();
  const allMatches: Array<{ piecePlacement: string; match: PositionMatch }> = [];

  for (const rawVideo of data['videos']) {
    if (!isRecord(rawVideo)) {
      throw new Error('Position data contains an invalid video entry.');
    }

    const videoId = requireString(rawVideo, 'videoId', 'video');
    const videoName = requireString(rawVideo, 'videoName', 'video');
    const sourceUrl = requireString(rawVideo, 'sourceUrl', 'video');
    const thumbnailUrl = requireNullableString(rawVideo, 'thumbnailUrl', 'video');
    const rawPositions = rawVideo['positions'];
    if (!Array.isArray(rawPositions)) {
      throw new Error(`Position data has an invalid positions list for video ${videoId}.`);
    }

    for (const rawPosition of rawPositions) {
      if (!isRecord(rawPosition)) {
        throw new Error(`Position data contains an invalid position for video ${videoId}.`);
      }

      const piecePlacement = requireString(rawPosition, 'piecePlacement', 'position');
      const match: PositionMatch = {
        videoId,
        videoName,
        sourceUrl,
        thumbnailUrl,
        timeFromSeconds: requireFiniteNumber(rawPosition, 'timeFromSeconds', 'position'),
        timeToSeconds: requireFiniteNumber(rawPosition, 'timeToSeconds', 'position'),
        boardOrientation: requireNullableString(rawPosition, 'boardOrientation', 'position'),
      };

      allMatches.push({ piecePlacement, match });
    }
  }

  allMatches.sort((left, right) => compareMatches(left.match, right.match));

  for (const { piecePlacement, match } of allMatches) {
    const matches = matchesByPlacement.get(piecePlacement);
    if (matches) {
      matches.push(match);
    } else {
      matchesByPlacement.set(piecePlacement, [match]);
    }
  }

  return matchesByPlacement;
}

export function readPositionBatch(
  index: PositionIndex,
  piecePlacement: string,
  offset: number,
  limit = POSITION_SEARCH_BATCH_SIZE,
): SearchBatch {
  const matches = index.get(piecePlacement) ?? [];
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.trunc(offset)) : 0;
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 0;

  return {
    results: matches.slice(safeOffset, safeOffset + safeLimit),
    total: matches.length,
  };
}
