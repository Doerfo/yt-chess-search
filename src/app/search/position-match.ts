export interface PositionOccurrence {
  timeFromSeconds: number;
  timeToSeconds: number;
  boardOrientation: string | null;
}

export interface PositionVideoMatch {
  videoId: string;
  videoName: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  uploadDate: string | null;
  durationSeconds: number | null;
  positions: PositionOccurrence[];
}

export type PositionSearchStatus = 'loading' | 'ready' | 'error';
