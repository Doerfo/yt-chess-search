import {
  buildPositionIndex,
  buildSearchIndexes,
  POSITION_DATA_SCHEMA_VERSION,
  readPositionBatch,
} from './position-search-index';
import { STARTING_PAWN_PLACEMENT } from './pawn-structure';
import { pawnStructureFromPlacement } from './pawn-structure';

const START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

function video(
  videoId: string,
  videoName: string,
  positions: unknown[],
  uploadDate?: string | null,
  durationSeconds?: number | null,
) {
  return {
    videoId,
    videoName,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    ...(uploadDate !== undefined ? { uploadDate } : {}),
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
    positions,
  };
}

function position(
  piecePlacement: string,
  timeFromSeconds: number,
  boardOrientation: string | null,
) {
  return {
    piecePlacement,
    timeFromSeconds,
    timeToSeconds: timeFromSeconds + 1,
    boardOrientation,
  };
}

function dataset(videos: unknown[]) {
  return {
    schemaVersion: POSITION_DATA_SCHEMA_VERSION,
    channelId: 'channel-id',
    videos,
  };
}

describe('position search index', () => {
  it('matches only the selected pawn color while ignoring the other color', () => {
    const blackMoved = 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR';
    const whiteMoved = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR';
    const indexes = buildSearchIndexes(
      dataset([
        video('one', 'One', [
          position(START_POSITION, 0, 'white_bottom'),
          position(blackMoved, 20, 'white_bottom'),
          position(whiteMoved, 30, 'white_bottom'),
        ]),
      ]),
    );
    const whiteKey = pawnStructureFromPlacement(START_POSITION, 'white');
    const blackKey = pawnStructureFromPlacement(START_POSITION, 'black');

    expect(readPositionBatch(indexes.whitePawns, whiteKey, 0).results[0].positions).toEqual([
      { timeFromSeconds: 0, timeToSeconds: 21, boardOrientation: 'white_bottom' },
    ]);
    expect(readPositionBatch(indexes.blackPawns, blackKey, 0).results[0].positions).toEqual([
      { timeFromSeconds: 0, timeToSeconds: 31, boardOrientation: 'white_bottom' },
    ]);
    expect(
      readPositionBatch(indexes.pawnStructure, STARTING_PAWN_PLACEMENT, 0).results[0].positions,
    ).toHaveLength(1);
  });
  it('matches exact pawn squares despite other pieces and merges touching times', () => {
    const indexes = buildSearchIndexes(
      dataset([
        video('one', 'One', [
          { ...position(START_POSITION, 10, 'white_bottom'), timeToSeconds: 12 },
          {
            ...position('rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R', 12, 'white_bottom'),
            timeToSeconds: 15,
          },
          position(START_POSITION, 11, 'black_bottom'),
          position('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', 20, 'white_bottom'),
        ]),
      ]),
    );

    const all = readPositionBatch(indexes.pawnStructure, STARTING_PAWN_PLACEMENT, 0);
    expect(all.total).toBe(1);
    expect(all.results[0].positions).toEqual([
      { timeFromSeconds: 10, timeToSeconds: 15, boardOrientation: 'white_bottom' },
      { timeFromSeconds: 11, timeToSeconds: 12, boardOrientation: 'black_bottom' },
    ]);
    expect(
      readPositionBatch(indexes.pawnStructure, STARTING_PAWN_PLACEMENT, 0, 50, 'white_bottom')
        .results[0].positions,
    ).toHaveLength(1);
    expect(
      readPositionBatch(indexes.position, START_POSITION, 0).results[0].positions,
    ).toHaveLength(2);
  });

  it('combines pawn timestamps through consecutive gaps of up to 60 seconds', () => {
    const indexes = buildSearchIndexes(
      dataset([
        video('one', 'One', [
          { ...position(START_POSITION, 0, 'white_bottom'), timeToSeconds: 2 },
          { ...position(START_POSITION, 62, 'white_bottom'), timeToSeconds: 63 },
          { ...position(START_POSITION, 123, 'white_bottom'), timeToSeconds: 124 },
          { ...position(START_POSITION, 185, 'white_bottom'), timeToSeconds: 186 },
          position(START_POSITION, 70, 'black_bottom'),
        ]),
      ]),
    );

    expect(
      readPositionBatch(indexes.pawnStructure, STARTING_PAWN_PLACEMENT, 0).results[0].positions,
    ).toEqual([
      { timeFromSeconds: 0, timeToSeconds: 124, boardOrientation: 'white_bottom' },
      { timeFromSeconds: 70, timeToSeconds: 71, boardOrientation: 'black_bottom' },
      { timeFromSeconds: 185, timeToSeconds: 186, boardOrientation: 'white_bottom' },
    ]);
    expect(
      readPositionBatch(indexes.position, START_POSITION, 0).results[0].positions,
    ).toHaveLength(5);
  });
  it('groups matching intervals by video and sorts videos newest first', () => {
    const index = buildPositionIndex(
      dataset([
        video('old', 'Older video', [position(START_POSITION, 3, null)], '20230101'),
        video(
          'zed',
          'Tie',
          [
            position(START_POSITION, 9, 'black_bottom'),
            position(START_POSITION, 2, 'white_bottom'),
          ],
          '20250101',
        ),
        video('ada', 'Tie', [position(START_POSITION, 5, null)], '20250101'),
        video('newest', 'Newest video', [position(START_POSITION, 4, null)], '20260101'),
        video('nullable', 'Nullable date', [position(START_POSITION, 1, null)], null, null),
        video('undated', 'Undated video', [position(START_POSITION, 1, null)]),
      ]),
    );

    const batch = readPositionBatch(index, START_POSITION, 0);

    expect(batch.total).toBe(6);
    expect(batch.results.map(({ videoId }) => videoId)).toEqual([
      'newest',
      'ada',
      'zed',
      'old',
      'nullable',
      'undated',
    ]);
    expect(batch.results[2].positions.map(({ timeFromSeconds }) => timeFromSeconds)).toEqual([
      2, 9,
    ]);
    expect(batch.results[2].positions[1].boardOrientation).toBe('black_bottom');
  });

  it('breaks equal-date ties by title and then video ID', () => {
    const index = buildPositionIndex(
      dataset([
        video('z-title', 'Zebra', [position(START_POSITION, 1, null)], '20250210'),
        video('z-same', 'Alpha', [position(START_POSITION, 1, null)], '20250210'),
        video('a-same', 'Alpha', [position(START_POSITION, 1, null)], '20250210'),
      ]),
    );

    expect(
      readPositionBatch(index, START_POSITION, 0).results.map(({ videoId }) => videoId),
    ).toEqual(['a-same', 'z-same', 'z-title']);
  });

  it('accepts nullable or omitted video metadata and rejects malformed dates', () => {
    expect(() =>
      buildPositionIndex(
        dataset([video('missing-date', 'Missing date', [position(START_POSITION, 1, null)])]),
      ),
    ).not.toThrow();
    expect(() =>
      buildPositionIndex(
        dataset([
          video('invalid-date', 'Invalid date', [position(START_POSITION, 1, null)], '20250230'),
        ]),
      ),
    ).toThrow('video.uploadDate');
    expect(() =>
      buildPositionIndex(
        dataset([
          video(
            'invalid-duration',
            'Invalid duration',
            [position(START_POSITION, 1, null)],
            null,
            -1,
          ),
        ]),
      ),
    ).toThrow('video.durationSeconds');
  });

  it('rejects an unsupported schema version', () => {
    expect(() =>
      buildPositionIndex({
        schemaVersion: 'unknown/v2',
        channelId: 'channel-id',
        videos: [],
      }),
    ).toThrow('unsupported schema version');
  });

  it('paginates by unique videos without splitting their intervals', () => {
    const videos = Array.from({ length: 51 }, (_, index) =>
      video(
        `video-${index}`,
        `Video ${index}`,
        [
          position(START_POSITION, index, 'white_bottom'),
          position(START_POSITION, index + 100, 'black_bottom'),
        ],
        '20250101',
      ),
    );
    const index = buildPositionIndex(dataset(videos));

    const firstPage = readPositionBatch(index, START_POSITION, 0);
    const secondPage = readPositionBatch(index, START_POSITION, firstPage.results.length);

    expect(firstPage.results).toHaveLength(50);
    expect(firstPage.total).toBe(51);
    expect(firstPage.results.every(({ positions }) => positions.length === 2)).toBe(true);
    expect(secondPage.results).toHaveLength(1);
    expect(secondPage.results[0].positions).toHaveLength(2);
  });
});
