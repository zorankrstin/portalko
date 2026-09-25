import { useState, useEffect, useMemo } from 'react';
import { Bookmark, Building, Navigation, Plus, MapPin } from 'lucide-react';
import { PostDetailTarget } from '../types';
import { scrollToPageTop } from '../utils/scrollUtils';
import { subscribeToEvents, FirestoreEvent } from '../services/firestoreService';
import { parseEventDateInfo } from '../utils/dateUtils';
import { EventCalendarWidget } from './common/EventCalendarWidget';
import { useEventFilter } from '../contexts/EventFilterContext';
import { getUpcomingEvents, getTodayYmd } from '../utils/eventFilterUtils';

interface RightSidebarEventsProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
}

const POPULAR_VENUES = [
  'Arena Stožice',
  'Cankarjev dom',
  'Križanke',
  'Španski borci',
  'Ljudski vrt MB',
  'SNG Drama',
];

export function RightSidebarEvents({ onNavigatePost }: RightSidebarEventsProps) {
  const [allEvents, setAllEvents] = useState<FirestoreEvent[]>([]);
  const { locationFilter, filterByEventLocation, setLocationFilter } = useEventFilter();

  const todayYmd = useMemo(() => getTodayYmd(), []);

  useEffect(() => {
    const unsub = subscribeToEvents((events) => {
      const activeEvents = events.filter(e => e.status !== 'rejected');
      setAllEvents(activeEvents);
    });
    return () => unsub();
  }, []);

  // Filter only upcoming events (date >= today) sorted chronologically (earliest first)
  const upcomingEvents = useMemo(() => {
    return getUpcomingEvents(allEvents, todayYmd).slice(0, 4);
  }, [allEvents, todayYmd]);

  const handleOpenEvent = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({ type: 'event', id });
    } else {
      window.location.hash = `event-${id}`;
    }
    scrollToPageTop();
  };

  const handleVenueClick = (venue: string) => {
    if (locationFilter.toLowerCase() === venue.toLowerCase()) {
      setLocationFilter('');
    } else {
      filterByEventLocation(venue);
    }
  };

  return (
    <aside 
      id="right-sidebar" 
      data-sidebar="right" 
      className="sidebar-scrollable hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6"
    >
      {/* 1. Interaktivni Koledar prireditev (Date Filter) */}
      <EventCalendarWidget events={allEvents} />

      {/* 2. Prihajajoči top dogodki v vaši bližini */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <Navigation className="w-[1em] h-[1em] text-secondary text-lg" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Prihajajoči dogodki</h3>
          </div>
          <span className="font-label-caps text-label-caps text-outline">Aktualno</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-outline py-3 text-center">Trenutno ni prihajajočih dogodkov.</p>
          ) : (
            upcomingEvents.map(ev => {
              const dateInfo = parseEventDateInfo(ev.upcomingDate || ev.eventDate || ev.date, ev.eventTime);
              const isToday = ev.upcomingDate === todayYmd;

              return (
                <a 
                  key={ev.id}
                  className="group flex flex-col gap-1 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer" 
                  href={`#event-${ev.id}`}
                  onClick={(e) => handleOpenEvent(ev.id, e)}
                  title={`Odpri dogodek: ${ev.title}`}
                >
                  <div className="flex items-center justify-between text-[11px] text-outline">
                    {isToday ? (
                      <span className="font-bold text-primary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span>Danes{ev.eventTime ? ` ob ${ev.eventTime}` : ''}</span>
                      </span>
                    ) : (
                      <span className="font-bold text-primary">{dateInfo.fullDate || 'Kmalu'}</span>
                    )}
                    <Bookmark className="w-[1em] h-[1em] text-sm group-hover:text-primary shrink-0" />
                  </div>
                  <p className="font-label-md text-xs text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {ev.title}
                  </p>
                  {ev.location && (
                    <div className="flex items-center gap-1 text-[10px] text-outline truncate mt-0.5">
                      <MapPin className="w-3 h-3 text-outline/70 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  )}
                </a>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Promocijski okvir za organizatorje */}
      <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl p-space-md shadow-md flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-surface-container-lowest/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-caps text-label-caps uppercase font-bold tracking-wider">Za organizatorje</span>
          <svg className="w-[1em] h-[1em] text-lg text-primary-fixed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20h2" /><path d="M16 20h-4" /><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /><path d="M12 2v1" /><path d="M12 7v1" /><path d="M12 12v1" /><path d="M19 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /><path d="M9 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /></svg>
        </div>
        <div>
          <h4 className="font-headline-sm text-base font-bold text-white">Organizirate dogodek ali koncert?</h4>
          <p className="font-body-sm text-xs text-on-primary-container/90 mt-1 leading-relaxed">Brezplačno vpišite vašo prireditev v koledar Portalko ali izberite paket Izpostavljenosti za dosego obiskovalcev.</p>
        </div>
        <button 
          onClick={() => { window.location.hash = 'new-event'; }}
          className="w-full py-2.5 px-3 rounded-xl bg-surface-container-lowest text-primary hover:bg-surface-container-high font-label-md text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer" 
          type="button"
        >
          <Plus className="w-4 h-4" />
          <span>Oddaj prireditev</span>
        </button>
      </div>

      {/* 4. Prizorišča v Sloveniji (Interactive Location Filter) */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <Building className="w-[1em] h-[1em] text-primary text-lg" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Priljubljena prizorišča</h3>
          </div>
          <span className="font-label-caps text-label-caps text-outline">Slovenija</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {POPULAR_VENUES.map((venue) => {
            const isSelected = locationFilter.toLowerCase() === venue.toLowerCase();
            return (
              <button
                key={venue}
                type="button"
                onClick={() => handleVenueClick(venue)}
                title={`Filtriraj dogodke za prizorišče: ${venue}`}
                className={`px-2.5 py-1 rounded-lg font-label-md text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                }`}
              >
                {venue}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
