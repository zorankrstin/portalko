import React, { useState, useEffect, useMemo } from 'react';
import { BookmarkButton } from "./BookmarkButton";
import { ShareMenu } from "./ShareMenu";
import { ReportButton } from "./ReportButton";
import { CalendarDays, MapPin, Search, Calendar, ChevronDown, PlusCircle, Star, Music, PartyPopper, Users, Sparkles, Flame, Tag, Layers, Globe, X } from 'lucide-react';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { subscribeToEvents, FirestoreEvent } from '../services/firestoreService';
import { ComposeModal } from './ComposeModal';
import { INITIAL_EVENTS, MockEventItem } from '../data/mockFeedData';
import { PostDetailTarget } from '../types';
import { useCategories } from '../hooks/useCategories';
import { SLOVENIA_REGIONS } from '../services/categoryService';
import { PromotedBadge } from './common/PromotedBadge';
import { EventPost } from './posts/EventPost';
import { isItemActivelyPromoted } from '../services/promotionService';
import { parseEventDateInfo } from '../utils/dateUtils';
import { useEventFilter } from '../contexts/EventFilterContext';
import { extractEventDateStrings } from '../utils/eventFilterUtils';
import { EventCalendarWidget } from './common/EventCalendarWidget';

interface DogodkiFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function DogodkiFeed({ onViewChange, searchQuery = '', onNavigatePost }: DogodkiFeedProps) {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  // Global Event Filter Context (synced with Koledar prireditev in RightSidebar)
  const {
    selectedDates,
    clearDates,
    toggleDate,
    datesSummary,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    selectedRegion,
    setSelectedRegion,
    locationFilter,
    setLocationFilter,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
    filterByEventCategory,
    filterByEventLocation,
  } = useEventFilter();

  // Dynamic categories for events
  const { categories } = useCategories('events');

  useEffect(() => {
    const unsub = subscribeToEvents((events) => {
      setFirestoreEvents(events);
    });
    return () => unsub();
  }, []);

  // Active Category Object
  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return categories.find(c => c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  // All available subcategories (when 'all' is selected, show all unique subcategories across all event categories)
  const availableSubcategories = useMemo(() => {
    if (activeCategoryObj) {
      return activeCategoryObj.subcategories || [];
    }
    const allSubs: { id: string; name: string; description?: string }[] = [];
    const seen = new Set<string>();
    for (const cat of categories) {
      for (const sub of (cat.subcategories || [])) {
        const key = sub.name.toLowerCase().trim();
        if (!seen.has(sub.id) && !seen.has(key)) {
          seen.add(sub.id);
          seen.add(key);
          allSubs.push(sub);
        }
      }
    }
    return allSubs;
  }, [activeCategoryObj, categories]);

  // Selected subcategory object for name-based matching
  const selectedSubcatObj = useMemo(() => {
    if (selectedSubcategory === 'all') return null;
    for (const cat of categories) {
      const found = (cat.subcategories || []).find(s => 
        s.id === selectedSubcategory || 
        s.name.toLowerCase().trim() === selectedSubcategory.toLowerCase().trim()
      );
      if (found) return found;
    }
    return null;
  }, [categories, selectedSubcategory]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('all');
    setPage(1);
  };

  // Category counts based on real user events
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: firestoreEvents.length };
    for (const cat of categories) {
      counts[cat.id] = firestoreEvents.filter(ev => {
        const cLower = cat.name.toLowerCase().trim();
        const evCat = (ev.category || '').toLowerCase().trim();
        const evCatName = (ev.categoryName || '').toLowerCase().trim();
        return ev.category === cat.id || evCat === cLower || evCatName === cLower || evCat.includes(cLower) || evCatName.includes(cLower);
      }).length;
    }
    return counts;
  }, [firestoreEvents, categories]);

  // Filter real Firestore events
  const filteredFirestore = useMemo(() => {
    return firestoreEvents.filter(event => {
      const textToMatch = `${event.title} ${event.description || ''} ${event.category || ''} ${event.categoryName || ''} ${event.subcategory || ''} ${event.subcategoryName || ''} ${event.location || ''} ${event.region || ''}`;
      const matchesSearch = matchesSearchAndCategory(textToMatch, 'events', searchQuery);
      
      const evCatLower = (event.category || '').toLowerCase().trim();
      const evCatNameLower = (event.categoryName || '').toLowerCase().trim();

      const matchesCat = selectedCategory === 'all' || 
        event.category === selectedCategory ||
        evCatLower === selectedCategory.toLowerCase().trim() ||
        evCatNameLower === selectedCategory.toLowerCase().trim() ||
        (activeCategoryObj && (
          evCatLower === activeCategoryObj.name.toLowerCase().trim() ||
          evCatNameLower === activeCategoryObj.name.toLowerCase().trim() ||
          evCatLower.includes(activeCategoryObj.name.toLowerCase().trim()) ||
          evCatNameLower.includes(activeCategoryObj.name.toLowerCase().trim())
        ));

      const evSubLower = (event.subcategory || '').toLowerCase().trim();
      const evSubNameLower = (event.subcategoryName || '').toLowerCase().trim();
      const targetSubLower = selectedSubcategory.toLowerCase().trim();

      const matchesSubcat = selectedSubcategory === 'all' ||
        event.subcategory === selectedSubcategory ||
        evSubLower === targetSubLower ||
        evSubNameLower === targetSubLower ||
        (selectedSubcatObj && (
          evSubLower === selectedSubcatObj.name.toLowerCase().trim() ||
          evSubLower === selectedSubcatObj.id.toLowerCase().trim() ||
          evSubNameLower === selectedSubcatObj.name.toLowerCase().trim() ||
          evSubNameLower === selectedSubcatObj.id.toLowerCase().trim()
        ));

      const matchesReg = selectedRegion === 'all' ||
        (event.region && event.region.toLowerCase().includes(selectedRegion.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(selectedRegion.toLowerCase()));

      // 1. Date Filtering (Koledar prireditev multi-date filter)
      const eventDates = extractEventDateStrings(event);
      const matchesDates = selectedDates.length === 0 ||
        selectedDates.some(selDate => eventDates.includes(selDate));

      // 2. Location / Venue Keyword Filtering
      const targetLocLower = locationFilter.toLowerCase().trim();
      const matchesLocation = !targetLocLower ||
        (event.location && event.location.toLowerCase().includes(targetLocLower)) ||
        (event.region && event.region.toLowerCase().includes(targetLocLower)) ||
        (event.title && event.title.toLowerCase().includes(targetLocLower));

      return matchesSearch && matchesCat && matchesSubcat && matchesReg && matchesDates && matchesLocation;
    });
  }, [
    firestoreEvents, 
    searchQuery, 
    selectedCategory, 
    activeCategoryObj, 
    selectedSubcategory, 
    selectedSubcatObj, 
    selectedRegion, 
    selectedDates, 
    locationFilter
  ]);

  type UnifiedEvent = { type: 'firestore'; data: FirestoreEvent };

  const allEvents: UnifiedEvent[] = useMemo(() => {
    return filteredFirestore.map(e => ({ type: 'firestore' as const, data: e }));
  }, [filteredFirestore]);

  // Helper to check promotion status
  const checkEventPromoted = (item: UnifiedEvent): boolean => {
    const event = item.data;
    if (event.promotion) {
      return isItemActivelyPromoted(event.promotion, 'dogodki', selectedCategory, selectedSubcategory);
    }
    if (event.isPromoted) {
      if (event.promotedUntil) {
        return new Date(event.promotedUntil).getTime() > Date.now();
      }
      return true;
    }
    return false;
  };

  // Sorting: Actively promoted (PROMO / OGLAS) events are positioned FIRST in the feed
  const sortedEvents = useMemo(() => {
    const copy = [...allEvents];
    copy.sort((a, b) => {
      const aPromoted = checkEventPromoted(a);
      const bPromoted = checkEventPromoted(b);
      if (aPromoted && !bPromoted) return -1;
      if (!aPromoted && bPromoted) return 1;
      return 0;
    });
    return copy;
  }, [allEvents, selectedCategory, selectedSubcategory]);

  const PAGE_SIZE = 10;
  const currentLimit = page * PAGE_SIZE;
  const visibleEvents = sortedEvents.slice(0, currentLimit);
  const hasMore = currentLimit < sortedEvents.length;

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoading(false);
    }, 450);
  };

  return (
    <div className="flex flex-col gap-space-md">
      {/* Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <PartyPopper className="w-[1em] h-[1em] text-primary shrink-0" />
              <span>Dogodki in prireditve</span>
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
              Koncerti, festivali, gledališke predstave, športne prireditve in kulinarična doživetja po vsej Sloveniji.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile Calendar Toggle Button (for screens where right sidebar is hidden) */}
            <button
              type="button"
              onClick={() => setShowMobileCalendar(prev => !prev)}
              className="lg:hidden px-3 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span>{selectedDates.length > 0 ? `Koledar (${selectedDates.length})` : 'Koledar'}</span>
            </button>
            <button 
              onClick={() => setIsComposeOpen(true)}
              className="flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Dodaj</span>
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Calendar */}
        {showMobileCalendar && (
          <div className="lg:hidden mt-2 pt-3 border-t border-surface-container animate-in fade-in duration-200">
            <EventCalendarWidget events={firestoreEvents} />
          </div>
        )}
      </div>

      {/* Active Filter Chips Bar (Dates, Category, Subcategory, Location) */}
      {hasActiveFilters && (
        <div className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-sm border border-primary/20 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-outline font-label-caps uppercase tracking-wider mr-1">
              Filtri:
            </span>

            {/* Date filter chip */}
            {selectedDates.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/25 text-xs font-bold">
                <Calendar className="w-3.5 h-3.5" />
                <span>{datesSummary}</span>
                <button
                  type="button"
                  onClick={clearDates}
                  title="Odstrani filter datumov"
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Category chip */}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-container text-on-surface border border-surface-container-high text-xs font-semibold">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>{activeCategoryObj?.name || selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => handleCategorySelect('all')}
                  title="Odstrani filter kategorije"
                  className="hover:bg-surface-container-high rounded-full p-0.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Subcategory chip */}
            {selectedSubcategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-container text-on-surface border border-surface-container-high text-xs font-semibold">
                <span>Zvrst: {selectedSubcatObj?.name || selectedSubcategory}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory('all')}
                  title="Odstrani filter zvrsti"
                  className="hover:bg-surface-container-high rounded-full p-0.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Region chip */}
            {selectedRegion !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-container text-on-surface border border-surface-container-high text-xs font-semibold">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span>{SLOVENIA_REGIONS.find(r => r.id === selectedRegion)?.shortName || selectedRegion}</span>
                <button
                  type="button"
                  onClick={() => setSelectedRegion('all')}
                  title="Odstrani filter regije"
                  className="hover:bg-surface-container-high rounded-full p-0.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Specific Location chip */}
            {locationFilter.trim() && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary/10 text-secondary border border-secondary/25 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5" />
                <span>Lokacija: {locationFilter}</span>
                <button
                  type="button"
                  onClick={() => setLocationFilter('')}
                  title="Odstrani filter lokacije"
                  className="hover:bg-secondary/20 rounded-full p-0.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-bold text-outline hover:text-primary transition-colors cursor-pointer underline"
          >
            Počisti vse filtre
          </button>
        </div>
      )}

      {/* Main Categories Pills */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1">
        <button
          onClick={() => handleCategorySelect('all')}
          className={`px-3.5 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-primary text-on-primary font-bold'
              : 'bg-surface-container-lowest hover:bg-surface-container border border-surface-container text-on-surface-variant'
          }`}
        >
          <span>Vsi dogodki</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
            {categoryCounts.all || 0}
          </span>
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-lowest hover:bg-surface-container border border-surface-container text-on-surface-variant'
            }`}
          >
            <span>{cat.icon || '📅'}</span>
            <span>{cat.name}</span>
            {categoryCounts[cat.id] !== undefined && categoryCounts[cat.id] > 0 && (
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
                {categoryCounts[cat.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Subcategory Pills - always visible when subcategories are available */}
      {availableSubcategories.length > 0 && (
        <div className="bg-surface-container-low/60 p-2 sm:p-2.5 rounded-xl border border-surface-container/60 flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="text-[11px] font-semibold text-outline uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-primary" />
            <span>Zvrst:</span>
          </div>
          <button
            onClick={() => { setSelectedSubcategory('all'); setPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
              selectedSubcategory === 'all'
                ? 'bg-surface-container-lowest text-primary font-bold shadow-xs border border-surface-container'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            Vse zvrsti
          </button>
          {availableSubcategories.map(sub => (
            <button
              key={sub.id}
              onClick={() => { setSelectedSubcategory(sub.id); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
                selectedSubcategory === sub.id || (selectedSubcatObj && (selectedSubcatObj.id === sub.id || selectedSubcatObj.name.toLowerCase() === sub.name.toLowerCase()))
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-xs border border-surface-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* City & Localization Region filter */}
      <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-sm border border-surface-container/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <MapPin className="w-4 h-4 text-outline shrink-0" />
          <select 
            value={selectedRegion}
            onChange={(e) => { setSelectedRegion(e.target.value); setPage(1); }}
            className="bg-surface-container-low text-on-surface font-label-md text-xs px-2.5 py-1.5 rounded-lg focus:outline-none flex-1 cursor-pointer"
          >
            <option value="all">Vsa prizorišča (Vsa Slovenija)</option>
            {SLOVENIA_REGIONS.map(reg => (
              <option key={reg.id} value={reg.id}>
                {reg.name} ({reg.cities.slice(0, 2).join(', ')})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body-sm text-xs text-outline">
            Najdenih {sortedEvents.length} dogodkov
            {selectedDates.length > 0 && ` za izbrane datume`}
          </span>
        </div>
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-space-md">
        {visibleEvents.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-surface-container/50 flex flex-col items-center justify-center gap-3">
            <Calendar className="w-10 h-10 text-outline/50" />
            <div>
              <h4 className="font-headline-sm text-base font-bold text-on-surface">Ni najdenih dogodkov</h4>
              <p className="text-xs text-outline mt-1 max-w-md mx-auto">
                {selectedDates.length > 0 
                  ? `Za izbrane datume (${datesSummary})${locationFilter ? ` in lokacijo "${locationFilter}"` : ''} trenutno ni vpisanih dogodkov.`
                  : locationFilter
                  ? `Za lokacijo "${locationFilter}" trenutno ni vpisanih dogodkov.`
                  : 'Za izbrane kriterije (kategorija, zvrst ali regija) trenutno ni najdenih dogodkov.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold transition-all shadow-sm cursor-pointer hover:bg-primary-container"
              >
                Počisti vse filtre in prikaži vse dogodke
              </button>
            )}
          </div>
        ) : (
          visibleEvents.map((item, idx) => {
            const event = item.data;
            const isPromoted = checkEventPromoted(item);
            const badgeType = event.promotionBadgeType || event.promotion?.badgeType || 'PROMO';
            const dateInfo = parseEventDateInfo(event.eventDate || event.date, event.eventTime);

            return (
              <EventPost
                key={`fe-${event.id}-${idx}`}
                id={event.id}
                title={event.title}
                organizer={event.authorName}
                category={event.category}
                categoryName={event.categoryName || event.category || 'Dogodek'}
                subcategory={event.subcategory}
                subcategoryName={event.subcategoryName}
                location={event.location || event.region || 'Slovenija'}
                region={event.region}
                date={dateInfo.fullDate}
                eventTime={event.eventTime}
                eventDates={event.eventDates}
                eventSchedule={event.eventSchedule}
                month={dateInfo.month}
                day={dateInfo.day}
                price={event.price || 'Vstop prost'}
                ticketUrl={event.ticketUrl}
                description={event.description}
                image={event.imageUrl}
                interestedCount={event.interestedCount}
                likesCount={event.likesCount || 0}
                isPromoted={isPromoted}
                promotionBadgeType={badgeType}
                onNavigatePost={onNavigatePost}
                onCategoryClick={(cat, catName, sub, subName) => {
                  filterByEventCategory(cat || 'all', catName, sub, subName, false);
                }}
                onLocationClick={(loc, reg) => {
                  filterByEventLocation(loc || '', reg, false);
                }}
              />
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {visibleEvents.length > 0 && hasMore && (
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
            <span>{isLoading ? 'Nalaganje dogodkov...' : 'Naloži še dogodkov'}</span>
          </button>
          <span className="font-body-sm text-xs text-outline">
            Prikazano {visibleEvents.length} od {sortedEvents.length} dogodkov
          </span>
        </div>
      )}

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        initialType="event" 
      />
    </div>
  );
}
