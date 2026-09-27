export interface PositionOccurrence {
  timeFromSeconds: number;
  timeToSeconds: number;
  boardOrientation: string | null;
}

export type BoardOrientation = 'white_bottom' | 'black_bottom';

export interface PositionVideoMatch {
  videoId: string;
  videoName: string;
  sourceUrl: string;
  uploadDate: string | null;
  durationSeconds: number | null;
  positions: PositionOccurrence[];
}

export type PositionSearchStatus = 'loading' | 'ready' | 'error';
