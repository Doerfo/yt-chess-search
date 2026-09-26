import { describe, expect, it } from 'vitest';
import { buildTimestampedVideoUrl, formatVideoTimeRange } from './search-results.utils';

describe('search result formatters', () => {
  it('rounds the beginning down and the end up to cover the full matched interval', () => {
    expect(formatVideoTimeRange(5.9, 12.1)).toBe('[0:05-0:13]');
  });

  it('uses hours when a time reaches a full hour', () => {
    expect(formatVideoTimeRange(3_723, 3_724)).toBe('[1:02:03-1:02:04]');
  });

  it('adds a floored start time while preserving the source query and fragment', () => {
    const result = buildTimestampedVideoUrl(
      'https://www.youtube.com/watch?v=abc123&list=PL42#chapter',
      12.9,
    );

    expect(result).toBe('https://www.youtube.com/watch?v=abc123&list=PL42&t=12#chapter');
  });

  it('replaces an existing timestamp and rejects non-web URL schemes', () => {
    expect(buildTimestampedVideoUrl('https://youtu.be/abc123?t=3', 8)).toBe(
      'https://youtu.be/abc123?t=8',
    );
    expect(buildTimestampedVideoUrl('javascript:alert(1)', 8)).toBeNull();
  });
});
