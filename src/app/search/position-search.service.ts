import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal, type Signal } from '@angular/core';
import type {
  BoardOrientation,
  PositionSearchStatus,
  PositionVideoMatch,
} from './position-match';
import type {
  PositionSearchWorkerResponse,
  PositionSearchWorkerResultsMessage,
} from './position-search.messages';

interface ActiveRequest {
  requestId: number;
  piecePlacement: string;
  offset: number;
  append: boolean;
}

@Injectable({ providedIn: 'root' })
export class PositionSearchService {
  private readonly document = inject(DOCUMENT);
  private readonly _status = signal<PositionSearchStatus>('loading');
  private readonly _error = signal<string | null>(null);
  private readonly _results = signal<PositionVideoMatch[]>([]);
  private readonly _total = signal(0);
  private readonly _searched = signal(false);
  private readonly _searching = signal(false);
  private readonly _hasMore = signal(false);

  readonly status: Signal<PositionSearchStatus> = this._status.asReadonly();
  readonly error: Signal<string | null> = this._error.asReadonly();
  readonly results: Signal<PositionVideoMatch[]> = this._results.asReadonly();
  readonly total: Signal<number> = this._total.asReadonly();
  readonly searched: Signal<boolean> = this._searched.asReadonly();
  readonly searching: Signal<boolean> = this._searching.asReadonly();
  readonly hasMore: Signal<boolean> = this._hasMore.asReadonly();

  private worker: Worker | null = null;
  private workerReady = false;
  private currentQuery: string | null = null;
  private currentBoardOrientation: BoardOrientation | null = null;
  private nextRequestId = 0;
  private activeRequest: ActiveRequest | null = null;

  constructor() {
    this.startWorker();
  }

  search(piecePlacement: string | null, boardOrientation: BoardOrientation | null = null): void {
    this.currentQuery = piecePlacement?.trim() || null;
    this.currentBoardOrientation = boardOrientation;
    this._searched.set(this.currentQuery !== null);
    this._searching.set(this.currentQuery !== null && this._status() !== 'error');
    this._results.set([]);
    this._total.set(0);
    this._hasMore.set(false);
    this.activeRequest = null;
    this.nextRequestId += 1;

    if (!this.currentQuery || !this.workerReady || this._status() !== 'ready') {
      return;
    }

    this.sendSearch(0, false);
  }

  loadMore(): void {
    const query = this.currentQuery;
    if (
      !query ||
      !this.workerReady ||
      this._status() !== 'ready' ||
      !this._hasMore() ||
      this.activeRequest
    ) {
      return;
    }

    this.sendSearch(this._results().length, true);
  }

  retry(): void {
    this.worker?.terminate();
    this.worker = null;
    this.workerReady = false;
    this.activeRequest = null;
    this.nextRequestId += 1;
    this._error.set(null);
    this._results.set([]);
    this._total.set(0);
    this._hasMore.set(false);
    this._searching.set(this.currentQuery !== null);
    this._status.set('loading');
    this.startWorker();
  }

  private startWorker(): void {
    if (typeof Worker === 'undefined') {
      this.fail('Web Workers are not supported in this browser.');
      return;
    }

    try {
      const worker = new Worker(new URL('./position-search.worker', import.meta.url), {
        type: 'module',
      });
      this.worker = worker;
      worker.onmessage = ({ data }: MessageEvent<PositionSearchWorkerResponse>) => {
        if (this.worker !== worker) {
          return;
        }
        this.handleWorkerMessage(data);
      };
      worker.onerror = (event: ErrorEvent) => {
        if (this.worker !== worker) {
          return;
        }
        event.preventDefault();
        this.fail(event.message || 'Unable to start position search.');
      };

      const url = new URL('data/combined-positions.json', this.document.baseURI).toString();
      worker.postMessage({ type: 'initialize', url });
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Unable to start position search.');
    }
  }

  private handleWorkerMessage(message: PositionSearchWorkerResponse): void {
    if (message.type === 'ready') {
      this.workerReady = true;
      this._error.set(null);
      this._status.set('ready');
      if (this.currentQuery) {
        this._searching.set(true);
        this.sendSearch(0, false);
      } else {
        this._searching.set(false);
      }
      return;
    }

    if (message.type === 'error') {
      this.fail(message.message);
      return;
    }

    this.applyResults(message);
  }

  private applyResults(message: PositionSearchWorkerResultsMessage): void {
    const request = this.activeRequest;
    if (
      !request ||
      request.requestId !== message.requestId ||
      request.piecePlacement !== this.currentQuery ||
      request.offset !== message.offset
    ) {
      return;
    }

    const currentResults = this._results();
    if (request.append && request.offset !== currentResults.length) {
      return;
    }

    const results = request.append ? [...currentResults, ...message.results] : message.results;
    this._results.set(results);
    this._total.set(message.total);
    this._hasMore.set(results.length < message.total);
    this._searching.set(false);
    this.activeRequest = null;
  }

  private sendSearch(offset: number, append: boolean): void {
    const query = this.currentQuery;
    if (!query || !this.worker || !this.workerReady) {
      return;
    }

    const requestId = ++this.nextRequestId;
    this._searching.set(true);
    this.activeRequest = { requestId, piecePlacement: query, offset, append };
    this.worker.postMessage({
      type: 'search',
      requestId,
      piecePlacement: query,
      offset,
      boardOrientation: this.currentBoardOrientation,
    });
  }

  private fail(message: string): void {
    this.worker?.terminate();
    this.worker = null;
    this.workerReady = false;
    this.activeRequest = null;
    this._searching.set(false);
    this._error.set(message);
    this._status.set('error');
    this._hasMore.set(false);
  }
}
