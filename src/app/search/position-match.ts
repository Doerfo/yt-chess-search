export interface PositionMatch {
  videoId: string;
  videoName: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  timeFromSeconds: number;
  timeToSeconds: number;
  boardOrientation: string | null;
}

export type PositionSearchStatus = 'loading' | 'ready' | 'error';
