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

export interface EventDateInfo {
  day: string;
  month: string;
  fullDate: string;
}

/**
 * Robust parser for event dates entered in posting forms (YYYY-MM-DD or standard ISO/local strings).
 * Converts "2026-09-28" to:
 * - day: "28"
 * - month: "SEP"
 * - fullDate: "Ponedeljek, 28. september 2026" (or "Ponedeljek, 28. september 2026 ob 20:00" if timeStr is supplied)
 */
export function parseEventDateInfo(dateStr?: string | null, timeStr?: string | null): EventDateInfo {
  const cleanTime = timeStr && typeof timeStr === 'string' && timeStr.trim() ? timeStr.trim() : '';

  const formatWithTime = (info: EventDateInfo): EventDateInfo => {
    if (!cleanTime) return info;
    if (info.fullDate.includes(' ob ')) return info;
    if (info.fullDate === 'Datum po dogovoru') return { ...info, fullDate: `Datum po dogovoru ob ${cleanTime}` };
    return {
      ...info,
      fullDate: `${info.fullDate} ob ${cleanTime}`,
    };
  };

  if (!dateStr || typeof dateStr !== 'string') {
    return formatWithTime({ day: '★', month: 'DOG', fullDate: 'Datum po dogovoru' });
  }
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return formatWithTime({ day: '★', month: 'DOG', fullDate: 'Datum po dogovoru' });
  }

  const MONTHS_SL_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AVG', 'SEP', 'OKT', 'NOV', 'DEC'];
  const MONTHS_SL_FULL = [
    'januar', 'februar', 'marec', 'april', 'maj', 'junij',
    'julij', 'avgust', 'september', 'oktober', 'november', 'december'
  ];
  const DAYS_SL = ['Nedelja', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota'];

  // 1. Matches standard date picker format YYYY-MM-DD (e.g. "2026-09-28" or "2026-09-28T19:00:00")
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const monthIdx = parseInt(ymdMatch[2], 10) - 1;
    const dayNum = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : undefined;
    const minute = ymdMatch[5] || undefined;

    const d = new Date(year, monthIdx, dayNum);
    const dayOfWeek = DAYS_SL[d.getDay()] || '';
    const monthShort = MONTHS_SL_SHORT[monthIdx] || 'DOG';
    const monthFull = MONTHS_SL_FULL[monthIdx] || '';
    const extractedTime = (hour !== undefined && minute !== undefined) ? `${String(hour).padStart(2, '0')}:${minute}` : '';
    const finalTime = cleanTime || extractedTime;
    const timeSuffix = finalTime ? ` ob ${finalTime}` : '';

    return {
      day: String(dayNum),
      month: monthShort,
      fullDate: `${dayOfWeek}, ${dayNum}. ${monthFull} ${year}${timeSuffix}`
    };
  }

  // 2. Matches DD.MM.YYYY (e.g. "28. 9. 2026" or "28.09.2026")
  const dmyMatch = trimmed.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})(?:\s*ob\s*(\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const dayNum = parseInt(dmyMatch[1], 10);
    const monthIdx = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : undefined;
    const minute = dmyMatch[5] || undefined;

    const d = new Date(year, monthIdx, dayNum);
    const dayOfWeek = DAYS_SL[d.getDay()] || '';
    const monthShort = MONTHS_SL_SHORT[monthIdx] || 'DOG';
    const monthFull = MONTHS_SL_FULL[monthIdx] || '';
    const extractedTime = (hour !== undefined && minute !== undefined) ? `${String(hour).padStart(2, '0')}:${minute}` : '';
    const finalTime = cleanTime || extractedTime;
    const timeSuffix = finalTime ? ` ob ${finalTime}` : '';

    return {
      day: String(dayNum),
      month: monthShort,
      fullDate: `${dayOfWeek}, ${dayNum}. ${monthFull} ${year}${timeSuffix}`
    };
  }

  // 3. Fallback: try Date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const monthShort = MONTHS_SL_SHORT[parsed.getMonth()] || 'DOG';
    const formatted = parsed.toLocaleDateString('sl-SI', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const baseFullDate = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    return formatWithTime({
      day: String(parsed.getDate()),
      month: monthShort,
      fullDate: baseFullDate
    });
  }

  return formatWithTime({ day: '★', month: 'DOG', fullDate: trimmed });
}

/**
 * Resolves an accurate entry/creation epoch timestamp (in milliseconds) for any post or feed item.
 * Supports Firestore Timestamps, ISO date strings, RSS pubDates, Slovenian date formats, and fallback values.
 */
export function resolveItemEntryTimestamp(itemData: any): number {
  if (!itemData) return 0;

  // 1. Check createdAt (Firestore Timestamp, ISO string, Date object, or numeric milliseconds)
  const createdAt = itemData.createdAt;
  if (createdAt) {
    if (typeof createdAt === 'number' && !isNaN(createdAt)) {
      return createdAt;
    }
    if (typeof createdAt.toMillis === 'function') {
      try {
        const ms = createdAt.toMillis();
        if (typeof ms === 'number' && !isNaN(ms)) return ms;
      } catch {
        // ignore
      }
    }
    if (typeof createdAt.toDate === 'function') {
      try {
        const ms = createdAt.toDate().getTime();
        if (typeof ms === 'number' && !isNaN(ms)) return ms;
      } catch {
        // ignore
      }
    }
    if (typeof createdAt.seconds === 'number' && !isNaN(createdAt.seconds)) {
      return createdAt.seconds * 1000 + (createdAt.nanoseconds ? Math.floor(createdAt.nanoseconds / 1000000) : 0);
    }
    if (createdAt instanceof Date && !isNaN(createdAt.getTime())) {
      return createdAt.getTime();
    }
    if (typeof createdAt === 'string' && createdAt.trim()) {
      const parsed = Date.parse(createdAt.trim());
      if (!isNaN(parsed)) return parsed;
      const rssParsed = parseRssDate(createdAt.trim());
      if (rssParsed && !isNaN(rssParsed.getTime())) return rssParsed.getTime();
    }
  }

  // 2. Check pubDate (standard on RSS news items)
  if (itemData.pubDate && typeof itemData.pubDate === 'string') {
    const rssParsed = parseRssDate(itemData.pubDate);
    if (rssParsed && !isNaN(rssParsed.getTime())) {
      return rssParsed.getTime();
    }
    const directParsed = Date.parse(itemData.pubDate);
    if (!isNaN(directParsed)) return directParsed;
  }

  // 3. Check date field
  if (itemData.date) {
    if (typeof itemData.date === 'number' && !isNaN(itemData.date)) {
      return itemData.date;
    }
    if (typeof itemData.date === 'string' && itemData.date.trim()) {
      const trimmed = itemData.date.trim().toLowerCase();
      if (trimmed === 'pravkar' || trimmed === 'ravno objavljeno' || trimmed.includes('min')) {
        return Date.now();
      }
      if (trimmed === 'danes' || trimmed.startsWith('danes ob')) {
        return Date.now() - 3600000;
      }
      if (trimmed === 'včeraj' || trimmed === 'vceraj' || trimmed.startsWith('včeraj ob')) {
        return Date.now() - 86400000;
      }
      const parsed = Date.parse(itemData.date);
      if (!isNaN(parsed)) return parsed;
      const dmy = itemData.date.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
      if (dmy) {
        const d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
        if (!isNaN(d.getTime())) return d.getTime();
      }
    }
  }

  // 4. Check updatedAt as secondary fallback
  const updatedAt = itemData.updatedAt;
  if (updatedAt) {
    if (typeof updatedAt === 'number' && !isNaN(updatedAt)) return updatedAt;
    if (typeof updatedAt.toMillis === 'function') return updatedAt.toMillis();
    if (typeof updatedAt.toDate === 'function') return updatedAt.toDate().getTime();
    if (typeof updatedAt.seconds === 'number') return updatedAt.seconds * 1000;
    if (typeof updatedAt === 'string') {
      const parsed = Date.parse(updatedAt);
      if (!isNaN(parsed)) return parsed;
    }
  }

  // 5. Check startDate or eventDate as tertiary fallback
  if (itemData.startDate && typeof itemData.startDate === 'string') {
    const parsed = Date.parse(itemData.startDate);
    if (!isNaN(parsed)) return parsed;
  }
  if (itemData.eventDate && typeof itemData.eventDate === 'string') {
    const parsed = Date.parse(itemData.eventDate);
    if (!isNaN(parsed)) return parsed;
  }

  // 6. Check numeric timestamps embedded in ID (e.g. u_1729012345000 or post-1729012345)
  if (typeof itemData.id === 'string') {
    const match13 = itemData.id.match(/\b(1[6-9]\d{11})\b/);
    if (match13) return parseInt(match13[1], 10);
    const match10 = itemData.id.match(/\b(1[6-9]\d{8})\b/);
    if (match10) return parseInt(match10[1], 10) * 1000;
  }

  return 0;
}

export {
  resolveEventDisplayDate,
  type EventDateResolutionInput,
  type ResolvedEventDisplayDate
} from './eventFilterUtils';

