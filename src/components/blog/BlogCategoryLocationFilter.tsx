import React, { useMemo } from 'react';
import { 
  MapPin, Tag, Layers, RotateCcw, SlidersHorizontal, 
  X, ChevronDown, BookOpen, Sparkles, Mountain, Utensils, 
  Cpu, Home, TrendingUp, HeartPulse, FileText, ArrowUpDown
} from 'lucide-react';
import { 
  SLOVENIA_REGIONS, 
  POPULAR_SLOVENIA_TOWNS, 
  CategoryItem, 
  SubCategory, 
  getTertiaryCategories 
} from '../../services/categoryService';

export interface BlogCategoryLocationFilterProps {
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
}

export function BlogCategoryLocationFilter({
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
}: BlogCategoryLocationFilterProps) {
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

  // Tertiary categories (Zvrst / Ključna tema / Oznaka / Pod-raven)
  const availableTertiaryList = useMemo(() => {
    return getTertiaryCategories(selectedCategory, selectedSubcategory, categories);
  }, [selectedCategory, selectedSubcategory, categories]);

  // Contextual labels & icon for 3rd level filter
  const tertiaryConfig = useMemo(() => {
    const catName = (activeCategoryObj?.name || '').toLowerCase();
    const catId = selectedCategory.toLowerCase();
    const subId = selectedSubcategory.toLowerCase();

    if (catId.includes('turiz') || catName.includes('turiz') || subId.includes('izlet') || subId.includes('biser') || subId.includes('hrib')) {
      return {
        label: 'Vse destinacije & izleti (npr. Bled, Soča, Kranjska Gora...)',
        placeholder: 'Destinacija / Izlet',
        icon: Mountain,
      };
    }
    if (catId.includes('kulinari') || catName.includes('kulinarik') || subId.includes('recept') || subId.includes('jed')) {
      return {
        label: 'Vse jedi & recepti (npr. Potica, Gibanica, Hitra kosila...)',
        placeholder: 'Tip jedi / Recept',
        icon: Utensils,
      };
    }
    if (catId.includes('tehnolog') || catName.includes('tehnolog') || subId.includes('inteligen') || subId.includes('gadget')) {
      return {
        label: 'Vse tehnologije (npr. AI orodja, iPhone, Pametni dom...)',
        placeholder: 'Tehnologija / AI',
        icon: Cpu,
      };
    }
    if (catId.includes('dom') || catName.includes('dom') || subId.includes('prenov') || subId.includes('diy') || subId.includes('vrt')) {
      return {
        label: 'Vse teme za dom (npr. DIY vodiči, Prenova, Visoke grede...)',
        placeholder: 'Tema doma & vrta',
        icon: Home,
      };
    }
    if (catId.includes('financ') || catName.includes('financ') || subId.includes('osebn') || subId.includes('investic')) {
      return {
        label: 'Vse finance (npr. Varčevanje, ETF skladi, Nepremičnine...)',
        placeholder: 'Finančna tema',
        icon: TrendingUp,
      };
    }
    if (catId.includes('zdravj') || catName.includes('zdravj') || subId.includes('slog') || subId.includes('stres')) {
      return {
        label: 'Vse teme zdravja (npr. Vitalnost, Zelišča, Premagovanje stresa...)',
        placeholder: 'Tema počutja',
        icon: HeartPulse,
      };
    }

    return {
      label: 'Vse podteme & ključne oznake',
      placeholder: 'Podtema / Ključna tema',
      icon: SlidersHorizontal,
    };
  }, [activeCategoryObj, selectedCategory, selectedSubcategory]);

  const activeSubcategoryName = useMemo(() => {
    if (selectedSubcategory === 'all') return null;
    const found = availableSubcategories.find(s => s.id === selectedSubcategory || s.name.toLowerCase() === selectedSubcategory.toLowerCase());
    return found ? found.name : selectedSubcategory;
  }, [availableSubcategories, selectedSubcategory]);

  const activeRegionName = useMemo(() => {
    if (selectedRegion === 'all') return null;
    const reg = SLOVENIA_REGIONS.find(r => r.id === selectedRegion);
    if (reg) return reg.name;
    return selectedRegion;
  }, [selectedRegion]);

  const hasActiveFilters = selectedCategory !== 'all' || 
                           selectedSubcategory !== 'all' || 
                           selectedTertiaryCategory !== 'all' || 
                           selectedRegion !== 'all' || 
                           sortOption !== 'newest' || 
                           Boolean(searchQuery.trim());

  return (
    <div className="flex flex-col gap-2.5 bg-surface-container-lowest p-3 sm:p-4 rounded-2xl shadow-xs border border-surface-container/60 transition-all">
      
      {/* 1. LEVEL: MAIN CATEGORY BADGES */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-primary" />
            <span>Kategorije bloga:</span>
          </span>
          <span className="text-[11px] text-outline">
            {totalResultsCount} {totalResultsCount === 1 ? 'članek' : totalResultsCount === 2 ? 'članka' : totalResultsCount === 3 || totalResultsCount === 4 ? 'članki' : 'člankov'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin no-scrollbar">
          {/* All topics badge */}
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-surface-container/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Vsi članki</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-outline'
            }`}>
              {categoryCounts.all ?? totalResultsCount}
            </span>
          </button>

          {/* Individual Category Badges */}
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-surface-container/50'
                }`}
              >
                <span>{cat.icon || '📝'}</span>
                <span>{cat.name}</span>
                {count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-surface-container-high text-outline'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. LEVEL: COMPACT DROPDOWN FILTERS GRID (Subcategory, 3rd Level, Location, Sort) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 border-t border-surface-container-low/70">
        
        {/* Dropdown 1: Podkategorija / Podtema */}
        <div className="relative flex-1">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-outline flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-primary" />
          </div>
          <select
            value={selectedSubcategory}
            onChange={(e) => onSelectSubcategory(e.target.value)}
            disabled={availableSubcategories.length === 0}
            className={`w-full appearance-none pl-8 pr-7 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:border-primary border cursor-pointer ${
              selectedSubcategory !== 'all'
                ? 'bg-primary/5 text-primary border-primary/40 font-bold'
                : 'bg-surface-container-low text-on-surface border-surface-container/60 hover:bg-surface-container'
            } disabled:opacity-50`}
          >
            <option value="all">
              {activeCategoryObj ? `Vse podteme (${activeCategoryObj.name})` : 'Vse podteme bloga'}
            </option>
            {availableSubcategories.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown 2: 3. stopnja – Zvrst / Ključna tema / Oznaka / Destinacija */}
        <div className="relative flex-1">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-outline flex items-center gap-1">
            <tertiaryConfig.icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <select
            value={selectedTertiaryCategory}
            onChange={(e) => onSelectTertiaryCategory(e.target.value)}
            className={`w-full appearance-none pl-8 pr-7 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:border-primary border cursor-pointer ${
              selectedTertiaryCategory !== 'all'
                ? 'bg-primary/5 text-primary border-primary/40 font-bold'
                : 'bg-surface-container-low text-on-surface border-surface-container/60 hover:bg-surface-container'
            }`}
          >
            <option value="all">{tertiaryConfig.label}</option>
            {availableTertiaryList.map((item, idx) => (
              <option key={idx} value={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown 3: Lokacija & Regija */}
        <div className="relative flex-1">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-outline flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => onSelectRegion(e.target.value)}
            className={`w-full appearance-none pl-8 pr-7 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:border-primary border cursor-pointer ${
              selectedRegion !== 'all'
                ? 'bg-primary/5 text-primary border-primary/40 font-bold'
                : 'bg-surface-container-low text-on-surface border-surface-container/60 hover:bg-surface-container'
            }`}
          >
            <option value="all">Vsa Slovenija (Vse regije)</option>
            <optgroup label="Slovenske statistične regije">
              {SLOVENIA_REGIONS.map(reg => (
                <option key={reg.id} value={reg.id}>
                  {reg.shortName || reg.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Večja slovenska mesta">
              {popularTownsList.map(town => (
                <option key={town} value={town}>
                  {town}
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown 4: Razvrščanje */}
        <div className="relative flex-1">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-outline flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
          </div>
          <select
            value={sortOption}
            onChange={(e) => onSelectSortOption(e.target.value)}
            className="w-full appearance-none pl-8 pr-7 py-2 rounded-xl text-xs font-semibold bg-surface-container-low text-on-surface border border-surface-container/60 hover:bg-surface-container focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="newest">Najnovejši članki najprej</option>
            <option value="popular">Najbolj brani & priljubljeni</option>
            <option value="comments">Največ komentarjev</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 3. LEVEL: ACTIVE FILTER SUMMARY BAR */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low/70 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-outline mr-0.5">Aktivni filtri:</span>

            {/* Category Chip */}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                <span>{activeCategoryObj?.name || selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => onSelectCategory('all')}
                  className="hover:text-primary-container p-0.5 cursor-pointer"
                  title="Odstrani kategorijo"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Subcategory Chip */}
            {selectedSubcategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                <Tag className="w-2.5 h-2.5" />
                <span>{activeSubcategoryName}</span>
                <button
                  type="button"
                  onClick={() => onSelectSubcategory('all')}
                  className="hover:text-primary-container p-0.5 cursor-pointer"
                  title="Odstrani podkategorijo"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Tertiary / 3rd level Chip */}
            {selectedTertiaryCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                <SlidersHorizontal className="w-2.5 h-2.5" />
                <span>{selectedTertiaryCategory}</span>
                <button
                  type="button"
                  onClick={() => onSelectTertiaryCategory('all')}
                  className="hover:text-primary-container p-0.5 cursor-pointer"
                  title="Odstrani filter 3. nivoja"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Region Chip */}
            {selectedRegion !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                <MapPin className="w-2.5 h-2.5" />
                <span>{activeRegionName}</span>
                <button
                  type="button"
                  onClick={() => onSelectRegion('all')}
                  className="hover:text-primary-container p-0.5 cursor-pointer"
                  title="Odstrani lokacijo"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Search Query Chip */}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-medium">
                <span>Iskanje: &quot;{searchQuery}&quot;</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11px] font-bold text-outline hover:text-primary flex items-center gap-1 py-0.5 px-1.5 rounded-md hover:bg-surface-container transition-colors cursor-pointer shrink-0 ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Ponastavi vse</span>
          </button>
        </div>
      )}
    </div>
  );
}
