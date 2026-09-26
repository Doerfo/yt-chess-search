import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PositionVideoMatch } from '../search/position-match';
import { SearchResults } from './search-results';

function video(
  videoId: string,
  positions: PositionVideoMatch['positions'],
  uploadDate: string | null = null,
  durationSeconds: number | null = null,
): PositionVideoMatch {
  return {
    videoId,
    videoName: `Video ${videoId}`,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: null,
    uploadDate,
    durationSeconds,
    positions,
  };
}

function position(timeFromSeconds: number, timeToSeconds: number) {
  return { timeFromSeconds, timeToSeconds, boardOrientation: null };
}

describe('SearchResults', () => {
  let fixture: ComponentFixture<SearchResults>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SearchResults] }).compileComponents();
    fixture = TestBed.createComponent(SearchResults);
  });

  it('shows all clickable times below each video title and includes video metadata', async () => {
    const videos = [
      video('one', [position(10, 12), position(40, 45)], '20210424', 2_376),
      video('two', [position(8, 11), position(18, 22)]),
    ];
    fixture.componentRef.setInput('videos', videos);
    fixture.componentRef.setInput('total', 2);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const firstResult = element.querySelector('.results__item') as HTMLElement;
    const firstLinks = firstResult.querySelectorAll<HTMLAnchorElement>('.results__time-link');

    expect(element.querySelector('.results__count')?.textContent).toContain('2 videos');
    expect(element.querySelectorAll('.results__item')).toHaveLength(2);
    expect(firstResult.querySelectorAll('h3')).toHaveLength(1);
    expect(firstLinks).toHaveLength(2);
    expect(firstLinks[0].textContent?.trim()).toBe('[0:10-0:12]');
    expect(firstLinks[0].href).toBe('https://www.youtube.com/watch?v=one&t=10');
    expect(firstLinks[1].textContent?.trim()).toBe('[0:40-0:45]');
    expect(firstLinks[1].href).toBe('https://www.youtube.com/watch?v=one&t=40');
    expect(firstResult.textContent).toContain('Apr 24, 2021');
    expect(firstResult.textContent).toContain('39:36');
    expect(firstResult.querySelector('button')).toBeNull();
  });

  it('shows a single time and omits absent metadata', async () => {
    fixture.componentRef.setInput('videos', [video('single', [position(5, 7)])]);
    fixture.componentRef.setInput('total', 1);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const result = element.querySelector('.results__item') as HTMLElement;

    expect(element.querySelector('.results__count')?.textContent).toContain('1 video');
    expect(result.querySelector('.results__metadata')).toBeNull();
    expect(result.querySelector('button')).toBeNull();
    expect(result.querySelectorAll('.results__time-link')).toHaveLength(1);
  });
});
