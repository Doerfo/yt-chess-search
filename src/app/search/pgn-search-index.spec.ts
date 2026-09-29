import {
  buildPositionIndex,
  POSITION_DATA_SCHEMA_VERSION,
  readPgnBatch,
} from './position-search-index';

const FIRST = 'first';
const SECOND = 'second';
const THIRD = 'third';

function video(
  videoId: string,
  placements: Array<{ placement: string; time: number; orientation?: string | null }>,
  uploadDate: string | null = '20250101',
) {
  return {
    videoId,
    videoName: `Video ${videoId}`,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    uploadDate,
    positions: placements.map(({ placement, time, orientation = null }) => ({
      piecePlacement: placement,
      timeFromSeconds: time,
      timeToSeconds: time + 3,
      boardOrientation: orientation,
    })),
  };
}

function index(videos: unknown[]) {
  return buildPositionIndex({
    schemaVersion: POSITION_DATA_SCHEMA_VERSION,
    channelId: 'channel',
    videos,
  });
}

describe('readPgnBatch', () => {
  it('ranks each video by its latest match and uses timestamps from that position', () => {
    const data = index([
      video('earlier', [{ placement: FIRST, time: 8 }]),
      video('both', [
        { placement: FIRST, time: 12 },
        { placement: THIRD, time: 35 },
        { placement: THIRD, time: 60 },
      ]),
      video('middle', [{ placement: SECOND, time: 20 }]),
      video('final', [{ placement: THIRD, time: 15 }], '20260101'),
    ]);

    const batch = readPgnBatch(data, [FIRST, SECOND, THIRD], 0);

    expect(batch.total).toBe(4);
    expect(
      batch.results.map(({ videoId, movesBeforeLatestMatch }) => [videoId, movesBeforeLatestMatch]),
    ).toEqual([
      ['final', 0],
      ['both', 0],
      ['middle', 1],
      ['earlier', 2],
    ]);
    expect(batch.results[1].positions.map(({ timeFromSeconds }) => timeFromSeconds)).toEqual([
      35, 60,
    ]);
    expect(batch.latestMatchedMoveIndex).toBe(2);
  });

  it('uses the last occurrence of a repeated PGN placement and falls back when orientation differs', () => {
    const data = index([
      video('repeat', [{ placement: FIRST, time: 7, orientation: 'white_bottom' }]),
      video('fallback', [
        { placement: SECOND, time: 9, orientation: 'white_bottom' },
        { placement: THIRD, time: 11, orientation: 'black_bottom' },
      ]),
    ]);

    const batch = readPgnBatch(data, [FIRST, SECOND, THIRD, FIRST], 0, 20, 'white_bottom');
    expect(
      batch.results.map(({ videoId, movesBeforeLatestMatch }) => [videoId, movesBeforeLatestMatch]),
    ).toEqual([
      ['repeat', 0],
      ['fallback', 2],
    ]);
    expect(batch.results[1].positions.map(({ timeFromSeconds }) => timeFromSeconds)).toEqual([9]);
    expect(batch.latestMatchedMoveIndex).toBe(3);
  });

  it('anchors zero to the latest position with any video match', () => {
    const data = index([
      video('latest-found', [{ placement: SECOND, time: 12 }]),
      video('older', [{ placement: FIRST, time: 8 }]),
    ]);

    const batch = readPgnBatch(data, [FIRST, SECOND, THIRD], 0);
    expect(batch.latestMatchedMoveIndex).toBe(1);
    expect(
      batch.results.map(({ videoId, movesBeforeLatestMatch }) => [videoId, movesBeforeLatestMatch]),
    ).toEqual([
      ['latest-found', 0],
      ['older', 1],
    ]);
    expect(readPgnBatch(index([]), [FIRST, SECOND], 0).latestMatchedMoveIndex).toBeNull();
  });

  it('returns twenty unique videos per page with stable date and title ties', () => {
    const videos = Array.from({ length: 22 }, (_, n) =>
      video(String(n).padStart(2, '0'), [{ placement: THIRD, time: n }]),
    );
    const data = index(videos);
    const firstPage = readPgnBatch(data, [THIRD], 0);
    const secondPage = readPgnBatch(data, [THIRD], 20);

    expect(firstPage.total).toBe(22);
    expect(firstPage.results).toHaveLength(20);
    expect(firstPage.results[0].videoId).toBe('00');
    expect(secondPage.results.map(({ videoId }) => videoId)).toEqual(['20', '21']);
  });
});
