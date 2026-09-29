import type { BoardOrientation, PositionVideoMatch } from './position-match';
import type { SearchMode } from './search-mode';
import type { PawnSearchScope } from './pawn-structure';

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
  mode: SearchMode;
  pawnScope: PawnSearchScope;
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
