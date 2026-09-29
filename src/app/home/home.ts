import { Component, computed, inject, signal } from '@angular/core';
import { SearchBoard } from '../search-board/search-board';
import { PawnBoard } from '../pawn-board/pawn-board';
import type { BoardOrientation } from '../search/position-match';
import { PositionSearchService } from '../search/position-search.service';
import type { SearchMode } from '../search/search-mode';
import { STARTING_PAWN_PLACEMENT, type PawnSearchScope } from '../search/pawn-structure';
import { SearchResults } from '../search-results/search-results';

@Component({
  selector: 'app-home',
  imports: [SearchBoard, PawnBoard, SearchResults],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly search = inject(PositionSearchService);
  protected readonly activeMode = signal<SearchMode>('position');
  protected readonly pawnScope = signal<PawnSearchScope>('both');
  protected readonly resultsHeading = computed(() => {
    if (this.activeMode() === 'position') return 'Position matches';
    const scope = this.pawnScope();
    return scope === 'both'
      ? 'Pawn structure matches'
      : `${scope === 'white' ? 'White' : 'Black'} pawn structure matches`;
  });
  private readonly positions: Record<SearchMode, string | null> = {
    position: null,
    pawnStructure: null,
  };
  private readonly orientations: Record<SearchMode, BoardOrientation> = {
    position: 'white_bottom',
    pawnStructure: 'white_bottom',
  };
  private sameBoardRotationOnly = false;

  protected selectTab(mode: SearchMode): void {
    if (this.activeMode() === mode) return;
    this.activeMode.set(mode);
    this.searchCurrent();
  }

  protected onTabKeydown(event: KeyboardEvent): void {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    )
      return;
    event.preventDefault();
    const mode: SearchMode =
      event.key === 'ArrowLeft' || event.key === 'Home' ? 'position' : 'pawnStructure';
    this.selectTab(mode);
    const tabId = mode === 'position' ? 'position-tab' : 'pawn-tab';
    (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`#${tabId}`)?.focus();
  }

  protected onPositionChange(mode: SearchMode, position: string | null): void {
    this.positions[mode] = position;
    if (this.activeMode() === mode) this.searchCurrent();
  }

  protected onBoardOrientationChange(mode: SearchMode, orientation: BoardOrientation): void {
    this.orientations[mode] = orientation;
    if (this.activeMode() === mode && this.sameBoardRotationOnly) this.searchCurrent();
  }

  protected onPawnScopeChange(scope: PawnSearchScope): void {
    this.pawnScope.set(scope);
    if (this.positions.pawnStructure === null) {
      this.positions.pawnStructure = STARTING_PAWN_PLACEMENT;
    }
    if (this.activeMode() === 'pawnStructure') this.searchCurrent();
  }

  protected onSameBoardRotationChange(enabled: boolean): void {
    this.sameBoardRotationOnly = enabled;
    this.searchCurrent();
  }

  private searchOrientation(): BoardOrientation | null {
    return this.sameBoardRotationOnly ? this.orientations[this.activeMode()] : null;
  }

  private searchCurrent(): void {
    const mode = this.activeMode();
    this.search.search(this.positions[mode], this.searchOrientation(), mode, this.pawnScope());
  }

  protected loadMore(): void {
    this.search.loadMore();
  }

  protected retry(): void {
    this.search.retry();
  }
}
