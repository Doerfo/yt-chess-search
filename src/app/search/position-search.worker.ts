import {
  buildSearchIndexes,
  POSITION_SEARCH_BATCH_SIZE,
  readPgnBatch,
  readPositionBatch,
  type SearchIndexes,
} from './position-search-index';
import { pawnStructureFromPlacement } from './pawn-structure';
import type {
  PositionSearchWorkerRequest,
  PositionSearchWorkerResponse,
} from './position-search.messages';

interface PositionSearchWorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<PositionSearchWorkerRequest>) => void,
  ): void;
  postMessage(response: PositionSearchWorkerResponse): void;
}

const workerContext = self as unknown as PositionSearchWorkerScope;
let indexes: SearchIndexes | null = null;

function post(response: PositionSearchWorkerResponse): void {
  workerContext.postMessage(response);
}

async function initialize(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Position data request failed (${response.status}).`);
    }

    const data: unknown = await response.json();
    indexes = buildSearchIndexes(data);
    post({ type: 'ready' });
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unable to load position data.',
    });
  }
}

workerContext.addEventListener('message', ({ data }: MessageEvent<PositionSearchWorkerRequest>) => {
  if (data.type === 'initialize') {
    void initialize(data.url);
    return;
  }

  if (!indexes) {
    post({ type: 'error', message: 'Position search data is not ready.' });
    return;
  }

  if (data.type === 'searchPgn') {
    const batch = readPgnBatch(
      indexes.position,
      data.piecePlacements,
      data.offset,
      undefined,
      data.boardOrientation,
    );
    post({
      type: 'results',
      requestId: data.requestId,
      offset: data.offset,
      total: batch.total,
      results: batch.results,
      latestMatchedMoveIndex: batch.latestMatchedMoveIndex,
    });
    return;
  }

  const index =
    data.mode === 'position'
      ? indexes.position
      : data.pawnScope === 'white'
        ? indexes.whitePawns
        : data.pawnScope === 'black'
          ? indexes.blackPawns
          : indexes.pawnStructure;
  const query =
    data.mode === 'position'
      ? data.piecePlacement
      : pawnStructureFromPlacement(data.piecePlacement, data.pawnScope);
  const batch = readPositionBatch(
    index,
    query,
    data.offset,
    POSITION_SEARCH_BATCH_SIZE,
    data.boardOrientation,
  );
  post({
    type: 'results',
    requestId: data.requestId,
    offset: data.offset,
    total: batch.total,
    results: batch.results,
  });
});
