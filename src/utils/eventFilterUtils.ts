import { SLOVENIA_REGIONS } from '../services/categoryService';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayYmd(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns upcoming Saturday and Sunday dates formatted as YYYY-MM-DD.
 * If today is Saturday or Sunday, returns the current weekend.
 */
export function getUpcomingWeekendDates(): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  let saturday = new Date(now);
  let sunday = new Date(now);

  if (dayOfWeek === 6) {
    // Today is Saturday
    sunday.setDate(now.getDate() + 1);
  } else if (dayOfWeek === 0) {
    // Today is Sunday
    saturday.setDate(now.getDate() - 1);
  } else {
    // Monday through Friday: next Saturday and Sunday
    const daysUntilSaturday = 6 - dayOfWeek;
    saturday.setDate(now.getDate() + daysUntilSaturday);
    sunday.setDate(now.getDate() + daysUntilSaturday + 1);
  }

  return [formatYmd(saturday), formatYmd(sunday)];
}

const MONTHS_SL_SHORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
const MONTHS_SL_FULL = [
  'januar', 'februar', 'marec', 'april', 'maj', 'junij',
  'julij', 'avgust', 'september', 'oktober', 'november', 'december'
];

/**
 * Formats a single YYYY-MM-DD date into Slovenian format (e.g. "25. sep").
 */
export function formatSingleDateSlovenian(dateStr: string, includeYear = false): string {
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return dateStr;

  const y = match[1];
  const m = parseInt(match[2], 10) - 1;
  const d = parseInt(match[3], 10);

  const monthName = MONTHS_SL_SHORT[m] || '';
  if (includeYear) {
    return `${d}. ${monthName} ${y}`;
  }
  return `${d}. ${monthName}`;
}

/**
 * Returns a human-friendly summary string of selected dates.
 * E.g. "25. sep, 26. sep" or "Danes (25. sep)" or "3 izbrani dnevi".
 */
export function formatSelectedDatesSummary(dates: string[]): string {
  if (!dates || dates.length === 0) return '';
  const sorted = [...dates].sort();
  const todayYmd = getTodayYmd();

  if (sorted.length === 1) {
    if (sorted[0] === todayYmd) {
      return `Danes (${formatSingleDateSlovenian(sorted[0])})`;
    }
    return formatSingleDateSlovenian(sorted[0], true);
  }

  if (sorted.length <= 3) {
    return sorted.map(d => formatSingleDateSlovenian(d)).join(', ');
  }

  return `${sorted.length} izbranih dni (${formatSingleDateSlovenian(sorted[0])} – ${formatSingleDateSlovenian(sorted[sorted.length - 1])})`;
}

/**
 * Normalizes any string representation of a date to YYYY-MM-DD if possible.
 */
export function normalizeDateToYmd(str?: string | null): string | null {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // 1. Matches YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Matches DD.MM.YYYY (e.g. 28. 9. 2026 or 28.09.2026)
  const dmy = trimmed.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Fallback: Date.parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Extracts all unique YYYY-MM-DD dates associated with an event.
 * Checks eventDate, date, eventDates, and eventSchedule.
 */
export function extractEventDateStrings(event: {
  eventDate?: string | null;
  date?: string | null;
  eventDates?: string[] | null;
  eventSchedule?: { date?: string }[] | null;
}): string[] {
  const dates = new Set<string>();

  if (event.eventDate) {
    const ymd = normalizeDateToYmd(event.eventDate);
    if (ymd) dates.add(ymd);
  }

  if (event.date) {
    const ymd = normalizeDateToYmd(event.date);
    if (ymd) dates.add(ymd);
  }

  if (Array.isArray(event.eventDates)) {
    for (const d of event.eventDates) {
      const ymd = normalizeDateToYmd(d);
      if (ymd) dates.add(ymd);
    }
  }

  if (Array.isArray(event.eventSchedule)) {
    for (const s of event.eventSchedule) {
      if (s?.date) {
        const ymd = normalizeDateToYmd(s.date);
        if (ymd) dates.add(ymd);
      }
    }
  }

  return Array.from(dates);
}

/**
 * Extracts city name and optional regionId from a location string (e.g. "Kranj, Glavni trg 12" -> "Kranj").
 */
export function extractCityOrRegion(locationStr?: string): { city: string; regionId?: string } {
  if (!locationStr || typeof locationStr !== 'string') return { city: '' };
  const clean = locationStr.trim();
  if (!clean) return { city: '' };

  // Check known cities in Slovenia regions
  for (const reg of SLOVENIA_REGIONS) {
    for (const city of reg.cities) {
      const regex = new RegExp(`(^|[,\\s–-])${city}($|[,\\s–-])`, 'i');
      if (regex.test(clean)) {
        return { city, regionId: reg.id };
      }
    }
    // Check region shortName or name
    if (clean.toLowerCase().includes(reg.name.toLowerCase()) || clean.toLowerCase().includes(reg.shortName.toLowerCase())) {
      return { city: reg.shortName, regionId: reg.id };
    }
  }

  // Fallback: take first segment before comma, slash or dash
  const parts = clean.split(/[,/–-]/);
  const candidate = parts[0]?.trim() || clean;
  return { city: candidate };
}

/**
 * Returns the earliest upcoming date (>= todayYmd) for an event, or null if all dates are in the past.
 */
export function getEventNextUpcomingDate(
  event: {
    eventDate?: string | null;
    date?: string | null;
    eventDates?: string[] | null;
    eventSchedule?: { date?: string }[] | null;
  },
  todayYmd: string = getTodayYmd()
): string | null {
  const dates = extractEventDateStrings(event);
  if (dates.length === 0) return null;

  // Filter for dates today or in the future
  const upcomingDates = dates.filter(d => d >= todayYmd).sort();
  if (upcomingDates.length > 0) {
    return upcomingDates[0];
  }

  return null;
}

/**
 * Checks if an event has at least one date today or in the future.
 */
export function isEventUpcoming(
  event: {
    eventDate?: string | null;
    date?: string | null;
    eventDates?: string[] | null;
    eventSchedule?: { date?: string }[] | null;
  },
  todayYmd: string = getTodayYmd()
): boolean {
  return getEventNextUpcomingDate(event, todayYmd) !== null;
}

/**
 * Filters a list of events to only include upcoming events (date >= today),
 * and sorts them chronologically (earliest upcoming date first).
 */
export function getUpcomingEvents<T extends {
  eventDate?: string | null;
  date?: string | null;
  eventDates?: string[] | null;
  eventSchedule?: { date?: string }[] | null;
  eventTime?: string | null;
  title?: string;
}>(events: T[], todayYmd: string = getTodayYmd()): (T & { upcomingDate: string })[] {
  const result: (T & { upcomingDate: string })[] = [];

  for (const ev of events) {
    const nextDate = getEventNextUpcomingDate(ev, todayYmd);
    if (nextDate) {
      result.push({
        ...ev,
        upcomingDate: nextDate,
      });
    }
  }

  // Sort ascending by upcomingDate, then by eventTime if available
  result.sort((a, b) => {
    if (a.upcomingDate !== b.upcomingDate) {
      return a.upcomingDate.localeCompare(b.upcomingDate);
    }
    const timeA = a.eventTime || '';
    const timeB = b.eventTime || '';
    return timeA.localeCompare(timeB);
  });

  return result;
}

/**
 * Programmatically navigates the portal to the Dogodki feed view.
 */
export function navigateToEventsView() {
  if (window.location.pathname !== '/dogodki' || window.location.hash) {
    window.history.pushState(null, '', '/dogodki');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
