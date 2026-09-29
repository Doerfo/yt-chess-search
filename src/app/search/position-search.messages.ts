import type { BoardOrientation, PositionVideoMatch } from './position-match';

export interface InitializeSearchWorkerMessage {
  type: 'initialize';
  url: string;
}

export interface SearchWorkerQueryMessage {
  type: 'search';
  requestId: number;
  piecePlacement: string;
  offset: number;
  boardOrientation: BoardOrientation | null;
}

export interface PgnWorkerQueryMessage {
  type: 'searchPgn';
  requestId: number;
  piecePlacements: string[];
  offset: number;
  boardOrientation: BoardOrientation | null;
}

export type PositionSearchWorkerRequest =
  InitializeSearchWorkerMessage | SearchWorkerQueryMessage | PgnWorkerQueryMessage;

export interface PositionSearchWorkerReadyMessage {
  type: 'ready';
}

export interface PositionSearchWorkerResultsMessage {
  type: 'results';
  requestId: number;
  offset: number;
  total: number;
  results: PositionVideoMatch[];
  latestMatchedMoveIndex?: number | null;
}

export interface PositionSearchWorkerErrorMessage {
  type: 'error';
  message: string;
}

export type PositionSearchWorkerResponse =
  | PositionSearchWorkerReadyMessage
  | PositionSearchWorkerResultsMessage
  | PositionSearchWorkerErrorMessage;
