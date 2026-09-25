import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Sparkles, Check } from 'lucide-react';
import { useEventFilter } from '../../contexts/EventFilterContext';
import { getTodayYmd, formatYmd, extractEventDateStrings } from '../../utils/eventFilterUtils';
import { FirestoreEvent } from '../../services/firestoreService';

interface EventCalendarWidgetProps {
  events?: FirestoreEvent[];
  className?: string;
  onDateClick?: (dateStr: string) => void;
}

const MONTH_NAMES_SL = [
  'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
  'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'
];

export const EventCalendarWidget: React.FC<EventCalendarWidgetProps> = ({
  events = [],
  className = '',
  onDateClick,
}) => {
  const {
    selectedDates,
    toggleDate,
    clearDates,
    selectToday,
    selectWeekend,
    datesSummary,
  } = useEventFilter();

  const todayYmd = useMemo(() => getTodayYmd(), []);

  // Displayed month & year in the calendar widget (defaults to today's month/year)
  const [viewDate, setViewDate] = useState<Date>(() => {
    // If selected dates exist, show month of first selected date
    if (selectedDates.length > 0) {
      const match = selectedDates[0].match(/^(\d{4})-(\d{1,2})/);
      if (match) {
        return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, 1);
      }
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleResetToCurrentMonth = () => {
    setViewDate(new Date());
  };

  // Map each date string to event count
  const eventDatesMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of events) {
      if (ev.status === 'rejected') continue;
      const dateStrings = extractEventDateStrings(ev);
      for (const d of dateStrings) {
        map.set(d, (map.get(d) || 0) + 1);
      }
    }
    return map;
  }, [events]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-based index: 0 = Mon, ..., 6 = Sun
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasEvents: boolean;
      eventCount: number;
    }[] = [];

    // Leading days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = formatYmd(d);
      const evCount = eventDatesMap.get(dateStr) || 0;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayYmd,
        isSelected: selectedDates.includes(dateStr),
        hasEvents: evCount > 0,
        eventCount: evCount,
      });
    }

    // Days of current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      const dateStr = formatYmd(dt);
      const evCount = eventDatesMap.get(dateStr) || 0;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayYmd,
        isSelected: selectedDates.includes(dateStr),
        hasEvents: evCount > 0,
        eventCount: evCount,
      });
    }

    // Trailing days from next month
    const remainder = days.length % 7;
    if (remainder > 0) {
      const needed = 7 - remainder;
      for (let d = 1; d <= needed; d++) {
        const dt = new Date(year, month + 1, d);
        const dateStr = formatYmd(dt);
        const evCount = eventDatesMap.get(dateStr) || 0;
        days.push({
          dateStr,
          dayNum: d,
          isCurrentMonth: false,
          isToday: dateStr === todayYmd,
          isSelected: selectedDates.includes(dateStr),
          hasEvents: evCount > 0,
          eventCount: evCount,
        });
      }
    }

    return days;
  }, [year, month, todayYmd, selectedDates, eventDatesMap]);

  const handleDayClick = (dateStr: string) => {
    toggleDate(dateStr);
    onDateClick?.(dateStr);
  };

  const isCurrentMonthView = useMemo(() => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month;
  }, [year, month]);

  return (
    <div className={`bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm ${className}`}>
      {/* Title & Month Navigation Header */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Koledar prireditev</h3>
            <div className="text-[11px] font-semibold text-primary font-label-caps">
              {MONTH_NAMES_SL[month]} {year}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isCurrentMonthView && (
            <button
              onClick={handleResetToCurrentMonth}
              title="Skoči na trenutni mesec"
              className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold transition-colors cursor-pointer"
            >
              Danes
            </button>
          )}
          <button
            onClick={handlePrevMonth}
            title="Prejšnji mesec"
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
            type="button"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            title="Naslednji mesec"
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
            type="button"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday abbreviations: P, T, S, Č, P, S, N */}
      <div className="grid grid-cols-7 gap-1 text-center font-label-caps text-[11px] text-outline pt-1 select-none">
        <span title="Ponedeljek">P</span>
        <span title="Torek">T</span>
        <span title="Sreda">S</span>
        <span title="Četrtek">Č</span>
        <span title="Petek">P</span>
        <span title="Sobota" className="text-primary font-bold">S</span>
        <span title="Nedelja" className="text-primary font-bold">N</span>
      </div>

      {/* Calendar Day Grid */}
      <div className="grid grid-cols-7 gap-1 text-center font-label-md text-xs">
        {calendarDays.map((d, idx) => {
          const isWeekend = (idx % 7 === 5) || (idx % 7 === 6);

          return (
            <button
              key={`${d.dateStr}-${idx}`}
              type="button"
              onClick={() => handleDayClick(d.dateStr)}
              title={`${d.dateStr}${d.hasEvents ? ` • ${d.eventCount} ${d.eventCount === 1 ? 'dogodek' : d.eventCount === 2 ? 'dogodka' : 'dogodkov'}` : ''}${d.isSelected ? ' (izbrano - klikni za preklic)' : ' (klikni za filter)'}`}
              className={`relative h-8 rounded-lg flex flex-col items-center justify-center font-medium transition-all cursor-pointer ${
                d.isSelected
                  ? 'bg-primary text-on-primary font-bold shadow-md scale-105 z-10'
                  : d.isToday
                  ? 'border border-primary font-bold text-primary bg-primary/10 hover:bg-primary/20'
                  : !d.isCurrentMonth
                  ? 'text-outline-variant hover:bg-surface-container-low hover:text-on-surface'
                  : isWeekend
                  ? 'bg-surface-container-low/70 text-on-surface hover:bg-surface-container'
                  : 'bg-surface-container-low/40 text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="leading-none text-[11px]">{d.dayNum}</span>

              {/* Event indicator dot */}
              {d.hasEvents && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-colors ${
                    d.isSelected 
                      ? 'bg-white' 
                      : 'bg-secondary'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Selection Banner */}
      {selectedDates.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 flex items-center justify-between gap-2 mt-1 animate-in fade-in duration-200">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase font-bold text-primary font-label-caps">
              {selectedDates.length === 1 ? 'Izbran datum za filter:' : `Izbranih ${selectedDates.length} datumov:`}
            </span>
            <span className="text-xs font-bold text-on-surface truncate">
              {datesSummary}
            </span>
          </div>
          <button
            onClick={clearDates}
            className="p-1 rounded-lg hover:bg-primary/20 text-primary transition-colors cursor-pointer shrink-0"
            title="Počisti filter datumov"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Select Buttons */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => selectToday()}
          className="py-1.5 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Danes</span>
        </button>

        <button
          type="button"
          onClick={() => selectWeekend()}
          className="py-1.5 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
        >
          <Calendar className="w-3.5 h-3.5 text-secondary" />
          <span>Ta vikend</span>
        </button>
      </div>

      {/* Legend */}
      <div className="pt-2 border-t border-surface-container-low flex items-center justify-between text-[10px] text-outline">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-secondary"></span> Z dogodki
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full border border-primary bg-primary/20"></span> Danes
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary"></span> Izbrano
        </span>
      </div>
    </div>
  );
};
