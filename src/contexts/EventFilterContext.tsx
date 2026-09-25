import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { 
  getTodayYmd, 
  getUpcomingWeekendDates, 
  formatSelectedDatesSummary, 
  extractCityOrRegion,
  navigateToEventsView 
} from '../utils/eventFilterUtils';

export interface EventFilterContextType {
  selectedDates: string[];
  toggleDate: (dateStr: string, autoNavigate?: boolean) => void;
  setSelectedDates: (dates: string[], autoNavigate?: boolean) => void;
  clearDates: () => void;
  selectToday: (autoNavigate?: boolean) => void;
  selectWeekend: (autoNavigate?: boolean) => void;

  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (sub: string) => void;
  selectedRegion: string;
  setSelectedRegion: (reg: string) => void;
  locationFilter: string;
  setLocationFilter: (loc: string) => void;

  filterByEventCategory: (
    category: string, 
    categoryName?: string, 
    subcategory?: string, 
    subcategoryName?: string, 
    autoNavigate?: boolean
  ) => void;
  filterByEventLocation: (location: string, region?: string, autoNavigate?: boolean) => void;

  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  datesSummary: string;
}

const EventFilterContext = createContext<EventFilterContextType | undefined>(undefined);

export const EventFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedDates, setSelectedDatesState] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('');

  const toggleDate = (dateStr: string, autoNavigate = true) => {
    setSelectedDatesState(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
    if (autoNavigate) {
      navigateToEventsView();
    }
  };

  const setSelectedDates = (dates: string[], autoNavigate = true) => {
    setSelectedDatesState(dates);
    if (autoNavigate) {
      navigateToEventsView();
    }
  };

  const clearDates = () => {
    setSelectedDatesState([]);
  };

  const selectToday = (autoNavigate = true) => {
    const today = getTodayYmd();
    setSelectedDatesState([today]);
    if (autoNavigate) {
      navigateToEventsView();
    }
  };

  const selectWeekend = (autoNavigate = true) => {
    const weekend = getUpcomingWeekendDates();
    setSelectedDatesState(weekend);
    if (autoNavigate) {
      navigateToEventsView();
    }
  };

  const filterByEventCategory = (
    category: string,
    categoryName?: string,
    subcategory?: string,
    subcategoryName?: string,
    autoNavigate = true
  ) => {
    const targetCat = category || (categoryName ? categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'all');
    setSelectedCategory(targetCat);
    if (subcategory) {
      setSelectedSubcategory(subcategory);
    } else if (subcategoryName) {
      setSelectedSubcategory(subcategoryName);
    } else {
      setSelectedSubcategory('all');
    }
    if (autoNavigate) {
      navigateToEventsView();
    }
  };

  const filterByEventLocation = (location: string, region?: string, autoNavigate = true) => {
    const { city, regionId } = extractCityOrRegion(location || region);
    if (city) {
      setLocationFilter(city);
    } else if (location) {
      setLocationFilter(location.trim());
    }
    if (regionId) {
      setSelectedRegion(regionId);
    }
    if (autoNavigate) {
      navigateToEventsView();
    }
  };

  const clearAllFilters = () => {
    setSelectedDatesState([]);
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedRegion('all');
    setLocationFilter('');
  };

  const datesSummary = useMemo(() => {
    return formatSelectedDatesSummary(selectedDates);
  }, [selectedDates]);

  const activeFilterCount = useMemo(() => {
    let count = selectedDates.length;
    if (selectedCategory !== 'all') count++;
    if (selectedSubcategory !== 'all') count++;
    if (selectedRegion !== 'all') count++;
    if (locationFilter.trim()) count++;
    return count;
  }, [selectedDates, selectedCategory, selectedSubcategory, selectedRegion, locationFilter]);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <EventFilterContext.Provider
      value={{
        selectedDates,
        toggleDate,
        setSelectedDates,
        clearDates,
        selectToday,
        selectWeekend,
        selectedCategory,
        setSelectedCategory,
        selectedSubcategory,
        setSelectedSubcategory,
        selectedRegion,
        setSelectedRegion,
        locationFilter,
        setLocationFilter,
        filterByEventCategory,
        filterByEventLocation,
        clearAllFilters,
        hasActiveFilters,
        activeFilterCount,
        datesSummary,
      }}
    >
      {children}
    </EventFilterContext.Provider>
  );
};

export function useEventFilter() {
  const context = useContext(EventFilterContext);
  if (!context) {
    throw new Error('useEventFilter must be used within an EventFilterProvider');
  }
  return context;
}
