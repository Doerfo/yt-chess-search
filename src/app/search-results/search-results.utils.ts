/** Convert seconds to m:ss, or h:mm:ss for times of one hour or more. */
export function formatVideoTime(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(wholeSeconds / 3_600);
  const minutes = Math.floor((wholeSeconds % 3_600) / 60);
  const remainder = wholeSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(remainder).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

/** Round the start down and the end up so the label covers the full interval. */
export function formatVideoTimeRange(startSeconds: number, endSeconds: number): string {
  const start = Math.max(0, Math.floor(Number.isFinite(startSeconds) ? startSeconds : 0));
  const roundedEnd = Math.max(0, Math.ceil(Number.isFinite(endSeconds) ? endSeconds : 0));
  const end = Math.max(start, roundedEnd);

  return `[${formatVideoTime(start)}-${formatVideoTime(end)}]`;
}

/** Add the interval's start time to a YouTube URL; return null for an invalid URL. */
export function buildTimestampedVideoUrl(
  sourceUrl: string,
  timeFromSeconds: number,
): string | null {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    const startSeconds = Math.max(
      0,
      Math.floor(Number.isFinite(timeFromSeconds) ? timeFromSeconds : 0),
    );
    url.searchParams.set('t', String(startSeconds));
    return url.toString();
  } catch {
    return null;
  }
}
