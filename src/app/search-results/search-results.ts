import { Component, effect, input, output, signal } from '@angular/core';
import type { PositionMatch } from '../search/position-match';
import { buildTimestampedVideoUrl, formatVideoTimeRange } from './search-results.utils';

@Component({
  selector: 'app-search-results',
  standalone: true,
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
})
export class SearchResults {
  private previousMatchCount: number | undefined;

  readonly matches = input<readonly PositionMatch[]>([]);
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
      const matchCount = this.matches().length;
      const hasMore = this.hasMore();
      const error = this.error();

      if (
        this.previousMatchCount === undefined ||
        matchCount !== this.previousMatchCount ||
        !hasMore ||
        error !== null
      ) {
        this.loadingMore.set(false);
      }

      this.previousMatchCount = matchCount;
    });
  }

  formatRange(match: PositionMatch): string {
    return formatVideoTimeRange(match.timeFromSeconds, match.timeToSeconds);
  }

  timestampedUrl(match: PositionMatch): string | null {
    return buildTimestampedVideoUrl(match.sourceUrl, match.timeFromSeconds);
  }

  requestMore(): void {
    if (!this.hasMore() || this.loading() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);
    this.loadMore.emit();
  }
}
