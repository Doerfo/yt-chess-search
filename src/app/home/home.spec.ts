import { Component, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { BoardOrientation, PositionVideoMatch } from '../search/position-match';
import { PositionSearchService } from '../search/position-search.service';
import { SearchBoard } from '../search-board/search-board';
import { SearchResults } from '../search-results/search-results';
import { Home } from './home';

@Component({
  selector: 'app-search-board',
  standalone: true,
  template: '',
})
class SearchBoardStub {
  readonly positionChange = output<string | null>();
  readonly orientationChange = output<BoardOrientation>();
}

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  const searchService = {
    status: signal<'loading' | 'ready' | 'error'>('loading'),
    searching: signal(false),
    error: signal<string | null>(null),
    results: signal<PositionVideoMatch[]>([]),
    total: signal(0),
    searched: signal(false),
    hasMore: signal(false),
    search: vi.fn(),
    loadMore: vi.fn(),
    retry: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    searchService.status.set('loading');
    searchService.searching.set(false);
    searchService.error.set(null);
    searchService.results.set([]);
    searchService.total.set(0);
    searchService.searched.set(false);
    searchService.hasMore.set(false);

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [{ provide: PositionSearchService, useValue: searchService }],
    })
      .overrideComponent(Home, {
        remove: { imports: [SearchBoard] },
        add: { imports: [SearchBoardStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
  });

  it('renders the board and matching games sections', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Find chess games by position');
    expect(element.querySelector('app-search-board')).not.toBeNull();
    expect(element.querySelector('app-search-results')).not.toBeNull();
    expect(element.textContent).toContain('Search a position to find matching videos.');
  });

  it('routes board and result actions to the search service', () => {
    fixture.debugElement
      .query(By.directive(SearchBoardStub))
      .componentInstance.positionChange.emit('board-fen');
    fixture.debugElement.query(By.directive(SearchResults)).componentInstance.loadMore.emit();
    fixture.debugElement.query(By.directive(SearchResults)).componentInstance.retry.emit();

    expect(searchService.search).toHaveBeenCalledWith('board-fen', null);
    expect(searchService.loadMore).toHaveBeenCalledOnce();
    expect(searchService.retry).toHaveBeenCalledOnce();
  });

  it('uses the current board rotation when the filter is checked', () => {
    const board = fixture.debugElement.query(By.directive(SearchBoardStub))
      .componentInstance as SearchBoardStub;
    const checkbox = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '.rotation-filter input',
    )!;

    expect(checkbox.checked).toBe(false);
    board.positionChange.emit('board-fen');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(searchService.search).toHaveBeenLastCalledWith('board-fen', 'white_bottom');

    board.orientationChange.emit('black_bottom');
    expect(searchService.search).toHaveBeenLastCalledWith('board-fen', 'black_bottom');

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(searchService.search).toHaveBeenLastCalledWith('board-fen', null);
  });

  it('passes current results and search state to SearchResults', () => {
    const match: PositionVideoMatch = {
      videoId: 'video-1',
      videoName: 'A sample game',
      sourceUrl: 'https://www.youtube.com/watch?v=video-1',
      thumbnailUrl: null,
      uploadDate: '20250101',
      durationSeconds: 2400,
      positions: [
        {
          timeFromSeconds: 120,
          timeToSeconds: 136,
          boardOrientation: null,
        },
      ],
    };
    searchService.status.set('ready');
    searchService.searching.set(true);
    searchService.results.set([match]);
    searchService.total.set(8);
    searchService.searched.set(true);
    searchService.hasMore.set(true);
    fixture.detectChanges();

    const results = fixture.debugElement.query(By.directive(SearchResults)).componentInstance;

    expect(results.videos()).toEqual([match]);
    expect(results.total()).toBe(8);
    expect(results.loading()).toBe(true);
    expect(results.error()).toBeNull();
    expect(results.searched()).toBe(true);
    expect(results.hasMore()).toBe(true);
  });
});
