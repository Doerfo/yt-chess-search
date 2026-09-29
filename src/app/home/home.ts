import { Component, inject, signal } from '@angular/core';
import { SearchBoard } from '../search-board/search-board';
import type { BoardOrientation } from '../search/position-match';
import { PositionSearchService } from '../search';
import { SearchResults } from '../search-results/search-results';

@Component({
  selector: 'app-home',
  imports: [SearchBoard, SearchResults],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly search = inject(PositionSearchService);
  protected readonly searchKind = signal<'position' | 'pgn'>('position');
  private boardOrientation: BoardOrientation = 'white_bottom';
  private sameBoardRotationOnly = false;
  private currentPosition: string | null = null;
  private pgnPlacements: string[] | null = null;

  protected onPositionChange(position: string | null): void {
    this.currentPosition = position;
    this.pgnPlacements = null;
    this.searchKind.set('position');
    this.search.search(position, this.searchOrientation());
  }

  protected onPgnChange(piecePlacements: string[]): void {
    this.pgnPlacements = piecePlacements;
    this.searchKind.set('pgn');
    this.search.searchPgn(piecePlacements, this.searchOrientation());
  }

  protected onBoardOrientationChange(orientation: BoardOrientation): void {
    this.boardOrientation = orientation;
    if (this.sameBoardRotationOnly) {
      this.searchCurrent();
    }
  }

  protected onSameBoardRotationChange(enabled: boolean): void {
    this.sameBoardRotationOnly = enabled;
    this.searchCurrent();
  }

  private searchOrientation(): BoardOrientation | null {
    return this.sameBoardRotationOnly ? this.boardOrientation : null;
  }

  private searchCurrent(): void {
    if (this.pgnPlacements) {
      this.search.searchPgn(this.pgnPlacements, this.searchOrientation());
      return;
    }
    this.search.search(this.currentPosition, this.searchOrientation());
  }

  protected loadMore(): void {
    this.search.loadMore();
  }

  protected retry(): void {
    this.search.retry();
  }
}
