import React, { useState, useEffect } from 'react';
import { ShareMenu } from "./ShareMenu";
import { BookmarkButton } from "./BookmarkButton";
import { Search, ChevronDown, PlusCircle, Star, Phone, MapPin, Building2, Car, Sparkles, ShoppingBag } from 'lucide-react';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { subscribeToAds, FirestoreAd } from '../services/firestoreService';
import { ComposeModal } from './ComposeModal';
import { INITIAL_ADS, MockAdItem } from '../data/mockFeedData';

interface MaliOglasiFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
}

export function MaliOglasiFeed({ onViewChange, searchQuery = '' }: MaliOglasiFeedProps) {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');

  useEffect(() => {
    const unsub = subscribeToAds((ads) => {
      setFirestoreAds(ads);
    });
    return () => unsub();
  }, []);

  // Filter Firestore ads
  const filteredFirestore = firestoreAds.filter(ad => {
    const textToMatch = `${ad.title} ${ad.description} ${ad.category} ${ad.location || ''}`;
    const matchesSearch = matchesSearchAndCategory(textToMatch, 'ads', searchQuery);
    const matchesCat = selectedCategory === 'all' || 
      (ad.category && ad.category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  // Filter mock ads
  const filteredMock = INITIAL_ADS.filter(ad => {
    const textToMatch = `${ad.title} ${ad.description} ${ad.categoryName} ${ad.location}`;
    const matchesSearch = matchesSearchAndCategory(textToMatch, 'ads', searchQuery);
    const matchesCat = selectedCategory === 'all' || ad.category === selectedCategory;
    const matchesReg = selectedRegion === 'all' || ad.location.toLowerCase().includes(selectedRegion.toLowerCase());
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

  const CATEGORIES = [
    { id: 'all', label: 'Vse kategorije' },
    { id: 'auto', label: '🚗 Avto-moto' },
    { id: 'realestate', label: '🏠 Nepremičnine' },
    { id: 'tech', label: '📱 Telefonija & Tehnika' },
    { id: 'home', label: '🛋️ Dom & Vrt' },
    { id: 'sport', label: '🚲 Šport & Prosti čas' },
    { id: 'kids', label: '🧸 Otroška oprema' },
  ];

  return (
    <main className="lg:col-span-6 flex flex-col gap-space-md">
      {/* Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        <nav className="flex items-center gap-2 font-label-md text-xs text-outline">
          <a className="hover:text-primary transition-colors cursor-pointer" onClick={() => onViewChange('main')}>Domov</a>
          <span>/</span>
          <span className="text-primary font-semibold">Mali oglasi</span>
        </nav>
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

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors shadow-sm ${
              selectedCategory === cat.id
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-lowest hover:bg-surface-container border border-surface-container text-on-surface-variant'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-sm border border-surface-container/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <MapPin className="w-4 h-4 text-outline shrink-0" />
          <select 
            value={selectedRegion}
            onChange={(e) => { setSelectedRegion(e.target.value); setPage(1); }}
            className="bg-surface-container-low text-on-surface font-label-md text-xs px-2.5 py-1.5 rounded-lg focus:outline-none flex-1"
          >
            <option value="all">Vse regije (Slovenija)</option>
            <option value="ljubljana">Osrednjeslovenska (Ljubljana)</option>
            <option value="maribor">Podravska (Maribor)</option>
            <option value="kranj">Gorenjska (Kranj, Bled)</option>
            <option value="celje">Savinjska (Celje)</option>
            <option value="koper">Obalno-kraška (Koper, Obala)</option>
            <option value="novo mesto">Dolenjska (Novo mesto)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body-sm text-xs text-outline hidden sm:inline">Razvrsti:</span>
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-surface-container-low text-on-surface font-label-md text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
          >
            <option value="newest">Najnovejši oglasi</option>
            <option value="price-asc">Cena: najnižja najprej</option>
            <option value="price-desc">Cena: najvišja najprej</option>
          </select>
        </div>
      </div>

      {/* 10 Ad Cards initially */}
      <div className="flex flex-col gap-space-md">
        {visibleAds.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50">
            Ni najdenih oglasov za izbrane kriterije.
          </div>
        ) : (
          visibleAds.map((item) => {
            if (item.type === 'firestore') {
              const ad = item.data;
              return (
                <article key={ad.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container/50 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row">
                  {ad.imageUrl && (
                    <div className="sm:w-56 h-48 sm:h-auto bg-surface-container shrink-0 relative">
                      <img alt={ad.title} className="w-full h-full object-cover" src={ad.imageUrl} />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-on-primary font-label-caps text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        {ad.category || 'Oglas'}
                      </span>
                    </div>
                  )}
                  <div className="p-space-md flex flex-col justify-between flex-1 gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-headline-lg text-xl font-bold text-primary">{ad.price}</span>
                        <div className="flex items-center gap-1">
                          <BookmarkButton 
                            id={ad.id} 
                            data={{
                              type: 'ad',
                              category: 'ads',
                              title: ad.title,
                              price: ad.price,
                              location: ad.location,
                              description: ad.description,
                              image: ad.imageUrl,
                            }}
                          />
                          <ShareMenu id={ad.id} title={ad.title} />
                        </div>
                      </div>
                      <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-2 mt-1">{ad.title}</h3>
                      <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2 mt-1">{ad.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low text-xs text-outline">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {ad.location || 'Slovenija'} • {ad.authorName}
                      </span>
                      <button className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Kontaktiraj prodajalca</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            }

            const ad = item.data;
            return (
              <article key={ad.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container/50 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row">
                <div className="sm:w-60 h-48 sm:h-auto bg-surface-container shrink-0 relative">
                  <img alt={ad.title} className="w-full h-full object-cover" src={ad.image} />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white font-label-caps text-[10px] font-bold uppercase tracking-wider">
                    {ad.categoryName}
                  </span>
                </div>
                <div className="p-space-md flex flex-col justify-between flex-1 gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-headline-lg text-xl font-bold text-primary">{ad.price}</span>
                      <div className="flex items-center gap-1">
                        <BookmarkButton 
                          id={ad.id} 
                          data={{
                            type: 'ad',
                            category: 'ads',
                            title: ad.title,
                            price: ad.price,
                            location: ad.location,
                            description: ad.description,
                            image: ad.image,
                          }}
                        />
                        <ShareMenu id={ad.id} title={ad.title} />
                      </div>
                    </div>
                    <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-2 mt-1">{ad.title}</h3>
                    <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2 mt-1">{ad.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low text-xs text-outline">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {ad.location} • {ad.date}
                    </span>
                    <button className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Kontakt</span>
                    </button>
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
    </main>
  );
}
