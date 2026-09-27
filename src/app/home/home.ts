import { Component, inject } from '@angular/core';
import { SearchBoard } from '../search-board/search-board';
import type { BoardOrientation } from '../search/position-match';
import { PositionSearchService } from '../search/position-search.service';
import { SearchResults } from '../search-results/search-results';

@Component({
  selector: 'app-home',
  imports: [SearchBoard, SearchResults],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly search = inject(PositionSearchService);
  private boardOrientation: BoardOrientation = 'white_bottom';
  private sameBoardRotationOnly = false;
  private currentPosition: string | null = null;

  protected onPositionChange(position: string | null): void {
    this.currentPosition = position;
    this.search.search(position, this.searchOrientation());
  }

  protected onBoardOrientationChange(orientation: BoardOrientation): void {
    this.boardOrientation = orientation;
    if (this.sameBoardRotationOnly) {
      this.search.search(this.currentPosition, orientation);
    }
  }

  protected onSameBoardRotationChange(enabled: boolean): void {
    this.sameBoardRotationOnly = enabled;
    this.search.search(this.currentPosition, this.searchOrientation());
  }

  private searchOrientation(): BoardOrientation | null {
    return this.sameBoardRotationOnly ? this.boardOrientation : null;
  }

  protected loadMore(): void {
    this.search.loadMore();
  }

  protected retry(): void {
    this.search.retry();
  }
}
