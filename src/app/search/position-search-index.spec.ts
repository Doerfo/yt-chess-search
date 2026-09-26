import {
  buildPositionIndex,
  POSITION_DATA_SCHEMA_VERSION,
  readPositionBatch,
} from './position-search-index';

const START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

function video(videoId: string, videoName: string, positions: unknown[]) {
  return {
    videoId,
    videoName,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: null,
    positions,
  };
}

function position(piecePlacement: string, timeFromSeconds: number, boardOrientation: string | null) {
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
  it('matches placement independent of orientation and sorts by video name then time', () => {
    const index = buildPositionIndex(
      dataset([
        video('zed', 'Zed Video', [position(START_POSITION, 1, 'black_bottom')]),
        video('ada', 'Ada Video', [
          position(START_POSITION, 9, 'white_bottom'),
          position(START_POSITION, 3, null),
        ]),
      ]),
    );

    const batch = readPositionBatch(index, START_POSITION, 0);

    expect(batch.total).toBe(3);
    expect(batch.results.map(({ videoId, timeFromSeconds }) => [videoId, timeFromSeconds])).toEqual([
      ['ada', 3],
      ['ada', 9],
      ['zed', 1],
    ]);
    expect(batch.results[0].boardOrientation).toBeNull();
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

  it('returns later results in fixed-size batches', () => {
    const positions = Array.from({ length: 51 }, (_, index) =>
      position(START_POSITION, index, 'white_bottom'),
    );
    const index = buildPositionIndex(dataset([video('video', 'Video', positions)]));

    const firstPage = readPositionBatch(index, START_POSITION, 0);
    const secondPage = readPositionBatch(index, START_POSITION, firstPage.results.length);

    expect(firstPage.results).toHaveLength(50);
    expect(firstPage.total).toBe(51);
    expect(secondPage.results).toHaveLength(1);
    expect(secondPage.results[0].timeFromSeconds).toBe(50);
  });
});
