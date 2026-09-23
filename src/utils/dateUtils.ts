/**
 * Date utility functions for converting RSS timestamps to local Slovenian time (Europe/Ljubljana).
 */

/**
 * Returns a human-readable relative timestamp string (e.g., "5 min", "2 ur", "1 dan").
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 1) return 'Pravkar';
  if (diffMins < 60) return `pred ${diffMins} min`;
  if (diffHours < 24) return `pred ${diffHours} ${diffHours === 1 ? 'uro' : diffHours < 5 ? 'urami' : 'ur'}`;
  return `pred ${diffDays} ${diffDays === 1 ? 'dnem' : 'dnevi'}`;
}

/**
 * Parses an RSS date string into a Date object.
 * Handles rss2json UTC strings (e.g. "YYYY-MM-DD HH:mm:ss" or with "UTC"),
 * ISO 8601 strings, and RFC 2822 timestamps.
 */
export function parseRssDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();

  // rss2json returns UTC dates in "YYYY-MM-DD HH:mm:ss" format without timezone indicator
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\s*UTC)?$/i.test(trimmed)) {
    const cleanStr = trimmed.replace(/\s*UTC$/i, '').replace(' ', 'T') + 'Z';
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d;
  }

  // Check ISO 8601 or RFC 2822 (e.g. "Mon, 14 Sep 2026 10:20:00 +0000" or with GMT/Z)
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d;
  }

  return null;
}

/**
 * Formats a date string to local Slovenian time (Europe/Ljubljana).
 * Accurately translates UTC timestamps to Slovenia local time (CET / CEST).
 * E.g. "Danes ob 14:30", "Včeraj ob 18:15", or "14. mar. ob 10:25".
 * If the input cannot be parsed (e.g., already "pred 35 min"), it is returned as is.
 */
export function formatSlovenianDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = parseRssDate(dateStr);
  if (!date) return dateStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

  // If published recently in the last 60 minutes
  if (diffMins >= 0 && diffMins < 60) {
    if (diffMins <= 1) return 'Pravkar';
    return `pred ${diffMins} min`;
  }

  // Get local Slovenian time representations for comparison
  const timeFormatter = new Intl.DateTimeFormat('sl-SI', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Ljubljana',
  });

  const dateFormatter = new Intl.DateTimeFormat('sl-SI', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Europe/Ljubljana',
  });

  const itemDateStr = dateFormatter.format(date);
  const nowDateStr = dateFormatter.format(now);

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayDateStr = dateFormatter.format(yesterday);

  const timeStr = timeFormatter.format(date);

  if (itemDateStr === nowDateStr) {
    return `Danes ob ${timeStr}`;
  }

  if (itemDateStr === yesterdayDateStr) {
    return `Včeraj ob ${timeStr}`;
  }

  const shortDateFormatter = new Intl.DateTimeFormat('sl-SI', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Ljubljana',
  });

  return `${shortDateFormatter.format(date)} ob ${timeStr}`;
}

/**
 * Returns a full localized Slovenian date and time string for tooltips or detailed view.
 * E.g. "ponedeljek, 14. september 2026 14:30:00 CEST"
 */
export function formatFullSlovenianDateTime(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined;
  const date = parseRssDate(dateStr);
  if (!date) return undefined;

  return date.toLocaleString('sl-SI', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'Europe/Ljubljana',
  });
}
