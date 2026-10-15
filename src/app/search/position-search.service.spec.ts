import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { PositionSearchService } from './position-search.service';
import type {
  PositionSearchWorkerRequest,
  PositionSearchWorkerResponse,
} from './position-search.messages';
import type { PositionVideoMatch } from './position-match';

class FakeWorker {
  onmessage: ((event: MessageEvent<PositionSearchWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly messages: PositionSearchWorkerRequest[] = [];
  terminated = false;

  postMessage(message: PositionSearchWorkerRequest): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: PositionSearchWorkerResponse): void {
    this.onmessage?.({ data: message } as MessageEvent<PositionSearchWorkerResponse>);
  }
}

function match(videoId: string): PositionVideoMatch {
  return {
    videoId,
    videoName: `Video ${videoId}`,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    uploadDate: '20250101',
    durationSeconds: 120,
    positions: [
      {
        timeFromSeconds: 12,
        timeToSeconds: 14,
        boardOrientation: 'white_bottom',
      },
    ],
  };
}

describe('PositionSearchService', () => {
  let service: PositionSearchService;
  let worker: FakeWorker;
  let workers: FakeWorker[];
  let injector: ReturnType<typeof Injector.create>;

  beforeEach(() => {
    workers = [];
    vi.stubGlobal(
      'Worker',
      vi.fn(function workerConstructor(): Worker {
        const nextWorker = new FakeWorker();
        workers.push(nextWorker);
        return nextWorker as unknown as Worker;
      }),
    );
    injector = Injector.create({ providers: [{ provide: DOCUMENT, useValue: document }] });
    service = runInInjectionContext(injector, () => new PositionSearchService());
    worker = workers[0];
  });

  afterEach(() => {
    injector.destroy();
    vi.unstubAllGlobals();
  });

  it('queues the latest query until the worker finishes loading', () => {
    const initializeMessage = worker.messages[0];
    expect(initializeMessage).toMatchObject({
      type: 'initialize',
      url: new URL('data/combined-positions.json', document.baseURI).toString(),
    });

    service.search('old-placement');
    service.search('latest-placement');

    expect(service.status()).toBe('loading');
    expect(service.searched()).toBe(true);
    expect(worker.messages.filter((message) => message.type === 'search')).toHaveLength(0);

    worker.emit({ type: 'ready' });

    const requests = worker.messages.filter((message) => message.type === 'search');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      type: 'search',
      piecePlacement: 'latest-placement',
      offset: 0,
    });
    expect(service.status()).toBe('ready');
  });

  it('clears the search state when the board has no placement', () => {
    worker.emit({ type: 'ready' });
    service.search('some-placement');
    service.search(null);

    expect(service.searched()).toBe(false);
    expect(service.searching()).toBe(false);
    expect(service.results()).toEqual([]);
    expect(service.total()).toBe(0);
    expect(service.hasMore()).toBe(false);
  });

  it('ignores stale results and appends later batches', () => {
    worker.emit({ type: 'ready' });
    service.search('old-placement');
    const oldRequest = worker.messages.at(-1);
    service.search('new-placement');
    const newRequest = worker.messages.at(-1);

    if (oldRequest?.type !== 'search' || newRequest?.type !== 'search') {
      throw new Error('Expected worker search messages.');
    }

    worker.emit({
      type: 'results',
      requestId: oldRequest.requestId,
      offset: 0,
      total: 1,
      results: [match('stale')],
    });
    expect(service.results()).toEqual([]);

    const firstPage = Array.from({ length: 50 }, (_, index) => match(String(index)));
    worker.emit({
      type: 'results',
      requestId: newRequest.requestId,
      offset: 0,
      total: 51,
      results: firstPage,
    });
    expect(service.results()).toHaveLength(50);
    expect(service.total()).toBe(51);
    expect(service.hasMore()).toBe(true);

    service.loadMore();
    const loadMoreRequest = worker.messages.at(-1);
    expect(loadMoreRequest).toMatchObject({
      type: 'search',
      piecePlacement: 'new-placement',
      offset: 50,
    });
    if (loadMoreRequest?.type !== 'search') {
      throw new Error('Expected a worker search message for the next batch.');
    }

    worker.emit({
      type: 'results',
      requestId: loadMoreRequest.requestId,
      offset: 50,
      total: 51,
      results: [match('last')],
    });
    expect(service.results()).toHaveLength(51);
    expect(service.results()[50].videoId).toBe('last');
    expect(service.hasMore()).toBe(false);
  });

  it('retries loading after an error and reruns the pending query when ready', () => {
    worker.emit({ type: 'error', message: 'Network failed.' });
    expect(service.status()).toBe('error');
    expect(service.error()).toBe('Network failed.');

    service.search('queued-placement');
    service.retry();

    expect(service.status()).toBe('loading');
    expect(worker.terminated).toBe(true);
    const retryWorker = workers[1];
    retryWorker.emit({ type: 'ready' });
    expect(retryWorker.messages.filter((message) => message.type === 'search')).toMatchObject([
      { type: 'search', piecePlacement: 'queued-placement', offset: 0 },
    ]);
  });

  it('queues the latest PGN query, ignores stale replies, and pages its results', () => {
    service.searchPgn(['first', 'last']);
    worker.emit({ type: 'ready' });
    const firstRequest = worker.messages.at(-1);
    expect(firstRequest).toMatchObject({
      type: 'searchPgn',
      piecePlacements: ['first', 'last'],
      offset: 0,
    });
    if (firstRequest?.type !== 'searchPgn') throw new Error('Expected PGN request.');

    service.searchPgn(['new-final'], 'black_bottom');
    const latestRequest = worker.messages.at(-1);
    expect(latestRequest).toMatchObject({
      type: 'searchPgn',
      piecePlacements: ['new-final'],
      boardOrientation: 'black_bottom',
    });
    if (latestRequest?.type !== 'searchPgn') throw new Error('Expected latest PGN request.');

    worker.emit({
      type: 'results',
      requestId: firstRequest.requestId,
      offset: 0,
      total: 1,
      results: [match('stale')],
    });
    expect(service.results()).toEqual([]);

    const firstPage = Array.from({ length: 20 }, (_, n) => ({
      ...match(String(n)),
      movesBeforeLatestMatch: 0,
    }));
    worker.emit({
      type: 'results',
      requestId: latestRequest.requestId,
      offset: 0,
      total: 21,
      results: firstPage,
      latestMatchedMoveIndex: 0,
    });
    expect(service.results()).toHaveLength(20);
    expect(service.hasMore()).toBe(true);
    expect(service.latestMatchedMoveIndex()).toBe(0);

    service.loadMore();
    const nextRequest = worker.messages.at(-1);
    expect(nextRequest).toMatchObject({ type: 'searchPgn', offset: 20 });
    if (nextRequest?.type !== 'searchPgn') throw new Error('Expected next PGN page.');
    worker.emit({
      type: 'results',
      requestId: nextRequest.requestId,
      offset: 20,
      total: 21,
      results: [{ ...match('last'), movesBeforeLatestMatch: 2 }],
    });
    expect(service.results()[20].movesBeforeLatestMatch).toBe(2);
    expect(service.latestMatchedMoveIndex()).toBe(0);
    expect(service.hasMore()).toBe(false);
  });
});
