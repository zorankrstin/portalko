import React, { useState, useEffect, useMemo } from 'react';
import { ShareMenu } from "./ShareMenu";
import { BookmarkButton } from "./BookmarkButton";
import { ReportButton } from "./ReportButton";
import { Search, ChevronDown, PlusCircle, Star, Phone, MapPin, Building2, Car, Sparkles, ShoppingBag, Tag, Layers, Globe, Filter } from 'lucide-react';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { subscribeToAds, FirestoreAd } from '../services/firestoreService';
import { ComposeModal } from './ComposeModal';
import { INITIAL_ADS, MockAdItem } from '../data/mockFeedData';
import { PostDetailTarget } from '../types';
import { useCategories } from '../hooks/useCategories';
import { SLOVENIA_REGIONS } from '../services/categoryService';
import { PromotedBadge } from './common/PromotedBadge';
import { isItemActivelyPromoted } from '../services/promotionService';

interface MaliOglasiFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function MaliOglasiFeed({ onViewChange, searchQuery = '', onNavigatePost }: MaliOglasiFeedProps) {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  
  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');

  // Load dynamic categories for ads
  const { categories } = useCategories('ads');

  useEffect(() => {
    const unsub = subscribeToAds((ads) => {
      setFirestoreAds(ads);
    });
    return () => unsub();
  }, []);

  // Find currently active category object
  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return categories.find(c => c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  // Handle category pill change
  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('all');
    setPage(1);
  };

  // Filter Firestore ads
  const filteredFirestore = firestoreAds.filter(ad => {
    const textToMatch = `${ad.title} ${ad.description} ${ad.category} ${ad.categoryName || ''} ${ad.subcategory || ''} ${ad.subcategoryName || ''} ${ad.location || ''} ${ad.region || ''}`;
    const matchesSearch = matchesSearchAndCategory(textToMatch, 'ads', searchQuery);
    
    // Category match
    const matchesCat = selectedCategory === 'all' || 
      ad.category === selectedCategory ||
      (activeCategoryObj && (
        ad.category?.toLowerCase() === activeCategoryObj.name.toLowerCase() ||
        ad.categoryName?.toLowerCase() === activeCategoryObj.name.toLowerCase()
      ));

    // Subcategory match
    const matchesSubcat = selectedSubcategory === 'all' || 
      ad.subcategory === selectedSubcategory ||
      (ad.subcategoryName && ad.subcategoryName.toLowerCase() === selectedSubcategory.toLowerCase());

    // Region match
    const matchesReg = selectedRegion === 'all' ||
      (ad.region && ad.region.toLowerCase().includes(selectedRegion.toLowerCase())) ||
      (ad.location && ad.location.toLowerCase().includes(selectedRegion.toLowerCase()));

    return matchesSearch && matchesCat && matchesSubcat && matchesReg;
  });

  // Filter mock ads
  const filteredMock = INITIAL_ADS.filter(ad => {
    if (firestoreAds.some(f => f.id === ad.id)) return false;
    const textToMatch = `${ad.title} ${ad.description} ${ad.categoryName} ${ad.location}`;
    const matchesSearch = matchesSearchAndCategory(textToMatch, 'ads', searchQuery);
    
    // Mock category mapping
    const matchesCat = selectedCategory === 'all' || 
      ad.category === selectedCategory ||
      (activeCategoryObj && ad.categoryName.toLowerCase().includes(activeCategoryObj.name.toLowerCase()));

    // Region match
    const matchesReg = selectedRegion === 'all' || 
      ad.location.toLowerCase().includes(selectedRegion.toLowerCase());

    return matchesSearch && matchesCat && matchesReg;
  });

  // Unified items
  type UnifiedAd = 
    | { type: 'firestore'; data: FirestoreAd }
    | { type: 'mock'; data: MockAdItem };

  const allAds: UnifiedAd[] = [
    ...filteredFirestore.map(a => ({ type: 'firestore' as const, data: a })),
    ...filteredMock.map(a => ({ type: 'mock' as const, data: a }))
  ];

  // Helper to check promotion status
  const checkAdPromoted = (item: UnifiedAd): boolean => {
    if (item.type !== 'firestore') return false;
    const ad = item.data;
    if (ad.promotion) {
      return isItemActivelyPromoted(ad.promotion, 'mali-oglasi', selectedCategory, selectedSubcategory);
    }
    if (ad.isPromoted) {
      if (ad.promotedUntil) {
        return new Date(ad.promotedUntil).getTime() > Date.now();
      }
      return true;
    }
    return false;
  };

  // Sorting: ALWAYS put actively promoted (PROMO / OGLAS) items at the very top of the feed
  allAds.sort((a, b) => {
    const aPromoted = checkAdPromoted(a);
    const bPromoted = checkAdPromoted(b);

    if (aPromoted && !bPromoted) return -1;
    if (!aPromoted && bPromoted) return 1;

    // If both or neither are promoted, sort according to selected option
    if (sortOption === 'price-asc') {
      const priceA = parseFloat((a.data.price || '').replace(/[^0-9.]/g, '')) || 0;
      const priceB = parseFloat((b.data.price || '').replace(/[^0-9.]/g, '')) || 0;
      return priceA - priceB;
    } else if (sortOption === 'price-desc') {
      const priceA = parseFloat((a.data.price || '').replace(/[^0-9.]/g, '')) || 0;
      const priceB = parseFloat((b.data.price || '').replace(/[^0-9.]/g, '')) || 0;
      return priceB - priceA;
    }
    return 0;
  });

  const PAGE_SIZE = 10;
  const currentLimit = page * PAGE_SIZE;

  // Paginated items generator - supports continuous 10-item increments
  const getPagedAds = (): UnifiedAd[] => {
    if (allAds.length === 0) return [];
    if (currentLimit <= allAds.length) {
      return allAds.slice(0, currentLimit);
    }
    const result: UnifiedAd[] = [...allAds];
    let counter = 1;
    while (result.length < currentLimit) {
      for (const item of allAds) {
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

  const visibleAds = getPagedAds();

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
              <ShoppingBag className="w-[1em] h-[1em] text-primary shrink-0" />
              <span>Mali oglasi v Sloveniji</span>
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
              Poiščite ali objavite rabljene in nove predmete, nepremičnine, vozila ter opremo po vsej Sloveniji.
            </p>
          </div>
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Objavi oglas</span>
          </button>
        </div>
      </div>

      {/* Main Categories Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => handleCategorySelect('all')}
          className={`px-3.5 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors shadow-sm cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-primary text-on-primary font-bold'
              : 'bg-surface-container-lowest hover:bg-surface-container border border-surface-container text-on-surface-variant'
          }`}
        >
          Vsi oglasi
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
            <span>{cat.icon || '📁'}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Dynamic Subcategories Pills (when a category with subcategories is selected) */}
      {activeCategoryObj && activeCategoryObj.subcategories && activeCategoryObj.subcategories.length > 0 && (
        <div className="bg-surface-container-low/60 p-2 rounded-xl border border-surface-container/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="text-[11px] font-semibold text-outline uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-primary" />
            <span>Podkategorije:</span>
          </div>
          <button
            onClick={() => { setSelectedSubcategory('all'); setPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
              selectedSubcategory === 'all'
                ? 'bg-surface-container-lowest text-primary font-bold shadow-xs border border-surface-container'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            Vse podkategorije
          </button>
          {activeCategoryObj.subcategories.map(sub => (
            <button
              key={sub.id}
              onClick={() => { setSelectedSubcategory(sub.id); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
                selectedSubcategory === sub.id
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-xs border border-surface-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter Row: Slovenian Region & Sorting */}
      <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-sm border border-surface-container/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <MapPin className="w-4 h-4 text-outline shrink-0" />
          <select 
            value={selectedRegion}
            onChange={(e) => { setSelectedRegion(e.target.value); setPage(1); }}
            className="bg-surface-container-low text-on-surface font-label-md text-xs px-2.5 py-1.5 rounded-lg focus:outline-none flex-1 cursor-pointer"
          >
            <option value="all">Vsa Slovenija (Vse regije)</option>
            {SLOVENIA_REGIONS.map(reg => (
              <option key={reg.id} value={reg.id}>
                {reg.name} ({reg.cities.slice(0, 2).join(', ')})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body-sm text-xs text-outline hidden sm:inline">Razvrsti:</span>
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-surface-container-low text-on-surface font-label-md text-xs px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="newest">Najnovejši oglasi</option>
            <option value="price-asc">Cena: najnižja najprej</option>
            <option value="price-desc">Cena: najvišja najprej</option>
          </select>
        </div>
      </div>

      {/* Ads List */}
      <div className="flex flex-col gap-space-md">
        {visibleAds.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50">
            Ni najdenih oglasov za izbrane kriterije (kategorija, podkategorija ali regija).
          </div>
        ) : (
          visibleAds.map((item) => {
            if (item.type === 'firestore') {
              const ad = item.data;
              const isPromoted = checkAdPromoted(item);
              const badgeType = ad.promotionBadgeType || ad.promotion?.badgeType || 'PROMO';

              return (
                <article key={ad.id} className={`bg-surface-container-lowest rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row ${
                  isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/50'
                }`}>
                  {ad.imageUrl && (
                    <a 
                      href={`#ad-${ad.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.hash = `ad-${ad.id}`;
                      }}
                      className="sm:w-56 h-48 sm:h-auto bg-surface-container shrink-0 relative block cursor-pointer group"
                      title="Odpri samostojno stran tega oglasa"
                    >
                      <img alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={ad.imageUrl} />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                        {isPromoted && (
                          <PromotedBadge type={badgeType} size="sm" />
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary font-label-caps text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          {ad.categoryName || ad.category || 'Mali oglas'}
                        </span>
                      </div>
                      {ad.subcategoryName && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white font-label-caps text-[9px] font-semibold backdrop-blur-xs">
                          {ad.subcategoryName}
                        </span>
                      )}
                    </a>
                  )}
                  <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-label-caps text-[10px] text-outline flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" /> {ad.location || ad.region || 'Slovenija'}
                        </span>
                        <div className="flex items-center gap-1">
                          <BookmarkButton 
                            id={ad.id}
                            data={{
                              id: ad.id,
                              type: 'ad',
                              title: ad.title,
                              description: ad.description,
                              category: ad.categoryName || ad.category,
                              location: ad.location || ad.region,
                              price: ad.price,
                              imageUrl: ad.imageUrl,
                              author: ad.authorName
                            }}
                          />
                          <ShareMenu 
                            title={ad.title}
                            description={ad.description}
                            type="ad"
                            id={ad.id}
                          />
                          <ReportButton 
                            targetId={ad.id} 
                            targetType="ad" 
                            targetTitle={ad.title} 
                            targetAuthor={ad.authorName} 
                          />
                        </div>
                      </div>
                      <h2 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface mt-1 hover:text-primary transition-colors cursor-pointer">
                        <a 
                          href={`#ad-${ad.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = `ad-${ad.id}`;
                          }}
                        >
                          {ad.title}
                        </a>
                      </h2>
                      <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 mt-1">
                        {ad.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low">
                      <div className="flex flex-col">
                        <span className="font-headline-md text-base sm:text-lg font-black text-primary">
                          {ad.price || 'Po dogovoru'}
                        </span>
                        <span className="text-[10px] text-outline flex items-center gap-1">
                          <span>Objavil:</span>
                          <a
                            href={`#author-${encodeURIComponent((ad.authorName || 'Uporabnik').replace(/\s+/g, '_'))}`}
                            className="font-semibold text-on-surface hover:text-primary hover:underline transition-colors"
                            title={`Ogled profila: ${ad.authorName || 'Uporabnik'}`}
                          >
                            {ad.authorName || 'Uporabnik'}
                          </a>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShareMenu 
                          title={ad.title}
                          description={ad.description}
                          type="ad"
                          id={ad.id}
                          showLabel={true}
                          buttonClassName="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container"
                        />
                        <button 
                          onClick={() => {
                            window.location.hash = `ad-${ad.id}`;
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Kontakt</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            }

            // Mock ad item
            const ad = item.data;
            return (
              <article key={ad.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container/50 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row">
                <a 
                  href={`#ad-${ad.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = `ad-${ad.id}`;
                  }}
                  className="sm:w-56 h-48 sm:h-auto bg-surface-container shrink-0 relative block cursor-pointer group"
                  title="Odpri samostojno stran tega oglasa"
                >
                  <img alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={ad.image} />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-on-primary font-label-caps text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    {ad.categoryName}
                  </span>
                </a>
                <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-label-caps text-[10px] text-outline flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" /> {ad.location}
                      </span>
                      <div className="flex items-center gap-1">
                        <BookmarkButton 
                          id={ad.id}
                          data={{
                            id: ad.id,
                            type: 'ad',
                            title: ad.title,
                            description: ad.description,
                            category: ad.categoryName,
                            location: ad.location,
                            price: ad.price,
                            imageUrl: ad.image,
                            author: ad.author
                          }}
                        />
                        <ShareMenu 
                          title={ad.title}
                          description={ad.description}
                          type="ad"
                          id={ad.id}
                        />
                        <ReportButton 
                          targetId={ad.id} 
                          targetType="ad" 
                          targetTitle={ad.title} 
                          targetAuthor={ad.author} 
                        />
                      </div>
                    </div>
                    <h2 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface mt-1 hover:text-primary transition-colors cursor-pointer">
                      <a 
                        href={`#ad-${ad.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.hash = `ad-${ad.id}`;
                        }}
                      >
                        {ad.title}
                      </a>
                    </h2>
                    <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 mt-1">
                      {ad.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low">
                    <div className="flex flex-col">
                      <span className="font-headline-md text-base sm:text-lg font-black text-primary">
                        {ad.price}
                      </span>
                      <span className="text-[10px] text-outline flex items-center gap-1">
                        <span>Prodajalec:</span>
                        <a
                          href={`#author-${encodeURIComponent((ad.author || 'Prodajalec').replace(/\s+/g, '_'))}`}
                          className="font-semibold text-on-surface hover:text-primary hover:underline transition-colors"
                          title={`Ogled profila prodajalca: ${ad.author}`}
                        >
                          {ad.author}
                        </a>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShareMenu 
                        title={ad.title}
                        description={ad.description}
                        type="ad"
                        id={ad.id}
                        showLabel={true}
                        buttonClassName="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container"
                      />
                      <button 
                        onClick={() => {
                          window.location.hash = `ad-${ad.id}`;
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Kontakt</span>
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
      {visibleAds.length > 0 && (
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
            <span>{isLoading ? 'Nalaganje oglasov...' : 'Naloži še 10 oglasov'}</span>
          </button>
          <span className="font-body-sm text-xs text-outline">
            Prikazano {visibleAds.length} oglasov (stran {page})
          </span>
        </div>
      )}

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        initialType="ad" 
      />
    </div>
  );
}
