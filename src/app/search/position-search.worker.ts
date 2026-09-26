import {
  buildPositionIndex,
  POSITION_SEARCH_BATCH_SIZE,
  readPositionBatch,
  type PositionIndex,
} from './position-search-index';
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
let positionIndex: PositionIndex | null = null;

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
    positionIndex = buildPositionIndex(data);
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

  if (!positionIndex) {
    post({ type: 'error', message: 'Position search data is not ready.' });
    return;
  }

  const batch = readPositionBatch(
    positionIndex,
    data.piecePlacement,
    data.offset,
    POSITION_SEARCH_BATCH_SIZE,
  );
  post({
    type: 'results',
    requestId: data.requestId,
    offset: data.offset,
    total: batch.total,
    results: batch.results,
  });
});
