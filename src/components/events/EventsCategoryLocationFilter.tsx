import React, { useMemo } from 'react';
import { 
  MapPin, Tag, Layers, RotateCcw, SlidersHorizontal, 
  X, ChevronDown, Calendar, Music, Theater, Trophy, 
  UtensilsCrossed, Smile, Briefcase, Sparkles, PartyPopper
} from 'lucide-react';
import { 
  SLOVENIA_REGIONS, 
  POPULAR_SLOVENIA_TOWNS, 
  CategoryItem, 
  SubCategory, 
  getTertiaryCategories 
} from '../../services/categoryService';

export interface EventsCategoryLocationFilterProps {
  categories: CategoryItem[];
  categoryCounts: Record<string, number>;
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  selectedSubcategory: string;
  onSelectSubcategory: (subcategoryId: string) => void;
  selectedTertiaryCategory: string;
  onSelectTertiaryCategory: (tertiary: string) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  sortOption: string;
  onSelectSortOption: (sort: string) => void;
  totalResultsCount: number;
  onResetFilters: () => void;
  searchQuery?: string;
  selectedDates?: string[];
  datesSummary?: string;
  onClearDates?: () => void;
}

export function EventsCategoryLocationFilter({
  categories,
  categoryCounts,
  selectedCategory,
  onSelectCategory,
  selectedSubcategory,
  onSelectSubcategory,
  selectedTertiaryCategory,
  onSelectTertiaryCategory,
  selectedRegion,
  onSelectRegion,
  sortOption,
  onSelectSortOption,
  totalResultsCount,
  onResetFilters,
  searchQuery = '',
  selectedDates = [],
  datesSummary = '',
  onClearDates,
}: EventsCategoryLocationFilterProps) {
  // Deduplicated list of Slovenian towns for the location dropdown
  const popularTownsList = useMemo(() => {
    const set = new Set<string>();
    POPULAR_SLOVENIA_TOWNS.forEach(t => set.add(t.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'sl'));
  }, []);

  // Find currently active category object
  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return categories.find(c => c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  // Subcategories of active category (or all available when 'all' is selected)
  const availableSubcategories = useMemo(() => {
    if (activeCategoryObj) {
      return activeCategoryObj.subcategories || [];
    }
    const allSubs: SubCategory[] = [];
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

  // Tertiary categories (Žanr / Tip dogodka / Prizorišče / Pod-raven)
  const availableTertiaryList = useMemo(() => {
    return getTertiaryCategories(selectedCategory, selectedSubcategory, categories, 'events');
  }, [selectedCategory, selectedSubcategory, categories]);

  // Contextual labels & icon for 3rd level filter
  const tertiaryConfig = useMemo(() => {
    const catName = (activeCategoryObj?.name || '').toLowerCase();
    const catId = selectedCategory.toLowerCase();
    const subId = selectedSubcategory.toLowerCase();

    if (catId.includes('koncert') || catName.includes('koncert') || catId.includes('zabav') || subId.includes('koncert') || subId.includes('dj')) {
      return {
        label: 'Vsi žanri (Rock, Pop, DJ, Klasika...)',
        placeholder: 'Glasbeni žanr / Tip',
        icon: Music,
      };
    }
    if (catId.includes('kultur') || catName.includes('kultur') || catId.includes('umetnost') || subId.includes('gledalis')) {
      return {
        label: 'Vse zvrsti (Stand-up, Drama, Razstave...)',
        placeholder: 'Kulturna zvrst',
        icon: Theater,
      };
    }
    if (catId.includes('sport') || catName.includes('šport') || subId.includes('maraton') || subId.includes('nogomet')) {
      return {
        label: 'Vse športne panoge (Tek, Kolesarstvo...)',
        placeholder: 'Športna panoga',
        icon: Trophy,
      };
    }
    if (catId.includes('sejm') || catName.includes('sejm') || catId.includes('gastronom') || subId.includes('kulinari')) {
      return {
        label: 'Vsi festivali & sejmi (Odprta kuhna...)',
        placeholder: 'Tip sejma / festivala',
        icon: UtensilsCrossed,
      };
    }
    if (catId.includes('druzina') || catName.includes('družina') || subId.includes('lutk') || subId.includes('otroc')) {
      return {
        label: 'Vsi programi (Lutke, Muzikal, Delavnice...)',
        placeholder: 'Otroški program',
        icon: Smile,
      };
    }
    if (catId.includes('posel') || catName.includes('posel') || subId.includes('konferenc')) {
      return {
        label: 'Vsi dogodki (Konference, IT, Startupi...)',
        placeholder: 'Poslovni dogodek',
        icon: Briefcase,
      };
    }

    return {
      label: 'Vsi žanri & tipi (npr. Rock, Stand-up...)',
      placeholder: 'Žanr / Tip dogodka',
      icon: PartyPopper,
    };
  }, [activeCategoryObj, selectedCategory, selectedSubcategory]);

  // Check if any filter is active
  const hasActiveFilters = 
    selectedCategory !== 'all' || 
    selectedSubcategory !== 'all' || 
    selectedTertiaryCategory !== 'all' ||
    selectedRegion !== 'all' || 
    sortOption !== 'newest' ||
    selectedDates.length > 0 ||
    Boolean(searchQuery);

  // Get active location display name
  const activeLocationName = useMemo(() => {
    if (selectedRegion === 'all') return 'Vsa prizorišča (Vsa Slovenija)';
    if (selectedRegion.startsWith('city-')) {
      return selectedRegion.replace('city-', '');
    }
    const reg = SLOVENIA_REGIONS.find(r => r.id === selectedRegion);
    return reg ? `${reg.name} regija` : selectedRegion;
  }, [selectedRegion]);

  const TertiaryIcon = tertiaryConfig.icon;

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-surface-container/60 shadow-xs p-3.5 sm:p-4 flex flex-col gap-3">
      {/* 1. Main Categories as Prominent Badges */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-outline uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-tertiary-container" />
            <span>Kategorije prireditev</span>
          </div>
          <span className="text-xs text-outline font-medium">
            Zadetkov: <strong className="text-tertiary-container font-bold">{totalResultsCount}</strong>
          </span>
        </div>

        {/* Categories Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              onSelectCategory('all');
              onSelectSubcategory('all');
              onSelectTertiaryCategory('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-tertiary-container text-on-tertiary-container font-bold shadow-xs scale-102 ring-2 ring-tertiary-container/30'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container'
            }`}
          >
            <span>Vsi dogodki</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedCategory === 'all' ? 'bg-white/25 text-white' : 'bg-surface-container-high text-outline'
            }`}>
              {categoryCounts.all || 0}
            </span>
          </button>

          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.id);
                  onSelectSubcategory('all');
                  onSelectTertiaryCategory('all');
                }}
                className={`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-tertiary-container text-on-tertiary-container font-bold shadow-xs scale-102 ring-2 ring-tertiary-container/30'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container'
                }`}
              >
                <span>{cat.icon || '📅'}</span>
                <span>{cat.name}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-surface-container-high text-outline'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Secondary & Tertiary Filters as Compact True Dropdowns Grid */}
      <div className="pt-2 border-t border-surface-container-low">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          
          {/* Dropdown 1: Zvrst / Podkategorija */}
          <div className="relative flex items-center bg-surface-container-low/90 rounded-xl border border-surface-container focus-within:border-tertiary-container focus-within:bg-surface-container-lowest transition-all">
            <Layers className="w-3.5 h-3.5 text-tertiary-container ml-2.5 shrink-0 pointer-events-none" />
            <select
              value={selectedSubcategory}
              onChange={(e) => {
                onSelectSubcategory(e.target.value);
                onSelectTertiaryCategory('all');
              }}
              className="w-full appearance-none bg-transparent pl-2 pr-7 py-2 font-body-sm text-xs text-on-surface focus:outline-none cursor-pointer truncate font-medium"
              title="Izberi zvrst ali podkategorijo"
            >
              <option value="all">
                {activeCategoryObj ? `Vse zvrsti (${activeCategoryObj.name})` : 'Vse zvrsti prireditev'}
              </option>
              {availableSubcategories.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 pointer-events-none" />
          </div>

          {/* Dropdown 2: Žanr / Tip dogodka (3rd level) */}
          <div className="relative flex items-center bg-surface-container-low/90 rounded-xl border border-surface-container focus-within:border-tertiary-container focus-within:bg-surface-container-lowest transition-all">
            <TertiaryIcon className="w-3.5 h-3.5 text-tertiary-container ml-2.5 shrink-0 pointer-events-none" />
            <select
              value={selectedTertiaryCategory}
              onChange={(e) => onSelectTertiaryCategory(e.target.value)}
              className="w-full appearance-none bg-transparent pl-2 pr-7 py-2 font-body-sm text-xs text-on-surface focus:outline-none cursor-pointer truncate font-medium"
              title={tertiaryConfig.placeholder}
            >
              <option value="all">{tertiaryConfig.label}</option>
              {availableTertiaryList.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 pointer-events-none" />
          </div>

          {/* Dropdown 3: Lokacija & Regija */}
          <div className="relative flex items-center bg-surface-container-low/90 rounded-xl border border-surface-container focus-within:border-tertiary-container focus-within:bg-surface-container-lowest transition-all">
            <MapPin className="w-3.5 h-3.5 text-tertiary-container ml-2.5 shrink-0 pointer-events-none" />
            <select
              value={selectedRegion}
              onChange={(e) => onSelectRegion(e.target.value)}
              className="w-full appearance-none bg-transparent pl-2 pr-7 py-2 font-body-sm text-xs text-on-surface focus:outline-none cursor-pointer truncate font-medium"
              title="Izberi prizorišče, regijo ali kraj"
            >
              <option value="all">📍 Vsa prizorišča (Vsa Slovenija)</option>
              <optgroup label="Slovenske statistične regije">
                {SLOVENIA_REGIONS.map(reg => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name} regija ({reg.shortName})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Mesta in kraji">
                {popularTownsList.map(town => (
                  <option key={`city-${town}`} value={`city-${town}`}>
                    {town}
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 pointer-events-none" />
          </div>

          {/* Dropdown 4: Razvrščanje */}
          <div className="relative flex items-center bg-surface-container-low/90 rounded-xl border border-surface-container focus-within:border-tertiary-container focus-within:bg-surface-container-lowest transition-all">
            <SlidersHorizontal className="w-3.5 h-3.5 text-tertiary-container ml-2.5 shrink-0 pointer-events-none" />
            <select
              value={sortOption}
              onChange={(e) => onSelectSortOption(e.target.value)}
              className="w-full appearance-none bg-transparent pl-2 pr-7 py-2 font-body-sm text-xs text-on-surface focus:outline-none cursor-pointer truncate font-medium"
              title="Razvrščanje dogodkov"
            >
              <option value="newest">Kmalu na sporedu / Najnovejši</option>
              <option value="popular">Najbolj priljubljeni</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Active Filters Inline Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-2 border-t border-surface-container-low text-xs animate-in fade-in duration-150">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Aktivno:</span>
            
            {/* Selected dates summary pill */}
            {selectedDates.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-tertiary-container/15 text-tertiary-container text-[11px] font-bold border border-tertiary-container/30">
                <Calendar className="w-3 h-3" />
                <span>{datesSummary}</span>
                {onClearDates && (
                  <button 
                    type="button" 
                    onClick={onClearDates} 
                    className="hover:text-error cursor-pointer"
                    title="Odstrani filter datumov"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )}

            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-tertiary-container/15 text-tertiary-container text-[11px] font-bold border border-tertiary-container/30">
                <span>{activeCategoryObj?.name || selectedCategory}</span>
                <button 
                  type="button" 
                  onClick={() => { 
                    onSelectCategory('all'); 
                    onSelectSubcategory('all'); 
                    onSelectTertiaryCategory('all');
                  }} 
                  className="hover:text-error cursor-pointer"
                  title="Odstrani filter kategorije"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSubcategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-tertiary-container/15 text-tertiary-container text-[11px] font-bold border border-tertiary-container/30">
                <span>{availableSubcategories.find(s => s.id === selectedSubcategory)?.name || selectedSubcategory}</span>
                <button 
                  type="button" 
                  onClick={() => {
                    onSelectSubcategory('all');
                    onSelectTertiaryCategory('all');
                  }} 
                  className="hover:text-error cursor-pointer"
                  title="Odstrani filter zvrsti"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTertiaryCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-tertiary-container text-on-tertiary-container font-bold text-[11px] shadow-2xs">
                <span>{selectedTertiaryCategory}</span>
                <button 
                  type="button" 
                  onClick={() => onSelectTertiaryCategory('all')} 
                  className="hover:text-amber-200 cursor-pointer"
                  title="Odstrani filter žanra"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedRegion !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary/15 text-secondary text-[11px] font-semibold">
                <span>{activeLocationName}</span>
                <button 
                  type="button" 
                  onClick={() => onSelectRegion('all')} 
                  className="hover:text-error cursor-pointer"
                  title="Odstrani filter prizorišča"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {sortOption !== 'newest' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-semibold">
                <span>Priljubljeni</span>
                <button 
                  type="button" 
                  onClick={() => onSelectSortOption('newest')} 
                  className="hover:text-error cursor-pointer"
                  title="Ponastavi razvrščanje"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={onResetFilters}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-error hover:underline cursor-pointer px-1 py-0.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ponastavi vse</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
