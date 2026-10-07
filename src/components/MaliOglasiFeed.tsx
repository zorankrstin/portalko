import React, { useState, useEffect, useMemo } from 'react';
import { ShareMenu } from "./ShareMenu";
import { BookmarkButton } from "./BookmarkButton";
import { ReportButton } from "./ReportButton";
import { Search, ChevronDown, PlusCircle, Star, Phone, MapPin, Building2, Car, Sparkles, ShoppingBag, Tag, Layers, Globe, Filter, X } from 'lucide-react';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { subscribeToAds, FirestoreAd } from '../services/firestoreService';
import { ComposeModal } from './ComposeModal';
import { INITIAL_ADS, MockAdItem } from '../data/mockFeedData';
import { PostDetailTarget } from '../types';
import { useCategories } from '../hooks/useCategories';
import { SLOVENIA_REGIONS, POPULAR_SLOVENIA_TOWNS } from '../services/categoryService';
import { PromotedBadge } from './common/PromotedBadge';
import { isItemActivelyPromoted } from '../services/promotionService';
import { AdsCategoryLocationFilter } from './ads/AdsCategoryLocationFilter';
import { slugify } from '../utils/urlUtils';
import { getPlainTextSnippet } from '../utils/textUtils';
import { UserAvatar } from './common/UserAvatar';
import { resolveUserUploadedAvatar } from '../utils/avatarUtils';
import { useAuth } from '../contexts/AuthContext';
import { VerifiedBadge } from './common/VerifiedBadge';
import { isUserVerified } from '../utils/userVerificationUtils';

interface MaliOglasiFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function MaliOglasiFeed({ onViewChange, searchQuery = '', onNavigatePost }: MaliOglasiFeedProps) {
  const { users } = useAuth();
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  
  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedTertiaryCategory, setSelectedTertiaryCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');

  // Load dynamic categories for ads
  const { categories } = useCategories('ads');

  // Deduplicated list of Slovenian towns for the filter dropdown
  const popularTownsList = useMemo(() => {
    const set = new Set<string>();
    POPULAR_SLOVENIA_TOWNS.forEach(t => set.add(t.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'sl'));
  }, []);

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

  // All available subcategories (when 'all' is selected, show all unique subcategories across all ad categories)
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

  // Handle category pill change
  // Handle category pill change
  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('all');
    setSelectedTertiaryCategory('all');
    setPage(1);
  };

  // Category counts based on real user ads
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: firestoreAds.length };
    for (const cat of categories) {
      counts[cat.id] = firestoreAds.filter(ad => {
        const cLower = cat.name.toLowerCase().trim();
        const aCat = (ad.category || '').toLowerCase().trim();
        const aCatName = (ad.categoryName || '').toLowerCase().trim();
        return ad.category === cat.id || aCat === cLower || aCatName === cLower || aCat.includes(cLower) || aCatName.includes(cLower);
      }).length;
    }
    return counts;
  }, [firestoreAds, categories]);

  // Filter Firestore ads
  const filteredFirestore = useMemo(() => {
    return firestoreAds.filter(ad => {
      const textToMatch = `${getPlainTextSnippet(ad.title)} ${getPlainTextSnippet(ad.description)} ${ad.category} ${ad.categoryName || ''} ${ad.subcategory || ''} ${ad.subcategoryName || ''} ${ad.location || ''} ${ad.region || ''}`;
      const matchesSearch = matchesSearchAndCategory(textToMatch, 'ads', searchQuery);
      
      const aCatLower = (ad.category || '').toLowerCase().trim();
      const aCatNameLower = (ad.categoryName || '').toLowerCase().trim();

      // Category match
      const matchesCat = selectedCategory === 'all' || 
        ad.category === selectedCategory ||
        aCatLower === selectedCategory.toLowerCase().trim() ||
        aCatNameLower === selectedCategory.toLowerCase().trim() ||
        (activeCategoryObj && (
          aCatLower === activeCategoryObj.name.toLowerCase().trim() ||
          aCatNameLower === activeCategoryObj.name.toLowerCase().trim() ||
          aCatLower.includes(activeCategoryObj.name.toLowerCase().trim()) ||
          aCatNameLower.includes(activeCategoryObj.name.toLowerCase().trim())
        ));

      const aSubLower = (ad.subcategory || '').toLowerCase().trim();
      const aSubNameLower = (ad.subcategoryName || '').toLowerCase().trim();
      const targetSubLower = selectedSubcategory.toLowerCase().trim();

      // Subcategory match
      const matchesSubcat = selectedSubcategory === 'all' || 
        ad.subcategory === selectedSubcategory ||
        aSubLower === targetSubLower ||
        aSubNameLower === targetSubLower ||
        (selectedSubcatObj && (
          aSubLower === selectedSubcatObj.name.toLowerCase().trim() ||
          aSubLower === selectedSubcatObj.id.toLowerCase().trim() ||
          aSubNameLower === selectedSubcatObj.name.toLowerCase().trim() ||
          aSubNameLower === selectedSubcatObj.id.toLowerCase().trim()
        ));

      // 3rd Level Category / Make / Brand / Model matching (e.g. Fiat, VW, Apple, etc.)
      let matchesTertiary = true;
      if (selectedTertiaryCategory !== 'all') {
        const target = selectedTertiaryCategory.toLowerCase().trim();
        const adTitle = (ad.title || '').toLowerCase();
        const adDesc = (ad.description || '').toLowerCase();
        const adMake = ((ad as any).make || '').toLowerCase();
        const adBrand = ((ad as any).brand || '').toLowerCase();
        const adThird = ((ad as any).thirdLevelCategory || (ad as any).subSubcategory || '').toLowerCase();
        const adTags = Array.isArray(ad.tags) ? (ad.tags as string[]).map(t => String(t).toLowerCase()).join(' ') : String(ad.tags || '').toLowerCase();

        matchesTertiary = 
          adMake === target ||
          adBrand === target ||
          adThird === target ||
          adTitle.includes(target) ||
          adDesc.includes(target) ||
          adTags.includes(target);

        // Aliases check for common brands (e.g. VW for Volkswagen, iPhone for Apple)
        if (!matchesTertiary) {
          if (target === 'volkswagen' && (adTitle.includes('vw') || adDesc.includes('vw'))) matchesTertiary = true;
          if (target === 'mercedes-benz' && (adTitle.includes('mercedes') || adDesc.includes('mercedes') || adTitle.includes('benz') || adDesc.includes('benz'))) matchesTertiary = true;
          if (target === 'škoda' && (adTitle.includes('skoda') || adDesc.includes('skoda'))) matchesTertiary = true;
          if (target.includes('apple') && (adTitle.includes('iphone') || adDesc.includes('iphone') || adTitle.includes('ipad') || adDesc.includes('ipad') || adTitle.includes('macbook') || adDesc.includes('macbook'))) matchesTertiary = true;
          if (target === 'alfa romeo' && (adTitle.includes('alfa') || adDesc.includes('alfa'))) matchesTertiary = true;
        }
      }

      // Region & City/Location matching
      let matchesReg = false;
      if (selectedRegion === 'all') {
        matchesReg = true;
      } else {
        const target = selectedRegion.toLowerCase().trim();
        const adLoc = (ad.location || '').toLowerCase().trim();
        const adReg = (ad.region || '').toLowerCase().trim();

        if (target.startsWith('city-')) {
          const cleanCity = target.replace('city-', '').trim().toLowerCase();
          if (adLoc.includes(cleanCity) || adReg.includes(cleanCity)) {
            matchesReg = true;
          }
        } else {
          // 1. Direct match on ad.region or ad.location
          if (adReg.includes(target) || adLoc.includes(target)) {
            matchesReg = true;
          } else {
            // 2. Check if selectedRegion is a region ID (e.g. 'osrednjeslovenska', 'podravska', etc.)
            const regObj = SLOVENIA_REGIONS.find(r => r.id === selectedRegion);
            if (regObj) {
              if (
                adReg.includes(regObj.id) ||
                adReg.includes(regObj.name.toLowerCase()) ||
                adReg.includes(regObj.shortName.toLowerCase())
              ) {
                matchesReg = true;
              } else {
                // Check if ad location contains ANY town/city from this region
                for (const city of regObj.cities) {
                  const cLower = city.toLowerCase();
                  if (adLoc.includes(cLower) || adReg.includes(cLower)) {
                    matchesReg = true;
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // Seller filter match
      const matchesSeller = selectedSeller === 'all' || 
        (ad.authorName && ad.authorName.toLowerCase().trim() === selectedSeller.toLowerCase().trim()) ||
        (ad.authorName && ad.authorName.toLowerCase().includes(selectedSeller.toLowerCase().trim()));

      return matchesSearch && matchesCat && matchesSubcat && matchesTertiary && matchesReg && matchesSeller;
    });
  }, [firestoreAds, searchQuery, selectedCategory, activeCategoryObj, selectedSubcategory, selectedSubcatObj, selectedTertiaryCategory, selectedRegion, selectedSeller]);

  // Unified items
  type UnifiedAd = { type: 'firestore'; data: FirestoreAd };

  const allAds: UnifiedAd[] = useMemo(() => {
    return filteredFirestore.map(a => ({ type: 'firestore' as const, data: a }));
  }, [filteredFirestore]);

  // Helper to check promotion status
  const checkAdPromoted = (item: UnifiedAd): boolean => {
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
  const sortedAds = useMemo(() => {
    const copy = [...allAds];
    copy.sort((a, b) => {
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
    return copy;
  }, [allAds, sortOption, selectedCategory, selectedSubcategory]);

  const PAGE_SIZE = 10;
  const currentLimit = page * PAGE_SIZE;
  const visibleAds = sortedAds.slice(0, currentLimit);
  const hasMore = currentLimit < sortedAds.length;

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoading(false);
    }, 450);
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedTertiaryCategory('all');
    setSelectedRegion('all');
    setSortOption('newest');
    setSelectedSeller('all');
    setPage(1);
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
              <span>Mali oglasi</span>
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

      {/* Dedicated Category Badges and Dropdown Filter Component */}
      <AdsCategoryLocationFilter
        categories={categories}
        categoryCounts={categoryCounts}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
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
      />

      {/* Ads List */}
      <div className="flex flex-col gap-space-md">
        {visibleAds.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50">
            Ni najdenih oglasov za izbrane kriterije (kategorija, podkategorija ali regija).
          </div>
        ) : (
          visibleAds.map((item, idx) => {
            const ad = item.data;
            const isPromoted = checkAdPromoted(item);
            const badgeType = ad.promotionBadgeType || ad.promotion?.badgeType || 'PROMO';
            const cleanTitle = getPlainTextSnippet(ad.title);
            const cleanDescription = getPlainTextSnippet(ad.description);

              return (
                <article key={`fs-ad-${ad.id}-${idx}`} className={`bg-surface-container-lowest rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-md flex flex-col sm:flex-row ${
                  isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/50 hover:border-surface-container-high'
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
                      <img alt={cleanTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={ad.imageUrl} />
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
                              title: cleanTitle,
                              description: cleanDescription,
                              category: ad.categoryName || ad.category,
                              location: ad.location || ad.region,
                              price: ad.price,
                              imageUrl: ad.imageUrl,
                              author: ad.authorName
                            }}
                          />
                          <ShareMenu 
                            title={cleanTitle}
                            description={cleanDescription} 
                            type="ad"
                            id={ad.id}
                            imageUrl={ad.imageUrl}
                            category={ad.categoryName || ad.category}
                            author={ad.authorName}
                            price={ad.price}
                            location={ad.location || ad.region}
                          />
                          <ReportButton 
                            targetId={ad.id} 
                            targetType="ad" 
                            targetTitle={cleanTitle} 
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
                          {cleanTitle}
                        </a>
                      </h2>
                      <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 mt-1">
                        {cleanDescription}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low">
                      <div className="flex flex-col">
                        <span className="font-headline-md text-base sm:text-lg font-black text-primary">
                          {ad.price || 'Po dogovoru'}
                        </span>
                        <span className="text-[10px] text-outline flex items-center gap-1">
                          <span>Objavil:</span>
                          {(() => {
                            const authorAvatar = resolveUserUploadedAvatar(ad.authorAvatar, ad.authorId, ad.authorName, users);
                            const isAuthorVerified = isUserVerified({
                              role: ad.authorRole,
                              userId: ad.authorId,
                              name: ad.authorName,
                              users,
                            });
                            return (
                              <a
                                href={`/avtor/${slugify(ad.authorName || 'Uporabnik')}`}
                                data-author-name={ad.authorName || 'Uporabnik'}
                                data-author-id={ad.authorId}
                                data-author-avatar={authorAvatar || ''}
                                data-author-role={ad.authorRole || 'uporabnik'}
                                data-post-id={ad.id}
                                data-post-type="ad"
                                data-post-title={ad.title}
                                data-post-image={ad.imageUrl}
                                data-post-category={ad.categoryName || ad.category}
                                data-post-price={ad.price}
                                data-post-location={ad.location || ad.region}
                                className="font-semibold text-on-surface hover:text-primary hover:underline transition-colors inline-flex items-center gap-1"
                                title={`Ogled profila: ${ad.authorName || 'Uporabnik'}`}
                              >
                                <UserAvatar
                                  src={authorAvatar}
                                  name={ad.authorName || 'Uporabnik'}
                                  userId={ad.authorId}
                                  role={ad.authorRole}
                                  size="xs"
                                  className="w-4 h-4 text-[8px] shrink-0 ring-1 ring-surface-container/60 shadow-xs"
                                />
                                <span>{ad.authorName || 'Uporabnik'}</span>
                                {isAuthorVerified && (
                                  <VerifiedBadge size="xs" />
                                )}
                              </a>
                            );
                          })()}
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
      {visibleAds.length > 0 && hasMore && (
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
            <span>{isLoading ? 'Nalaganje oglasov...' : 'Naloži še oglasov'}</span>
          </button>
          <span className="font-body-sm text-xs text-outline">
            Prikazano {visibleAds.length} od {sortedAds.length} oglasov
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
