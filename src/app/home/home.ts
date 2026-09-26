import { Component, inject } from '@angular/core';
import { SearchBoard } from '../search-board/search-board';
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

  protected onPositionChange(position: string | null): void {
    this.search.search(position);
  }

  protected loadMore(): void {
    this.search.loadMore();
  }

  protected retry(): void {
    this.search.retry();
  }
}
