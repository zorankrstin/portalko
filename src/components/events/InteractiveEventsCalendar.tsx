import React, { useState, useMemo } from 'react';
import {
  BellRing,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react';
import { EventReminderLeadMinutes, FirestoreEvent } from '../../services/firestoreService';
import { PostDetailTarget } from '../../types';
import { useEventFilter } from '../../contexts/EventFilterContext';
import { useEventReminders, formatLeadTimeLabel } from '../../contexts/EventReminderContext';
import {
  extractEventDateStrings,
  formatSingleDateSlovenian,
  formatYmd,
  getTodayYmd,
  resolveEventDisplayDate,
} from '../../utils/eventFilterUtils';
import { slugify, buildPostUrl } from '../../utils/urlUtils';
import { scrollToPageTop } from '../../utils/scrollUtils';
import { EventReminderButton } from './EventReminderButton';

interface InteractiveEventsCalendarProps {
  events: FirestoreEvent[];
  onNavigatePost?: (target: PostDetailTarget) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const MONTH_NAMES_SL = [
  'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
  'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December',
];

export const InteractiveEventsCalendar: React.FC<InteractiveEventsCalendarProps> = ({
  events,
  onNavigatePost,
  isExpanded,
  onToggleExpand,
}) => {
  const {
    selectedDates,
    toggleDate,
    clearDates,
    selectToday,
    selectWeekend,
    selectNext7Days,
    selectMonth,
    onlyWithReminders,
    setOnlyWithReminders,
    datesSummary,
  } = useEventFilter();

  const { reminders, remindersByDate, activeRemindersCount } = useEventReminders();
  const todayYmd = useMemo(() => getTodayYmd(), []);

  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selectedDates.length > 0) {
      const m = selectedDates[0].match(/^(\d{4})-(\d{1,2})/);
      if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, 1);
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Map each YYYY-MM-DD date to its events
  const eventsByDate = useMemo(() => {
    const map = new Map<string, FirestoreEvent[]>();
    for (const ev of events) {
      if (ev.status === 'rejected') continue;
      const dates = extractEventDateStrings(ev);
      for (const d of dates) {
        const list = map.get(d) || [];
        list.push(ev);
        map.set(d, list);
      }
    }
    return map;
  }, [events]);

  const monthEventCount = useMemo(() => {
    const uniqueIds = new Set<string>();
    for (const [dateStr, evList] of eventsByDate.entries()) {
      if (dateStr.startsWith(monthPrefix)) {
        for (const ev of evList) uniqueIds.add(ev.id);
      }
    }
    return uniqueIds.size;
  }, [eventsByDate, monthPrefix]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      eventCount: number;
      reminderCount: number;
    }[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = formatYmd(d);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayYmd,
        isSelected: selectedDates.includes(dateStr),
        eventCount: eventsByDate.get(dateStr)?.length || 0,
        reminderCount: remindersByDate[dateStr]?.length || 0,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      const dateStr = formatYmd(dt);
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayYmd,
        isSelected: selectedDates.includes(dateStr),
        eventCount: eventsByDate.get(dateStr)?.length || 0,
        reminderCount: remindersByDate[dateStr]?.length || 0,
      });
    }

    const remainder = days.length % 7;
    if (remainder > 0) {
      const needed = 7 - remainder;
      for (let d = 1; d <= needed; d++) {
        const dt = new Date(year, month + 1, d);
        const dateStr = formatYmd(dt);
        days.push({
          dateStr,
          dayNum: d,
          isCurrentMonth: false,
          isToday: dateStr === todayYmd,
          isSelected: selectedDates.includes(dateStr),
          eventCount: eventsByDate.get(dateStr)?.length || 0,
          reminderCount: remindersByDate[dateStr]?.length || 0,
        });
      }
    }

    return days;
  }, [year, month, todayYmd, selectedDates, eventsByDate, remindersByDate]);

  // Agenda items displayed alongside the calendar
  const agendaItems = useMemo(() => {
    type AgendaItem = {
      id: string;
      title: string;
      dateYmd: string;
      eventTime?: string;
      location?: string;
      description?: string;
      leadMinutes?: EventReminderLeadMinutes;
      eventObj?: FirestoreEvent;
    };

    if (onlyWithReminders) {
      return [...reminders]
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
        .map((rem): AgendaItem => {
          const matchedEvent = events.find((e) => e.id === rem.eventId);
          return {
            id: rem.eventId,
            title: matchedEvent?.title || rem.eventTitle,
            dateYmd: rem.eventDate,
            eventTime: matchedEvent?.eventTime || rem.eventTime,
            location: matchedEvent?.location || rem.location,
            description: matchedEvent?.description,
            leadMinutes: rem.leadMinutes,
            eventObj: matchedEvent,
          };
        });
    }

    if (selectedDates.length > 0) {
      const sortedDates = [...selectedDates].sort();
      const collected: AgendaItem[] = [];
      const seen = new Set<string>();

      for (const dateStr of sortedDates) {
        const list = eventsByDate.get(dateStr) || [];
        for (const ev of list) {
          const uniqueKey = `${ev.id}-${dateStr}`;
          if (seen.has(uniqueKey)) continue;
          seen.add(uniqueKey);
          const resolved = resolveEventDisplayDate(ev, dateStr);
          collected.push({
            id: ev.id,
            title: ev.title,
            dateYmd: dateStr,
            eventTime: resolved.eventTime || ev.eventTime,
            location: resolved.location || ev.location || ev.region,
            description: ev.description,
            eventObj: ev,
          });
        }
      }
      return collected.slice(0, 12);
    }

    // Default: upcoming events in the viewed month (or earliest upcoming overall)
    const monthUpcoming: AgendaItem[] = [];
    const seenIds = new Set<string>();

    const sortedMonthDates = Array.from(eventsByDate.keys())
      .filter((d) => d.startsWith(monthPrefix) && d >= todayYmd)
      .sort();

    for (const dateStr of sortedMonthDates) {
      for (const ev of eventsByDate.get(dateStr) || []) {
        if (seenIds.has(ev.id)) continue;
        seenIds.add(ev.id);
        const resolved = resolveEventDisplayDate(ev, dateStr);
        monthUpcoming.push({
          id: ev.id,
          title: ev.title,
          dateYmd: dateStr,
          eventTime: resolved.eventTime || ev.eventTime,
          location: resolved.location || ev.location || ev.region,
          description: ev.description,
          eventObj: ev,
        });
      }
    }

    if (monthUpcoming.length > 0) {
      return monthUpcoming.slice(0, 8);
    }

    // Fallback to earliest events in the viewed month if month is past/empty ahead
    const anyInMonthDates = Array.from(eventsByDate.keys())
      .filter((d) => d.startsWith(monthPrefix))
      .sort();
    for (const dateStr of anyInMonthDates) {
      for (const ev of eventsByDate.get(dateStr) || []) {
        if (seenIds.has(ev.id)) continue;
        seenIds.add(ev.id);
        monthUpcoming.push({
          id: ev.id,
          title: ev.title,
          dateYmd: dateStr,
          eventTime: ev.eventTime,
          location: ev.location || ev.region,
          description: ev.description,
          eventObj: ev,
        });
      }
    }

    return monthUpcoming.slice(0, 8);
  }, [onlyWithReminders, reminders, selectedDates, events, eventsByDate, monthPrefix, todayYmd]);

  const isCurrentMonthView = useMemo(() => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month;
  }, [year, month]);

  const handleOpenEventDetail = (ev: FirestoreEvent | undefined, id: string, title: string, e: React.MouseEvent) => {
    if (!ev) return;
    e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({
        type: 'event',
        id: ev.id || id,
        titleSlug: slugify(ev.title || title),
        categorySlug: slugify(ev.categoryName || ev.category || 'dogodki'),
        subcategorySlug: ev.subcategoryName || ev.subcategory ? slugify(ev.subcategoryName || ev.subcategory) : undefined,
        initialData: ev,
      });
    } else {
      window.location.hash = `event-${id}`;
    }
    scrollToPageTop();
  };

  return (
    <section
      aria-label="Interaktivni koledar dogodkov in opomniki"
      className="bg-surface-container-lowest rounded-2xl border border-surface-container/60 shadow-sm overflow-hidden"
    >
      {/* Collapsible Header Bar */}
      <div className="px-4 py-3 sm:px-5 bg-surface-container-low/60 border-b border-surface-container/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-tertiary-container/15 text-tertiary-container flex items-center justify-center shrink-0">
            <CalendarDays className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface flex items-center gap-2">
              <span>Interaktivni koledar dogodkov</span>
              {activeRemindersCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-bold tabular-nums">
                  <BellRing className="w-3 h-3" />
                  <span>{activeRemindersCount}</span>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-outline truncate">
              Kliknite dan za filtriranje prireditev in nastavite osebne opomnike
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedDates.length > 0 && (
            <button
              type="button"
              onClick={clearDates}
              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{datesSummary}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Skrij koledar' : 'Odpri koledar'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Quick Date & Reminder Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-container-low">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  clearDates();
                  setOnlyWithReminders(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  selectedDates.length === 0 && !onlyWithReminders
                    ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container shadow-2xs'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant border-surface-container'
                }`}
              >
                Vsi datumi
              </button>
              <button
                type="button"
                onClick={() => {
                  setOnlyWithReminders(false);
                  selectToday(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  selectedDates.length === 1 && selectedDates[0] === todayYmd && !onlyWithReminders
                    ? 'bg-primary text-on-primary border-primary shadow-2xs'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant border-surface-container'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Danes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOnlyWithReminders(false);
                  selectWeekend(false);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-low hover:bg-surface-container text-on-surface-variant border border-surface-container transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-secondary" />
                <span>Ta vikend</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOnlyWithReminders(false);
                  selectNext7Days(false);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-low hover:bg-surface-container text-on-surface-variant border border-surface-container transition-all cursor-pointer"
              >
                Naslednjih 7 dni
              </button>
              <button
                type="button"
                onClick={() => {
                  setOnlyWithReminders(false);
                  selectMonth(year, month, false);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-low hover:bg-surface-container text-on-surface-variant border border-surface-container transition-all cursor-pointer"
              >
                Cel {MONTH_NAMES_SL[month].toLowerCase()}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOnlyWithReminders(!onlyWithReminders)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                onlyWithReminders
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Moji opomniki ({activeRemindersCount})</span>
            </button>
          </div>

          {/* Main Grid + Agenda Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Interactive Calendar Grid */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {/* Month Navigation Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-base font-bold text-on-surface">
                    {MONTH_NAMES_SL[month]} {year}
                  </span>
                  <span className="text-[11px] font-semibold text-outline bg-surface-container-low px-2 py-0.5 rounded-md tabular-nums">
                    {monthEventCount} {monthEventCount === 1 ? 'dogodek' : monthEventCount === 2 ? 'dogodka' : 'dogodkov'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!isCurrentMonthView && (
                    <button
                      type="button"
                      onClick={() => setViewDate(new Date())}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold transition-colors cursor-pointer mr-1"
                    >
                      Trenutni mesec
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewDate(new Date(year, month - 1, 1))}
                    aria-label="Prejšnji mesec"
                    className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewDate(new Date(year, month + 1, 1))}
                    aria-label="Naslednji mesec"
                    className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-outline uppercase tracking-wider select-none">
                <span>Pon</span>
                <span>Tor</span>
                <span>Sre</span>
                <span>Čet</span>
                <span>Pet</span>
                <span className="text-primary">Sob</span>
                <span className="text-primary">Ned</span>
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((d, idx) => {
                  const isWeekend = idx % 7 === 5 || idx % 7 === 6;
                  return (
                    <button
                      key={`${d.dateStr}-${idx}`}
                      type="button"
                      onClick={() => {
                        setOnlyWithReminders(false);
                        toggleDate(d.dateStr, false);
                      }}
                      title={`${formatSingleDateSlovenian(d.dateStr, true)}${
                        d.eventCount > 0 ? ` • ${d.eventCount} dogodkov` : ''
                      }${d.reminderCount > 0 ? ` • ${d.reminderCount} opomnik` : ''}`}
                      className={`relative h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                        d.isSelected
                          ? 'bg-primary text-on-primary border-primary font-bold shadow-sm ring-2 ring-primary/25 z-10'
                          : d.isToday
                          ? 'border-primary/70 bg-primary/10 text-primary font-bold hover:bg-primary/15'
                          : !d.isCurrentMonth
                          ? 'border-transparent text-outline-variant hover:bg-surface-container-low/60'
                          : isWeekend
                          ? 'border-surface-container/60 bg-surface-container-low/80 text-on-surface hover:bg-surface-container'
                          : 'border-surface-container/50 bg-surface-container-low/40 text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="text-xs leading-none tabular-nums">{d.dayNum}</span>

                      {/* Event Count & Reminder Indicators */}
                      {(d.eventCount > 0 || d.reminderCount > 0) && (
                        <div className="flex items-center gap-1 mt-1">
                          {d.eventCount > 0 && (
                            <span
                              className={`text-[9px] font-bold px-1 rounded leading-tight tabular-nums ${
                                d.isSelected
                                  ? 'bg-white/25 text-white'
                                  : 'bg-secondary/15 text-secondary'
                              }`}
                            >
                              {d.eventCount}
                            </span>
                          )}
                          {d.reminderCount > 0 && (
                            <BellRing
                              className={`w-2.5 h-2.5 ${
                                d.isSelected ? 'text-amber-200' : 'text-amber-500'
                              }`}
                            />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low text-[11px] text-outline">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-1 rounded bg-secondary/15 text-secondary text-[9px] font-bold">2</span>
                    <span>Št. dogodkov</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BellRing className="w-3 h-3 text-amber-500" />
                    <span>Opomnik</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded border border-primary bg-primary/15"></span>
                    <span>Danes</span>
                  </span>
                </div>
                {selectedDates.length > 0 && (
                  <button
                    type="button"
                    onClick={clearDates}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Počisti izbrane datume ({selectedDates.length})
                  </button>
                )}
              </div>
            </div>

            {/* Right: Selected Day / Upcoming Events & Reminders Panel */}
            <div className="lg:col-span-5 bg-surface-container-low/50 rounded-xl border border-surface-container/60 p-3.5 flex flex-col gap-2.5 max-h-[380px]">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-surface-container/70">
                <h4 className="font-headline-xs text-xs font-bold text-on-surface uppercase tracking-wider">
                  {onlyWithReminders
                    ? 'Moji opomniki za dogodke'
                    : selectedDates.length > 0
                    ? `Izbrani dnevi: ${datesSummary}`
                    : `Spored za ${MONTH_NAMES_SL[month].toLowerCase()}`}
                </h4>
                <span className="text-[11px] font-bold text-tertiary-container tabular-nums">
                  {agendaItems.length}
                </span>
              </div>

              {agendaItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-3 gap-2">
                  {onlyWithReminders ? (
                    <>
                      <BellRing className="w-8 h-8 text-outline/40" />
                      <p className="text-xs font-semibold text-on-surface-variant">
                        Nimate še nastavljenih opomnikov
                      </p>
                      <p className="text-[11px] text-outline max-w-xs">
                        Kliknite gumb «Opomnik» pri kateremkoli dogodku na seznamu ali v koledarju.
                      </p>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-8 h-8 text-outline/40" />
                      <p className="text-xs font-semibold text-on-surface-variant">
                        Za ta izbor ni vpisanih dogodkov
                      </p>
                      <p className="text-[11px] text-outline">
                        Izberite drug datum s številko dogodkov ali prikažite vse datume.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin">
                  {agendaItems.map((item) => (
                    <div
                      key={`${item.id}-${item.dateYmd}`}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container/60 hover:border-surface-container-high transition-colors flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={
                            item.eventObj
                              ? buildPostUrl({
                                  type: 'event',
                                  id: item.eventObj.id,
                                  title: item.eventObj.title,
                                  category: item.eventObj.category,
                                  categoryName: item.eventObj.categoryName,
                                  subcategory: item.eventObj.subcategory,
                                  subcategoryName: item.eventObj.subcategoryName,
                                })
                              : `#event-${item.id}`
                          }
                          onClick={(e) => handleOpenEventDetail(item.eventObj, item.id, item.title, e)}
                          className="text-xs font-bold text-on-surface hover:text-primary transition-colors line-clamp-2 flex-1"
                        >
                          {item.title}
                        </a>
                        <EventReminderButton
                          eventId={item.id}
                          eventTitle={item.title}
                          eventDate={item.dateYmd}
                          eventTime={item.eventTime}
                          location={item.location}
                          description={item.description}
                          compact
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-outline">
                        <span className="inline-flex items-center gap-1 font-semibold text-primary tabular-nums">
                          <Calendar className="w-3 h-3" />
                          <span>{formatSingleDateSlovenian(item.dateYmd)}</span>
                        </span>
                        {item.eventTime && (
                          <span className="inline-flex items-center gap-1 font-medium text-on-surface-variant tabular-nums">
                            <Clock className="w-3 h-3" />
                            <span>{item.eventTime}</span>
                          </span>
                        )}
                        {item.location && (
                          <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </span>
                        )}
                        {'leadMinutes' in item && item.leadMinutes !== undefined && (
                          <span className="text-amber-700 dark:text-amber-300 font-semibold">
                            • {formatLeadTimeLabel(item.leadMinutes)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
