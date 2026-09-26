import type { PositionVideoMatch } from './position-match';

export interface InitializeSearchWorkerMessage {
  type: 'initialize';
  url: string;
}

export interface SearchWorkerQueryMessage {
  type: 'search';
  requestId: number;
  piecePlacement: string;
  offset: number;
}

export type PositionSearchWorkerRequest = InitializeSearchWorkerMessage | SearchWorkerQueryMessage;

export interface PositionSearchWorkerReadyMessage {
  type: 'ready';
}

export interface PositionSearchWorkerResultsMessage {
  type: 'results';
  requestId: number;
  offset: number;
  total: number;
  results: PositionVideoMatch[];
}

export interface PositionSearchWorkerErrorMessage {
  type: 'error';
  message: string;
}

export type PositionSearchWorkerResponse =
  | PositionSearchWorkerReadyMessage
  | PositionSearchWorkerResultsMessage
  | PositionSearchWorkerErrorMessage;
