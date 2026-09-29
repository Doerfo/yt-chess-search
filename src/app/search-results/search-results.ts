import { Component, effect, input, output, signal } from '@angular/core';
import type { PositionOccurrence, PositionVideoMatch } from '../search/position-match';
import {
  buildTimestampedVideoUrl,
  formatUploadDate,
  formatVideoDuration,
  formatVideoTimeRange,
  uploadDateIso,
} from './search-results.utils';

@Component({
  selector: 'app-search-results',
  standalone: true,
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
})
export class SearchResults {
  private previousVideoCount: number | undefined;

  readonly videos = input<readonly PositionVideoMatch[]>([]);
  readonly heading = input('Position matches');
  readonly total = input(0);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly searched = input(false);
  readonly hasMore = input(false);

  readonly loadMore = output<void>();
  readonly retry = output<void>();
  readonly loadingMore = signal(false);

  constructor() {
    effect(() => {
      const videoCount = this.videos().length;
      const hasMore = this.hasMore();
      const error = this.error();

      if (
        this.previousVideoCount === undefined ||
        videoCount !== this.previousVideoCount ||
        !hasMore ||
        error !== null
      ) {
        this.loadingMore.set(false);
      }

      this.previousVideoCount = videoCount;
    });
  }

  formatRange(position: PositionOccurrence): string {
    return formatVideoTimeRange(position.timeFromSeconds, position.timeToSeconds);
  }

  timestampedUrl(video: PositionVideoMatch, position: PositionOccurrence): string | null {
    return buildTimestampedVideoUrl(video.sourceUrl, position.timeFromSeconds);
  }

  formatDate(uploadDate: string | null): string | null {
    return formatUploadDate(uploadDate);
  }

  dateTime(uploadDate: string | null): string | null {
    return uploadDateIso(uploadDate);
  }

  formatDuration(durationSeconds: number | null): string | null {
    return formatVideoDuration(durationSeconds);
  }

  requestMore(): void {
    if (!this.hasMore() || this.loading() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);
    this.loadMore.emit();
  }
}
