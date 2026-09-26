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

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface ParsedUploadDate {
  year: number;
  month: number;
  day: number;
}

function parseUploadDate(uploadDate: string | null): ParsedUploadDate | null {
  if (uploadDate === null || !/^\d{8}$/.test(uploadDate)) {
    return null;
  }

  const year = Number(uploadDate.slice(0, 4));
  const month = Number(uploadDate.slice(4, 6));
  const day = Number(uploadDate.slice(6, 8));
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    return null;
  }

  return { year, month, day };
}

/** Format a YYYYMMDD upload date without depending on the visitor's locale or timezone. */
export function formatUploadDate(uploadDate: string | null): string | null {
  const parsed = parseUploadDate(uploadDate);
  if (!parsed) {
    return null;
  }

  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.day}, ${parsed.year}`;
}

/** Return the machine-readable ISO date equivalent of a YYYYMMDD upload date. */
export function uploadDateIso(uploadDate: string | null): string | null {
  const parsed = parseUploadDate(uploadDate);
  if (!parsed) {
    return null;
  }

  return `${String(parsed.year).padStart(4, '0')}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
}

/** Format a video duration as m:ss or h:mm:ss. */
export function formatVideoDuration(durationSeconds: number | null): string | null {
  if (durationSeconds === null || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return null;
  }

  return formatVideoTime(durationSeconds);
}

/** Round the start down and the end up so the label covers the full interval. */
export function formatVideoTimeRange(startSeconds: number, endSeconds: number): string {
  const start = Math.max(0, Math.floor(Number.isFinite(startSeconds) ? startSeconds : 0));
  const roundedEnd = Math.max(0, Math.ceil(Number.isFinite(endSeconds) ? endSeconds : 0));
  const end = Math.max(start, roundedEnd);

  return `[${formatVideoTime(start)} - ${formatVideoTime(end)}]`;
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
