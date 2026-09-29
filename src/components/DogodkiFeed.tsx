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
import { SLOVENIA_REGIONS, POPULAR_SLOVENIA_TOWNS } from '../services/categoryService';
import { PromotedBadge } from './common/PromotedBadge';
import { EventPost } from './posts/EventPost';
import { isItemActivelyPromoted } from '../services/promotionService';
import { parseEventDateInfo } from '../utils/dateUtils';
import { useEventFilter } from '../contexts/EventFilterContext';
import { extractEventDateStrings } from '../utils/eventFilterUtils';
import { EventCalendarWidget } from './common/EventCalendarWidget';
import { EventsCategoryLocationFilter } from './events/EventsCategoryLocationFilter';

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
  const [selectedTertiaryCategory, setSelectedTertiaryCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');

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
    setSelectedTertiaryCategory('all');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedTertiaryCategory('all');
    setSelectedRegion('all');
    setLocationFilter('');
    clearDates();
    setSortOption('newest');
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

      // 3rd Level Category / Genre / Venue / Type filter (e.g. Rock, Stand-up, Maraton, Odprta kuhna)
      let matchesTertiary = true;
      if (selectedTertiaryCategory !== 'all') {
        const target = selectedTertiaryCategory.toLowerCase().trim();
        const evTitle = (event.title || '').toLowerCase();
        const evDesc = (event.description || '').toLowerCase();
        const evTags = Array.isArray((event as any).tags) 
          ? ((event as any).tags as string[]).map(t => String(t).toLowerCase()).join(' ') 
          : String((event as any).tags || '').toLowerCase();
        const evThird = String((event as any).thirdLevelCategory || (event as any).genre || (event as any).eventType || '').toLowerCase();

        matchesTertiary = 
          evTitle.includes(target) ||
          evDesc.includes(target) ||
          evTags.includes(target) ||
          evThird.includes(target) ||
          (target.includes('rock') && (evTitle.includes('rock') || evDesc.includes('rock') || evTitle.includes('metal') || evDesc.includes('metal'))) ||
          (target.includes('stand-up') && (evTitle.includes('stand-up') || evTitle.includes('stand up') || evTitle.includes('komedij') || evDesc.includes('stand-up'))) ||
          (target.includes('odprta kuhna') && (evTitle.includes('kuhna') || evDesc.includes('kuhna') || evTitle.includes('kulinari')));
      }

      // Extract all locations (main location + any per-slot locations)
      const allLocations = [
        event.location || '',
        ...(Array.isArray(event.eventSchedule) ? event.eventSchedule.map((s: any) => s.location || '') : [])
      ].map(l => l.toLowerCase().trim()).filter(Boolean);

      // Region & City/Town filter
      let matchesReg = false;
      if (selectedRegion === 'all') {
        matchesReg = true;
      } else {
        const target = selectedRegion.toLowerCase().trim();
        const evReg = (event.region || '').toLowerCase().trim();

        if (target.startsWith('city-')) {
          const cleanCity = target.replace('city-', '').trim().toLowerCase();
          if (allLocations.some(l => l.includes(cleanCity)) || evReg.includes(cleanCity)) {
            matchesReg = true;
          }
        } else {
          if (evReg.includes(target) || allLocations.some(l => l.includes(target))) {
            matchesReg = true;
          } else {
            const regObj = SLOVENIA_REGIONS.find(r => r.id === selectedRegion);
            if (regObj) {
              if (evReg.includes(regObj.id) || evReg.includes(regObj.name.toLowerCase()) || evReg.includes(regObj.shortName.toLowerCase())) {
                matchesReg = true;
              } else {
                for (const city of regObj.cities) {
                  const cLower = city.toLowerCase();
                  if (allLocations.some(l => l.includes(cLower)) || evReg.includes(cLower)) {
                    matchesReg = true;
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // 1. Date Filtering (Koledar prireditev multi-date filter)
      const eventDates = extractEventDateStrings(event);
      const matchesDates = selectedDates.length === 0 ||
        selectedDates.some(selDate => eventDates.includes(selDate));

      // 2. Location / Venue Keyword Filtering
      const targetLocLower = locationFilter.toLowerCase().trim();
      const matchesLocation = !targetLocLower ||
        allLocations.some(l => l.includes(targetLocLower)) ||
        (event.region && event.region.toLowerCase().includes(targetLocLower)) ||
        (event.title && event.title.toLowerCase().includes(targetLocLower));

      return matchesSearch && matchesCat && matchesSubcat && matchesTertiary && matchesReg && matchesDates && matchesLocation;
    });
  }, [
    firestoreEvents, 
    searchQuery, 
    selectedCategory, 
    activeCategoryObj, 
    selectedSubcategory, 
    selectedSubcatObj, 
    selectedTertiaryCategory,
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

      if (sortOption === 'popular') {
        const likesA = (a.data.likesCount || 0);
        const likesB = (b.data.likesCount || 0);
        return likesB - likesA;
      }
      return 0;
    });
    return copy;
  }, [allEvents, selectedCategory, selectedSubcategory, sortOption]);

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
              <PartyPopper className="w-[1em] h-[1em] text-tertiary-container shrink-0" />
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
              <Calendar className="w-4 h-4 text-tertiary-container" />
              <span>{selectedDates.length > 0 ? `Koledar (${selectedDates.length})` : 'Koledar'}</span>
            </button>
            <button 
              onClick={() => setIsComposeOpen(true)}
              className="flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl bg-tertiary-container hover:bg-tertiary-container/90 text-on-tertiary-container font-label-md text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
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

      {/* Dedicated Category Badges and Dropdown Filter Component */}
      <EventsCategoryLocationFilter
        categories={categories}
        categoryCounts={categoryCounts}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          setSelectedSubcategory('all');
          setSelectedTertiaryCategory('all');
          setPage(1);
        }}
        selectedSubcategory={selectedSubcategory}
        onSelectSubcategory={(subId) => {
          setSelectedSubcategory(subId);
          setSelectedTertiaryCategory('all');
          setPage(1);
        }}
        selectedTertiaryCategory={selectedTertiaryCategory}
        onSelectTertiaryCategory={(tertiary) => {
          setSelectedTertiaryCategory(tertiary);
          setPage(1);
        }}
        selectedRegion={selectedRegion}
        onSelectRegion={(reg) => {
          setSelectedRegion(reg);
          setPage(1);
        }}
        sortOption={sortOption}
        onSelectSortOption={(sort) => {
          setSortOption(sort);
          setPage(1);
        }}
        totalResultsCount={filteredFirestore.length}
        onResetFilters={handleResetFilters}
        searchQuery={searchQuery}
        selectedDates={selectedDates}
        datesSummary={datesSummary}
        onClearDates={clearDates}
      />

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
                className="px-4 py-2 rounded-xl bg-tertiary-container text-on-tertiary-container font-label-md text-xs font-bold transition-all shadow-sm cursor-pointer hover:bg-tertiary-container/90"
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
                authorId={event.authorId}
                authorAvatar={event.authorAvatar}
                authorRole={event.authorRole}
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
