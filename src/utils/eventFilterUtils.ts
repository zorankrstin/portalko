import { SLOVENIA_REGIONS } from '../services/categoryService';
import { parseEventDateInfo, EventDateInfo } from './dateUtils';

export interface EventDateResolutionInput {
  eventDate?: string | null;
  date?: string | null;
  eventDates?: string[] | null;
  eventSchedule?: {
    date?: string;
    time?: string;
    times?: string[];
    location?: string;
    label?: string;
  }[] | null;
  eventTime?: string | null;
  location?: string | null;
}

export interface ResolvedEventDisplayDate {
  dateYmd: string;
  dateInfo: EventDateInfo;
  eventTime?: string;
  location?: string;
  venueLabel?: string;
  isUpcoming: boolean;
  isToday: boolean;
  upcomingDatesCount: number;
  totalDatesCount: number;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayYmd(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Ljubljana' }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
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

/**
 * Returns the next 7 days (including today) formatted as YYYY-MM-DD.
 */
export function getNext7DaysDates(): string[] {
  const todayStr = getTodayYmd();
  const [y, m, d] = todayStr.split('-').map(n => parseInt(n, 10));
  const base = !isNaN(y) && !isNaN(m) && !isNaN(d) ? new Date(y, m - 1, d) : new Date();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    dates.push(formatYmd(dt));
  }
  return dates;
}

/**
 * Returns all YYYY-MM-DD dates in a given year and 0-indexed month.
 */
export function getMonthDates(year: number, monthZeroIndexed: number): string[] {
  const lastDay = new Date(year, monthZeroIndexed + 1, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    dates.push(formatYmd(new Date(year, monthZeroIndexed, d)));
  }
  return dates;
}

/**
 * Parses a YYYY-MM-DD date string and optional time string (e.g. "20:00" or "18.30")
 * into a local Date instance. Defaults to 09:00 if no time is specified.
 */
export function computeEventStartDate(dateYmd: string, eventTime?: string | null): Date {
  const match = (dateYmd || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const now = new Date();
  const year = match ? parseInt(match[1], 10) : now.getFullYear();
  const month = match ? parseInt(match[2], 10) - 1 : now.getMonth();
  const day = match ? parseInt(match[3], 10) : now.getDate();

  let hour = 9;
  let minute = 0;
  if (eventTime && typeof eventTime === 'string') {
    const timeMatch = eventTime.match(/(\d{1,2})[:.](\d{2})/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1], 10);
      const min = parseInt(timeMatch[2], 10);
      if (!isNaN(h) && h >= 0 && h <= 23 && !isNaN(min) && min >= 0 && min <= 59) {
        hour = h;
        minute = min;
      }
    }
  }

  return new Date(year, month, day, hour, minute, 0, 0);
}

/**
 * Computes the reminder trigger timestamp ISO string from event date, time, and lead minutes.
 */
export function computeRemindAtIso(
  dateYmd: string,
  eventTime: string | undefined | null,
  leadMinutes: number
): string {
  const startDate = computeEventStartDate(dateYmd, eventTime);
  const targetMs = startDate.getTime() - leadMinutes * 60_000;
  const nowMs = Date.now();
  // If event itself is still in the future but the lead window has just started, schedule within 15s
  if (targetMs <= nowMs && startDate.getTime() > nowMs) {
    return new Date(nowMs + 15_000).toISOString();
  }
  return new Date(targetMs).toISOString();
}

/**
 * Builds a Google Calendar "Add Event" URL without using window.open.
 */
export function buildGoogleCalendarUrl(params: {
  title: string;
  dateYmd: string;
  eventTime?: string;
  location?: string;
  description?: string;
}): string {
  const start = computeEventStartDate(params.dateYmd, params.eventTime);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const toGCalStamp = (dt: Date) =>
    dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', params.title || 'Dogodek na Portalko.net');
  url.searchParams.set('dates', `${toGCalStamp(start)}/${toGCalStamp(end)}`);
  if (params.location) url.searchParams.set('location', params.location);
  if (params.description) url.searchParams.set('details', params.description.slice(0, 500));
  return url.toString();
}

/**
 * Downloads a standard .ics calendar file with a VALARM reminder trigger.
 */
export function downloadEventIcsFile(params: {
  id: string;
  title: string;
  dateYmd: string;
  eventTime?: string;
  location?: string;
  description?: string;
  leadMinutes?: number;
}): void {
  const start = computeEventStartDate(params.dateYmd, params.eventTime);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const toIcsStamp = (dt: Date) =>
    dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const escapeIcs = (txt: string) =>
    (txt || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

  const lead = Math.max(0, params.leadMinutes ?? 60);
  const triggerLine = lead === 0 ? 'TRIGGER:PT0M' : `TRIGGER:-PT${lead}M`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Portalko.net//Koledar dogodkov//SL',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(params.id)}@portalko.net`,
    `DTSTAMP:${toIcsStamp(new Date())}`,
    `DTSTART:${toIcsStamp(start)}`,
    `DTEND:${toIcsStamp(end)}`,
    `SUMMARY:${escapeIcs(params.title || 'Dogodek')}`,
    params.location ? `LOCATION:${escapeIcs(params.location)}` : '',
    params.description ? `DESCRIPTION:${escapeIcs(params.description.slice(0, 600))}` : '',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(`Opomnik: ${params.title || 'Dogodek'}`)}`,
    triggerLine,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  const safeName = (params.title || 'dogodek')
    .toLowerCase()
    .replace(/[^a-z0-9čšž-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'dogodek';
  link.download = `${safeName}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
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
 * Handles ISO strings, YYYY-MM-DD, DD.MM.YYYY, Slovenian month names, slash dates, and timestamps.
 */
export function normalizeDateToYmd(str?: any | null): string | null {
  if (!str) return null;

  // Handle Date instances
  if (str instanceof Date) {
    if (isNaN(str.getTime())) return null;
    return formatYmd(str);
  }

  // Handle Firestore Timestamp
  if (typeof str === 'object') {
    if (typeof str.toDate === 'function') {
      const d = str.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return formatYmd(d);
    }
    if (typeof str.seconds === 'number') {
      const d = new Date(str.seconds * 1000);
      if (!isNaN(d.getTime())) return formatYmd(d);
    }
  }

  if (typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // 1. Matches YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss or YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Matches DD.MM.YYYY or DD. MM. YYYY (e.g. 28. 9. 2026 or 28.09.2026.)
  const dmy = trimmed.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Matches Slovenian month names: e.g. "28. september 2026", "28. sep 2026", "28. september"
  const slMonths: Record<string, string> = {
    januar: '01', jan: '01',
    februar: '02', feb: '02',
    marec: '03', mar: '03',
    april: '04', apr: '04',
    maj: '05',
    junij: '06', jun: '06',
    julij: '07', jul: '07',
    avgust: '08', avg: '08',
    september: '09', sep: '09',
    oktober: '10', okt: '10',
    november: '11', nov: '11',
    december: '12', dec: '12'
  };

  const slMatch = trimmed.match(/(\d{1,2})\.?\s+([a-zA-ZčšžČŠŽ]+)(?:\s+(\d{4}))?/i);
  if (slMatch) {
    const day = slMatch[1].padStart(2, '0');
    const monthWord = slMatch[2].toLowerCase();
    const monthNum = slMonths[monthWord];
    if (monthNum) {
      const year = slMatch[3] || String(new Date().getFullYear());
      return `${year}-${monthNum}-${day}`;
    }
  }

  // 4. Fallback: Date.parse
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
  * Resolves the primary display date for an event.
  * If an event has multiple dates or repetition slots, this selects the next earliest upcoming date (>= today).
  * If all dates are in the past, it falls back to the most recent date or original eventDate.
  * Also extracts matching schedule slot time, venue label, and specific slot location if available.
  */
export function resolveEventDisplayDate(
  event?: EventDateResolutionInput | null,
  todayYmd: string = getTodayYmd()
): ResolvedEventDisplayDate {
  const fallbackInfo: EventDateInfo = { day: '★', month: 'DOG', fullDate: 'Datum po dogovoru' };
  if (!event) {
    return {
      dateYmd: todayYmd,
      dateInfo: fallbackInfo,
      eventTime: undefined,
      location: undefined,
      venueLabel: undefined,
      isUpcoming: false,
      isToday: false,
      upcomingDatesCount: 0,
      totalDatesCount: 0,
    };
  }

  const allDates = extractEventDateStrings(event).sort();
  const totalDatesCount = allDates.length;

  let currentMinutes = -1;
  try {
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('sl-SI', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Ljubljana',
    });
    const parts = timeFormatter.format(now).split(':').map(n => parseInt(n, 10));
    if (!isNaN(parts[0]) && !isNaN(parts[1])) {
      currentMinutes = parts[0] * 60 + parts[1];
    }
  } catch {
    const now = new Date();
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  // Filter for upcoming dates (accounting for time-elapsed today if multiple dates exist)
  const upcomingDates = allDates.filter(d => {
    if (d > todayYmd) return true;
    if (d === todayYmd) {
      // Check if today's slot time already elapsed
      const todaySlot = Array.isArray(event.eventSchedule)
        ? event.eventSchedule.find(s => s && normalizeDateToYmd(s.date || '') === todayYmd)
        : null;
      const timeToCheck = (todaySlot?.times && todaySlot.times[0]) || todaySlot?.time || event.eventTime;
      if (timeToCheck && timeToCheck.includes(':')) {
        const parts = timeToCheck.split(':').map(n => parseInt(n, 10));
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
          const eventMins = parts[0] * 60 + parts[1];
          if (currentMinutes !== -1 && currentMinutes > eventMins + 180) {
            // Over by more than 3 hours
            return false;
          }
        }
      }
      return true;
    }
    return false;
  });

  const isUpcoming = upcomingDates.length > 0;
  let chosenDateYmd = '';

  if (isUpcoming) {
    chosenDateYmd = upcomingDates[0];
  } else if (allDates.length > 0) {
    // All dates are in the past: choose the most recent / latest date
    chosenDateYmd = allDates[allDates.length - 1];
  } else if (event.eventDate) {
    chosenDateYmd = normalizeDateToYmd(event.eventDate) || event.eventDate;
  } else if (event.date) {
    chosenDateYmd = normalizeDateToYmd(event.date) || event.date;
  } else {
    chosenDateYmd = todayYmd;
  }

  // Match slot from eventSchedule for chosenDateYmd
  const matchingSlot = Array.isArray(event.eventSchedule)
    ? event.eventSchedule.find(s => s && normalizeDateToYmd(s.date || '') === chosenDateYmd)
    : null;

  let effectiveTime = event.eventTime?.trim() || undefined;
  let effectiveLocation = event.location?.trim() || undefined;
  let venueLabel = undefined;

  if (matchingSlot) {
    if (matchingSlot.times && matchingSlot.times.length > 0) {
      effectiveTime = matchingSlot.times.map(t => t.trim()).filter(Boolean).join(', ');
    } else if (matchingSlot.time && matchingSlot.time.trim()) {
      effectiveTime = matchingSlot.time.trim();
    }
    if (matchingSlot.location && matchingSlot.location.trim()) {
      effectiveLocation = matchingSlot.location.trim();
    }
    if (matchingSlot.label && matchingSlot.label.trim()) {
      venueLabel = matchingSlot.label.trim();
    }
  }

  // Parse date info for chosenDateYmd
  const dateInfo = parseEventDateInfo(chosenDateYmd, effectiveTime);

  return {
    dateYmd: chosenDateYmd,
    dateInfo,
    eventTime: effectiveTime,
    location: effectiveLocation,
    venueLabel,
    isUpcoming,
    isToday: chosenDateYmd === todayYmd,
    upcomingDatesCount: upcomingDates.length,
    totalDatesCount,
  };
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
  status?: string;
  title?: string;
}>(events: T[], todayYmd: string = getTodayYmd()): (T & { upcomingDate: string })[] {
  const result: (T & { upcomingDate: string })[] = [];
  const now = new Date();

  // Get current time in Europe/Ljubljana for same-day filtering
  let currentMinutes = -1;
  try {
    const timeFormatter = new Intl.DateTimeFormat('sl-SI', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Ljubljana',
    });
    const parts = timeFormatter.format(now).split(':').map(n => parseInt(n, 10));
    if (!isNaN(parts[0]) && !isNaN(parts[1])) {
      currentMinutes = parts[0] * 60 + parts[1];
    }
  } catch {
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  for (const ev of events) {
    // Exclude rejected, archived, draft
    if (ev.status === 'rejected' || ev.status === 'archived' || ev.status === 'draft') {
      continue;
    }

    const nextDate = getEventNextUpcomingDate(ev, todayYmd);
    if (!nextDate) continue;

    // If nextDate is strictly in the future, it is definitely upcoming
    if (nextDate > todayYmd) {
      result.push({
        ...ev,
        upcomingDate: nextDate,
      });
    } else if (nextDate === todayYmd) {
      // It is scheduled for today. Check if the event time has already elapsed
      let isElapsedToday = false;
      if (ev.eventTime && ev.eventTime.includes(':')) {
        const timeParts = ev.eventTime.split(':').map(n => parseInt(n, 10));
        if (!isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
          const eventMinutes = timeParts[0] * 60 + timeParts[1];
          // If event started more than 3 hours (180 mins) ago, consider it ended for today
          if (currentMinutes !== -1 && currentMinutes > eventMinutes + 180) {
            isElapsedToday = true;
          }
        }
      }

      if (isElapsedToday) {
        // Check if there is another upcoming date in eventDates after today
        const allDates = extractEventDateStrings(ev);
        const futureDates = allDates.filter(d => d > todayYmd).sort();
        if (futureDates.length > 0) {
          result.push({
            ...ev,
            upcomingDate: futureDates[0],
          });
        }
        // Otherwise event is over today
      } else {
        result.push({
          ...ev,
          upcomingDate: nextDate,
        });
      }
    }
  }

  // Sort ascending by upcomingDate (earliest first), then by eventTime if available
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
