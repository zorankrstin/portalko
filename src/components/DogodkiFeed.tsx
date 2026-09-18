import React, { useState, useEffect } from 'react';
import { BookmarkButton } from "./BookmarkButton";
import { ShareMenu } from "./ShareMenu";
import { CalendarDays, MapPin, Search, Calendar, ChevronDown, PlusCircle, Star, Music, PartyPopper, Users, Sparkles, Flame } from 'lucide-react';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { subscribeToEvents, FirestoreEvent } from '../services/firestoreService';
import { ComposeModal } from './ComposeModal';
import { INITIAL_EVENTS, MockEventItem } from '../data/mockFeedData';
import { PostDetailTarget } from '../types';

interface DogodkiFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function DogodkiFeed({ onViewChange, searchQuery = '', onNavigatePost }: DogodkiFeedProps) {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToEvents((events) => {
      setFirestoreEvents(events);
    });
    return () => unsub();
  }, []);

  // Filter Firestore events
  const filteredFirestore = firestoreEvents.filter(event => {
    const textToMatch = `${event.title} ${event.description} ${event.category} ${event.location || ''}`;
    const matchesSearch = matchesSearchAndCategory(textToMatch, 'events', searchQuery);
    const matchesCat = activeCategory === 'all' || 
      (event.category && event.category.toLowerCase() === activeCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  // Filter mock events
  const filteredMock = INITIAL_EVENTS.filter(event => {
    const textToMatch = `${event.title} ${event.description} ${event.categoryName} ${event.location} ${event.organizer} ${event.city}`;
    const matchesSearch = matchesSearchAndCategory(textToMatch, 'events', searchQuery);
    const matchesCat = activeCategory === 'all' || event.category === activeCategory;
    const matchesCity = selectedCity === 'all' || event.city.toLowerCase() === selectedCity.toLowerCase();
    return matchesSearch && matchesCat && matchesCity;
  });

  type UnifiedEvent = 
    | { type: 'firestore'; data: FirestoreEvent }
    | { type: 'mock'; data: MockEventItem };

  const allEvents: UnifiedEvent[] = [
    ...filteredFirestore.map(e => ({ type: 'firestore' as const, data: e })),
    ...filteredMock.map(e => ({ type: 'mock' as const, data: e }))
  ];

  const PAGE_SIZE = 10;
  const currentLimit = page * PAGE_SIZE;

  const getPagedEvents = (): UnifiedEvent[] => {
    if (allEvents.length === 0) return [];
    if (currentLimit <= allEvents.length) {
      return allEvents.slice(0, currentLimit);
    }
    const result: UnifiedEvent[] = [...allEvents];
    let counter = 1;
    while (result.length < currentLimit) {
      for (const item of allEvents) {
        if (result.length >= currentLimit) break;
        if (item.type === 'mock') {
          result.push({
            type: 'mock',
            data: {
              ...item.data,
              id: `${item.data.id}-p${counter}`
            }
          });
        } else {
          result.push({
            type: 'firestore',
            data: {
              ...item.data,
              id: `${item.data.id}-p${counter}`
            }
          });
        }
      }
      counter++;
    }
    return result;
  };

  const visibleEvents = getPagedEvents();

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoading(false);
    }, 450);
  };

  const CATEGORIES = [
    { id: 'all', label: 'Vsi dogodki' },
    { id: 'music', label: '🎵 Glasba & Koncerti' },
    { id: 'culture', label: '🎭 Kultura & Teater' },
    { id: 'sport', label: '⚽ Šport & Rekreacija' },
    { id: 'food', label: '🍷 Gastronomija' },
    { id: 'family', label: '🎈 Družina & Otroci' },
  ];

  return (
    <main className="lg:col-span-6 flex flex-col gap-space-md">
      {/* Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        <nav className="flex items-center gap-2 font-label-md text-xs text-outline">
          <a className="hover:text-primary transition-colors cursor-pointer" onClick={() => onViewChange('main')}>Domov</a>
          <span>/</span>
          <span className="text-primary font-semibold">Dogodki & Prireditve</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <PartyPopper className="w-[1em] h-[1em] text-primary shrink-0" />
              <span>Dogodki & Prireditve</span>
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
              Koncerti, festivali, gledališke predstave, športne prireditve in kulinarična doživetja po vsej Sloveniji.
            </p>
          </div>
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Predlagaj dogodek</span>
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors shadow-sm ${
              activeCategory === cat.id
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-lowest hover:bg-surface-container border border-surface-container text-on-surface-variant'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* City & Month bar */}
      <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-sm border border-surface-container/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <MapPin className="w-4 h-4 text-outline shrink-0" />
          <select 
            value={selectedCity}
            onChange={(e) => { setSelectedCity(e.target.value); setPage(1); }}
            className="bg-surface-container-low text-on-surface font-label-md text-xs px-2.5 py-1.5 rounded-lg focus:outline-none flex-1"
          >
            <option value="all">Vsa prizorišča (Slovenija)</option>
            <option value="ljubljana">Ljubljana</option>
            <option value="maribor">Maribor</option>
            <option value="celje">Celje</option>
            <option value="kranj">Kranj</option>
            <option value="koper">Koper & Obala</option>
            <option value="novo mesto">Novo mesto</option>
            <option value="bled">Bled</option>
            <option value="ptuj">Ptuj</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body-sm text-xs text-outline">Najdenih {allEvents.length} dogodkov</span>
        </div>
      </div>

      {/* 10 Event Cards initially */}
      <div className="flex flex-col gap-space-md">
        {visibleEvents.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50">
            Ni najdenih dogodkov za izbrane kriterije.
          </div>
        ) : (
          visibleEvents.map((item) => {
            if (item.type === 'firestore') {
              const event = item.data;
              return (
                <article key={event.id} className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <a 
                        href={`#event-${event.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.hash = `event-${event.id}`;
                        }}
                        className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary-container flex flex-col items-center justify-center font-bold shrink-0 border border-primary/20 cursor-pointer hover:opacity-90 transition-opacity"
                        title="Odpri samostojno stran dogodka"
                      >
                        <span className="text-[10px] uppercase font-label-caps">DOG</span>
                        <span className="text-base font-headline-lg font-black leading-none mt-0.5">★</span>
                      </a>
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="font-label-caps text-[10px] text-outline uppercase font-semibold">
                          {event.category || 'Dogodek'} • {event.location || 'Slovenija'}
                        </span>
                        <a
                          href={`#event-${event.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = `event-${event.id}`;
                          }}
                          className="block group/title cursor-pointer"
                        >
                          <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-2 group-hover/title:text-primary transition-colors">
                            {event.title}
                          </h3>
                        </a>
                        <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 mt-0.5">
                          {event.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-start">
                      <BookmarkButton 
                        id={event.id} 
                        data={{
                          type: 'event',
                          category: 'events',
                          title: event.title,
                          price: event.price || 'Vstop prost',
                          date: event.eventDate || event.date,
                          location: event.location,
                          description: event.description,
                          image: event.imageUrl,
                        }}
                      />
                      <ShareMenu id={event.id} title={event.title} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low text-xs text-outline">
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <Calendar className="w-3.5 h-3.5" /> {event.eventDate || event.date || 'Ravno objavljeno'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-headline-sm text-sm font-bold text-on-surface">
                        {event.price || 'Vstop prost'}
                      </span>
                      <a
                        href={`#event-${event.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.hash = `event-${event.id}`;
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container"
                        title="Poglej celotno stran dogodka"
                      >
                        <span>Stran dogodka</span>
                      </a>
                    </div>
                  </div>
                </article>
              );
            }

            const event = item.data;
            return (
              <article key={event.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col sm:flex-row">
                {event.image && (
                  <a 
                    href={`#event-${event.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.hash = `event-${event.id}`;
                    }}
                    className="sm:w-56 h-48 sm:h-auto bg-surface-container shrink-0 relative block cursor-pointer group"
                    title="Odpri samostojno stran dogodka"
                  >
                    <img alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={event.image} />
                    <div className="absolute top-2 left-2 bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-1.5 text-center min-w-[44px] shadow-sm border border-black/5">
                      <div className="text-[10px] font-bold text-primary uppercase font-label-caps">{event.month}</div>
                      <div className="text-base font-black text-on-surface leading-none mt-0.5">{event.day}</div>
                    </div>
                  </a>
                )}
                <div className="p-space-md flex flex-col justify-between flex-1 gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-label-caps text-[11px] text-primary font-semibold uppercase tracking-wider">
                        {event.categoryName}
                      </span>
                      <div className="flex items-center gap-1">
                        <BookmarkButton 
                          id={event.id} 
                          data={{
                            type: 'event',
                            category: 'events',
                            title: event.title,
                            price: event.price || 'Vstop prost',
                            date: event.date,
                            location: event.location,
                            description: event.description,
                            image: event.image,
                          }}
                        />
                        <ShareMenu id={event.id} title={event.title} />
                      </div>
                    </div>
                    <a
                      href={`#event-${event.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.hash = `event-${event.id}`;
                      }}
                      className="block group/title cursor-pointer"
                    >
                      <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-2 mt-1 group-hover/title:text-primary transition-colors">
                        {event.title}
                      </h3>
                    </a>
                    <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2 mt-1">
                      {event.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low text-xs text-outline">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {event.location}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-headline-sm text-sm font-bold text-primary">{event.price || 'Vstop prost'}</span>
                      <a
                        href={`#event-${event.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.hash = `event-${event.id}`;
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container"
                        title="Poglej celotno stran dogodka"
                      >
                        <span>Stran dogodka</span>
                      </a>
                      <button className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer">
                        <Star className="w-3 h-3" />
                        <span>Zanima me ({event.interestedCount})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {visibleEvents.length > 0 && (
        <div className="flex flex-col items-center justify-center gap-2 pt-2 pb-6">
          <button 
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low border border-surface-container text-on-surface font-label-md text-sm font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <ChevronDown className="w-4 h-4 text-primary" />
            )}
            <span>{isLoading ? 'Nalaganje dogodkov...' : 'Naloži še 10 dogodkov'}</span>
          </button>
          <span className="font-body-sm text-xs text-outline">
            Prikazano {visibleEvents.length} dogodkov (stran {page})
          </span>
        </div>
      )}

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        initialType="event" 
      />
    </main>
  );
}
