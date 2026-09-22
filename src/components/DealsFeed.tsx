import React, { useState, useEffect, useMemo } from 'react';
import { 
  Percent, 
  Search, 
  ChevronDown, 
  CheckCircle2, 
  ShieldCheck, 
  PlusCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  ArrowRight, 
  Zap, 
  Award, 
  Truck, 
  Star, 
  ThumbsUp, 
  X, 
  Tag, 
  SlidersHorizontal, 
  Timer,
  Sparkles,
  MapPin
} from 'lucide-react';
import { 
  DealItem, 
  HERO_BENTO_DEALS, 
  INITIAL_DEALS 
} from '../data/mockDealsData';
import { BookmarkButton } from './BookmarkButton';
import { ShareMenu } from './ShareMenu';
import { ReportButton } from './ReportButton';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPosts, createPostInFirestore } from '../services/firestoreService';
import { PostDetailTarget } from '../types';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { useCategories } from '../hooks/useCategories';
import { SLOVENIA_REGIONS } from '../services/categoryService';
import { PromotedBadge } from './common/PromotedBadge';
import { isItemActivelyPromoted } from '../services/promotionService';
import { PromotionConfig, PromotionBadgeType } from '../types';

interface DealsFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

const CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  tehnika: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',
  prehrana: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80',
  turizem: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
  sport: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop&q=80',
  dom: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
  avto: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
};

export function DealsFeed({ onViewChange, searchQuery = '', onNavigatePost }: DealsFeedProps) {
  const { currentUser } = useAuth();
  
  // State
  const [localSearch, setLocalSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('featured');
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Dynamic categories
  const { categories } = useCategories('deals');
  
  // Interactive state
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [userDeals, setUserDeals] = useState<DealItem[]>([]);
  const [votesMap, setVotesMap] = useState<Record<string, number>>({});
  const [votedSet, setVotedSet] = useState<Set<string>>(new Set());

  // Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    store: '',
    title: '',
    description: '',
    category: 'tehnika' as 'tehnika' | 'prehrana' | 'turizem' | 'sport' | 'dom' | 'avto',
    code: '',
    discount: '-20%',
    link: '',
    date: 'Velja do konca meseca',
    image: '',
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Subscribe to Firestore for real community deals
  useEffect(() => {
    const unsub = subscribeToPosts((posts) => {
      const dealPosts = posts
        .filter(p => p.category === 'deal' || p.category === 'ugodnosti' || p.category?.startsWith('deal') || p.categoryName === 'Ugodnosti' || p.categoryName === 'Ugodnost' || p.id.startsWith('deal-') || p.id.startsWith('hero-bento-'))
        .map(p => ({
          id: p.id,
          title: p.title,
          partner: p.authorName || 'Član skupnosti',
          partnerRole: p.authorRole || 'Uporabniški predlog',
          partnerInitial: (p.authorName || 'Č')[0].toUpperCase(),
          partnerLogoBg: 'bg-primary text-on-primary',
          partnerAvatar: p.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.authorName || 'clan')}`,
          category: (p.category === 'deal' ? 'tehnika' : (p.category || 'tehnika')) as any,
          categoryName: p.categoryName || 'Ugodnosti',
          subcategory: p.subcategory || '',
          subcategoryName: p.subcategoryName || '',
          region: p.region || p.location || 'Vsa Slovenija',
          discount: p.price || 'Ugodnost',
          dealType: 'code' as const,
          dealTypeName: 'Uporabniški kupon',
          date: 'Pravkar objavljeno',
          description: p.content,
          code: p.title.match(/[A-Z0-9]{4,10}/)?.[0] || undefined,
          link: '#',
          votes: (p.likesCount || 0) + 1,
          verifiedText: 'Članski predlog',
          statusTag: 'today' as const,
          image: p.imageUrl || CATEGORY_IMAGE_FALLBACKS.tehnika,
          isPromoted: p.isPromoted,
          promotedUntil: p.promotedUntil,
          promotionBadgeType: p.promotionBadgeType,
          promotion: p.promotion,
        }));
      setUserDeals(dealPosts);
    });

    return () => unsub();
  }, []);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => {
      setCopiedCodeId(null);
    }, 2000);
  };

  const handleVote = (id: string, initialVotes: number) => {
    if (votedSet.has(id)) return;
    setVotedSet(prev => new Set(prev).add(id));
    setVotesMap(prev => ({
      ...prev,
      [id]: (prev[id] ?? initialVotes) + 1,
    }));
  };

  // Active Category Object
  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return categories.find(c => c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('all');
    setPage(1);
  };

  // Combine initial curated deals + any user submitted deals + hero deals (with deduplication)
  const combinedDeals = useMemo(() => {
    const userDealIds = new Set(userDeals.map(d => d.id));
    const dedupedHero = HERO_BENTO_DEALS.filter(d => !userDealIds.has(d.id));
    const dedupedInitial = INITIAL_DEALS.filter(d => !userDealIds.has(d.id));
    return [...userDeals, ...dedupedHero, ...dedupedInitial];
  }, [userDeals]);

  // Dynamic category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: combinedDeals.length,
    };
    for (const cat of categories) {
      counts[cat.id] = combinedDeals.filter(d => 
        d.category === cat.id || 
        (d.categoryName && d.categoryName.toLowerCase().includes(cat.name.toLowerCase()))
      ).length;
    }
    return counts;
  }, [combinedDeals, categories]);

  // Filter deals
  const filteredDeals = useMemo(() => {
    return combinedDeals.filter(deal => {
      const textToMatch = `${deal.title} ${deal.partner} ${deal.description} ${deal.categoryName} ${(deal as any).subcategoryName || ''} ${deal.region} ${deal.code || ''}`;
      
      // 1. App-level searchQuery filter (category + terms)
      if (searchQuery && !matchesSearchAndCategory(textToMatch, 'deals', searchQuery)) {
        return false;
      }

      // 2. Local deals search input filter
      if (localSearch.trim()) {
        const lowerText = textToMatch.toLowerCase();
        const terms = localSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!terms.every(t => lowerText.includes(t))) return false;
      }

      // 3. Status filter
      if (selectedStatus === 'expiring' && deal.statusTag !== 'expiring') return false;
      if (selectedStatus === 'today' && deal.statusTag !== 'today') return false;
      if (selectedStatus === 'exclusive' && deal.statusTag !== 'exclusive') return false;
      if (selectedStatus === 'shipping' && deal.statusTag !== 'shipping') return false;

      // 4. Category filter
      if (selectedCategory !== 'all') {
        const matchesCat = deal.category === selectedCategory ||
          (activeCategoryObj && (
            deal.category?.toLowerCase() === activeCategoryObj.name.toLowerCase() ||
            (deal.categoryName && deal.categoryName.toLowerCase().includes(activeCategoryObj.name.toLowerCase()))
          ));
        if (!matchesCat) return false;
      }

      // 5. Subcategory filter
      if (selectedSubcategory !== 'all') {
        const subId = (deal as any).subcategory;
        const subName = (deal as any).subcategoryName;
        const matchesSub = subId === selectedSubcategory ||
          (subName && subName.toLowerCase() === selectedSubcategory.toLowerCase());
        if (!matchesSub) return false;
      }

      // 6. Region filter
      if (selectedRegion !== 'all') {
        const regLower = selectedRegion.toLowerCase();
        if (!deal.region.toLowerCase().includes(regLower) && !deal.region.toLowerCase().includes('vsa slo')) {
          return false;
        }
      }

      // 7. Deal type filter
      if (selectedType !== 'all') {
        if (selectedType === 'code' && deal.dealType !== 'code') return false;
        if (selectedType === 'flyer' && deal.dealType !== 'flyer' && deal.dealType !== 'sale') return false;
        if (selectedType === 'coupon' && deal.dealType !== 'coupon') return false;
        if (selectedType === 'bogo' && deal.dealType !== 'bogo') return false;
      }

      return true;
    }).sort((a, b) => {
      // Helper to check promotion status
      const checkDealPromoted = (deal: any): boolean => {
        if (deal.promotion) {
          return isItemActivelyPromoted(deal.promotion, 'ugodnosti', selectedCategory, selectedSubcategory);
        }
        if (deal.isPromoted) {
          if (deal.promotedUntil) {
            return new Date(deal.promotedUntil).getTime() > Date.now();
          }
          return true;
        }
        return false;
      };

      const aPromoted = checkDealPromoted(a);
      const bPromoted = checkDealPromoted(b);

      if (aPromoted && !bPromoted) return -1;
      if (!aPromoted && bPromoted) return 1;

      if (sortOption === 'highest_discount') {
        const numA = parseInt(a.discount.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.discount.replace(/[^0-9]/g, '')) || 0;
        return numB - numA;
      }
      if (sortOption === 'popular') {
        const votesA = votesMap[a.id] ?? a.votes;
        const votesB = votesMap[b.id] ?? b.votes;
        return votesB - votesA;
      }
      return 0; // default order
    });
  }, [combinedDeals, searchQuery, localSearch, selectedStatus, selectedCategory, selectedSubcategory, activeCategoryObj, selectedRegion, selectedType, sortOption, votesMap]);

  // Pagination (10 items per page)
  const PAGE_SIZE = 10;
  const currentLimit = page * PAGE_SIZE;
  const visibleDeals = filteredDeals.slice(0, currentLimit);
  const hasMore = currentLimit < filteredDeals.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoadingMore(false);
    }, 400);
  };

  // Submit modal handler
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.title || !modalForm.store) return;

    const fallbackImg = CATEGORY_IMAGE_FALLBACKS[modalForm.category] || CATEGORY_IMAGE_FALLBACKS.tehnika;

    const newDeal: DealItem = {
      id: `user-deal-${Date.now()}`,
      title: modalForm.title,
      partner: modalForm.store,
      partnerRole: 'Uporabniški predlog',
      partnerInitial: modalForm.store.substring(0, 2).toUpperCase(),
      partnerLogoBg: 'bg-primary text-on-primary',
      partnerAvatar: currentUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(modalForm.store)}`,
      category: modalForm.category,
      categoryName: modalForm.category === 'tehnika' ? 'Tehnika & Elektronika' :
                    modalForm.category === 'prehrana' ? 'Prehrana & Trgovine' :
                    modalForm.category === 'turizem' ? 'Turizem & Doživetja' :
                    modalForm.category === 'sport' ? 'Moda & Šport' :
                    modalForm.category === 'dom' ? 'Dom & Vrt' : 'Avto & Mobilnost',
      region: 'Vsa Slovenija / Splet',
      discount: modalForm.discount || '-20%',
      dealType: modalForm.code ? 'code' : 'sale',
      dealTypeName: modalForm.code ? 'Koda za popust' : 'Letak & Akcija',
      date: modalForm.date || 'Velja do konca meseca',
      description: modalForm.description || 'Ugodnost, ki jo je predlagal član skupnosti Portal.si.',
      code: modalForm.code ? modalForm.code.toUpperCase() : undefined,
      link: modalForm.link || '#',
      votes: 1,
      verifiedText: 'Novo dodano',
      statusTag: 'today',
      image: modalForm.image || fallbackImg,
    };

    // Prepend locally
    setUserDeals(prev => [newDeal, ...prev]);

    // Also persist to Firestore if available
    try {
      if (currentUser) {
        await createPostInFirestore({
          title: `[Ugodnost] ${modalForm.title}`,
          content: `${modalForm.description || modalForm.title}. Trgovec: ${modalForm.store}. Koda: ${modalForm.code || 'Brez kode'}`,
          category: 'deal',
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          authorAvatar: currentUser.avatar,
          price: modalForm.discount,
          likesCount: 1,
          commentsCount: 0,
          imageUrl: modalForm.image || fallbackImg,
        });
      }
    } catch (err) {
      console.warn('Could not save deal to Firestore:', err);
    }

    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setIsSubmitModalOpen(false);
      setModalForm({
        store: '',
        title: '',
        description: '',
        category: 'tehnika',
        code: '',
        discount: '-20%',
        link: '',
        date: 'Velja do konca meseca',
        image: '',
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-space-md">
      
      {/* 1. STANDARD HEADER (MATCHING DOGODKI & MALI OGLASI) */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <Percent className="w-[1em] h-[1em] text-secondary shrink-0" />
              <span>Ugodnosti in popusti v Sloveniji</span>
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
              Preverjene kode, akcije in popusti za nakupe v slovenskih trgovinah ter na spletu.
            </p>
          </div>
          <button 
            onClick={() => setIsSubmitModalOpen(true)}
            id="btn-submit-deal"
            className="flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Predlagaj ugodnost</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & SEARCH MODULE */}
      <div className="flex flex-col gap-3.5 p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/50">
        
        {/* Status Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button 
            onClick={() => { setSelectedStatus('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
              selectedStatus === 'all' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Star className="w-3.5 h-3.5" />
            <span>Vse ponudbe</span>
          </button>
          <button 
            onClick={() => { setSelectedStatus('expiring'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
              selectedStatus === 'expiring' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Timer className="w-3.5 h-3.5 text-error" />
            <span>Poteče kmalu</span>
          </button>
          <button 
            onClick={() => { setSelectedStatus('today'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
              selectedStatus === 'today' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Zap className="w-3.5 h-3.5 text-secondary" />
            <span>Danes dodano</span>
          </button>
          <button 
            onClick={() => { setSelectedStatus('exclusive'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
              selectedStatus === 'exclusive' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Award className="w-3.5 h-3.5 text-primary" />
            <span>Ekskluzivno</span>
          </button>
          <button 
            onClick={() => { setSelectedStatus('shipping'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
              selectedStatus === 'shipping' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Brezplačna dostava</span>
          </button>
        </div>

        {/* Category Rail with Dynamic Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button 
            onClick={() => handleCategorySelect('all')}
            className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'all' 
                ? 'bg-primary text-on-primary font-bold' 
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
            }`}
            type="button"
          >
            <span>Vse ugodnosti</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'}`}>
              {categoryCounts.all}
            </span>
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                selectedCategory === cat.id 
                  ? 'bg-primary text-on-primary font-bold' 
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
              }`}
              type="button"
            >
              <span>{cat.icon || '🏷️'}</span>
              <span>{cat.name}</span>
              {categoryCounts[cat.id] !== undefined && categoryCounts[cat.id] > 0 && (
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
                  {categoryCounts[cat.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Subcategory Rail (when active category has subcategories) */}
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

        {/* Multi-Param Search & Select Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              value={localSearch}
              onChange={(e) => { setLocalSearch(e.target.value); setPage(1); }}
              placeholder="Išči po trgovini, znamki ali izdelku..."
              className="w-full bg-surface-container-low pl-9 pr-3 py-2 rounded-xl font-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container transition-colors border border-surface-container/60"
            />
            {localSearch && (
              <button onClick={() => setLocalSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="sm:col-span-3 relative">
            <select 
              value={selectedRegion}
              onChange={(e) => { setSelectedRegion(e.target.value); setPage(1); }}
              className="w-full appearance-none bg-surface-container-low pl-3 pr-8 py-2 rounded-xl font-body-sm text-xs text-on-surface focus:outline-none focus:bg-surface-container transition-colors cursor-pointer border border-surface-container/60"
            >
              <option value="all">Vsa Slovenija</option>
              {SLOVENIA_REGIONS.map(reg => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="sm:col-span-2 relative">
            <select 
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
              className="w-full appearance-none bg-surface-container-low pl-3 pr-7 py-2 rounded-xl font-body-sm text-xs text-on-surface focus:outline-none focus:bg-surface-container transition-colors cursor-pointer border border-surface-container/60"
            >
              <option value="all">Vse vrste</option>
              <option value="code">Koda</option>
              <option value="flyer">Letak</option>
              <option value="coupon">Kupon</option>
              <option value="bogo">1+1</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="sm:col-span-2 relative">
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full appearance-none bg-surface-container-low pl-3 pr-7 py-2 rounded-xl font-body-sm text-xs text-on-surface focus:outline-none focus:bg-surface-container transition-colors cursor-pointer border border-surface-container/60"
            >
              <option value="featured">Najnovejše</option>
              <option value="highest_discount">Največ %</option>
              <option value="popular">Priljubljeno</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. FEED OF DEALS WITH PHOTOS */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between pt-1">
          <h2 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
            <span>Aktualne ugodnosti &amp; kuponi</span>
            <span className="font-label-md text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-normal">
              {filteredDeals.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setSelectedStatus('all'); setSelectedCategory('all'); setSelectedRegion('all'); setSelectedType('all'); setLocalSearch(''); }}
              className="text-xs text-outline hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ponastavi filtre</span>
            </button>
          </div>
        </div>

        {/* List of Deals with Photos */}
        {visibleDeals.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50 flex flex-col items-center gap-2">
            <Percent className="w-8 h-8 text-outline/50" />
            <p className="font-headline-sm text-base font-bold text-on-surface">Ni najdenih ugodnosti</p>
            <p className="font-body-sm text-xs text-outline max-w-sm">
              Za izbrane filtre ali iskalni niz trenutno ni zadetkov med popusti. Poskusite ponastaviti filtre.
            </p>
            <button 
              onClick={() => { setSelectedStatus('all'); setSelectedCategory('all'); setSelectedRegion('all'); setSelectedType('all'); setLocalSearch(''); }}
              className="mt-2 px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl cursor-pointer"
            >
              Prikaži vse ugodnosti
            </button>
          </div>
        ) : (
          visibleDeals.map((deal) => {
            const currentVotes = votesMap[deal.id] ?? deal.votes;
            const hasVoted = votedSet.has(deal.id);
            const isCopied = copiedCodeId === deal.id;
            const dealImg = deal.image || CATEGORY_IMAGE_FALLBACKS[deal.category] || CATEGORY_IMAGE_FALLBACKS.tehnika;
            const isPromoted = Boolean(
              (deal as any).promotion 
                ? isItemActivelyPromoted((deal as any).promotion, 'ugodnosti', selectedCategory, selectedSubcategory)
                : ((deal as any).isPromoted && (!(deal as any).promotedUntil || new Date((deal as any).promotedUntil).getTime() > Date.now()))
            );
            const badgeType: PromotionBadgeType = (deal as any).promotionBadgeType || (deal as any).promotion?.badgeType || 'PROMO';

            return (
              <article 
                key={deal.id}
                className={`bg-surface-container-lowest rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row group ${
                  isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/60'
                }`}
              >
                {/* PHOTO CONTAINER */}
                <a 
                  href={`#deal-${deal.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = `deal-${deal.id}`;
                  }}
                  className="sm:w-52 md:w-56 h-48 sm:h-auto bg-surface-container shrink-0 relative overflow-hidden block cursor-pointer"
                  title="Odpri samostojno stran te ugodnosti"
                >
                  <img 
                    src={dealImg} 
                    alt={deal.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden"></div>
                  
                  {/* Badges on image */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    {isPromoted && (
                      <PromotedBadge type={badgeType} size="sm" />
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white font-label-caps text-[10px] font-bold uppercase tracking-wider">
                      {deal.categoryName}
                    </span>
                    {deal.featured && !isPromoted && (
                      <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary font-label-caps text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Top
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-secondary text-on-secondary font-bold text-xs shadow-md">
                    {deal.discount}
                  </div>
                </a>

                {/* CONTENT AREA */}
                <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 gap-3">
                  <div>
                    {/* Header Row: Partner info, role, and actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <a
                          href={`#author-${encodeURIComponent(deal.partner.replace(/\s+/g, '_'))}`}
                          className="shrink-0 group/avatar focus:outline-none"
                          title={`Ogled profila partnerja: ${deal.partner}`}
                        >
                          <img 
                            src={deal.partnerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(deal.partner)}`} 
                            alt={deal.partner}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-black/10 group-hover/avatar:ring-2 group-hover/avatar:ring-primary shrink-0 shadow-xs transition-all"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(deal.partner)}`;
                            }}
                          />
                        </a>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <a
                            href={`#author-${encodeURIComponent(deal.partner.replace(/\s+/g, '_'))}`}
                            className="font-label-lg text-xs sm:text-sm font-bold text-on-surface hover:text-primary hover:underline truncate transition-colors"
                            title={`Ogled profila partnerja: ${deal.partner}`}
                          >
                            {deal.partner}
                          </a>
                          {deal.partnerRole && (
                            <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-surface-container text-outline font-semibold shrink-0">
                              {deal.partnerRole}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <BookmarkButton 
                          id={deal.id} 
                          data={{
                            type: 'deal',
                            category: 'deals',
                            title: deal.title,
                            price: deal.discount,
                            discount: deal.discount,
                            author: deal.partner,
                            authorRole: deal.partnerRole,
                            authorAvatar: deal.partnerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(deal.partner)}`,
                            date: deal.date,
                            description: deal.description,
                            image: dealImg,
                            code: deal.code,
                            link: deal.link,
                            votesCount: currentVotes,
                            categoryName: deal.categoryName,
                            region: deal.region,
                            verifiedText: deal.verifiedText,
                          }}
                        />
                        <ShareMenu id={deal.id} type="deal" title={deal.title} description={deal.description} />
                        <ReportButton 
                          targetId={deal.id} 
                          targetType="deal" 
                          targetTitle={deal.title} 
                          targetAuthor={deal.partner} 
                          targetUrl={deal.link} 
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <a
                      href={`#deal-${deal.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.hash = `deal-${deal.id}`;
                      }}
                      className="block group/title cursor-pointer"
                    >
                      <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface line-clamp-2 mt-1.5 group-hover/title:text-primary transition-colors leading-snug">
                        {deal.title}
                      </h3>
                    </a>

                    {/* Description */}
                    <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                      {deal.description}
                    </p>
                  </div>

                  {/* Metadata & Actions Row */}
                  <div className="space-y-2.5 pt-2 border-t border-surface-container-low">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-outline font-label-md text-[11px]">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {deal.verifiedText && (
                          <span className="flex items-center gap-1 text-secondary font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{deal.verifiedText}</span>
                          </span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 text-error font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{deal.date}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <MapPin className="w-3 h-3 text-outline shrink-0" />
                          <span>{deal.region}</span>
                        </span>
                      </div>

                      {/* Upvote button */}
                      <button
                        onClick={() => handleVote(deal.id, deal.votes)}
                        disabled={hasVoted}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          hasVoted 
                            ? 'bg-secondary/10 text-secondary' 
                            : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                        }`}
                        title="Glasuj za to ugodnost"
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                        <span>{currentVotes}</span>
                      </button>
                    </div>

                    {/* Promo Code or Direct Link CTA */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      {deal.code ? (
                        <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-xl border border-surface-container/60">
                          <span className="font-label-caps text-[10px] text-outline uppercase font-bold">Koda:</span>
                          <span className="font-mono font-bold text-primary px-2 py-0.5 bg-surface-container-lowest rounded select-all text-xs border border-surface-container">
                            {deal.code}
                          </span>
                          <button 
                            onClick={() => handleCopy(deal.code!, deal.id)}
                            className="p-1 text-outline hover:text-primary transition-colors cursor-pointer" 
                            title="Kopiraj kodo" 
                            type="button"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          {isCopied && <span className="text-[10px] font-bold text-secondary">Kopirano!</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-outline italic">Koda ni potrebna (akcija)</span>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        <ShareMenu 
                          id={deal.id} 
                          type="deal" 
                          title={deal.title} 
                          description={deal.description} 
                          showLabel={true} 
                          buttonClassName="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container" 
                        />
                        <a 
                          href={`#deal-${deal.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = `deal-${deal.id}`;
                          }}
                          className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container"
                          title="Poglej celotno stran te ugodnosti"
                        >
                          <span>Stran objave</span>
                        </a>
                        <a 
                          href={deal.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary-container transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <span>{deal.dealType === 'flyer' ? 'Prelistaj letak' : 'Uveljavi popust'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                </div>
              </article>
            );
          })
        )}
      </div>

      {/* 4. PAGINATION */}
      {visibleDeals.length > 0 && hasMore && (
        <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-4 border border-surface-container/60 shadow-xs">
          <div className="font-body-sm text-xs text-on-surface-variant text-center sm:text-left">
            Prikazanih <strong>{visibleDeals.length}</strong> od <strong>{filteredDeals.length}</strong> ugodnosti
          </div>
          <button 
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-primary font-label-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-surface-container" 
            type="button"
          >
            {isLoadingMore ? (
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            <span>{isLoadingMore ? 'Nalaganje...' : 'Naloži naslednje ugodnosti'}</span>
          </button>
        </div>
      )}

      {visibleDeals.length > 0 && !hasMore && (
        <div className="text-center py-4 font-body-sm text-xs text-outline border-t border-surface-container-low">
          Prikazane so vse ugodnosti ({filteredDeals.length} ponudb).
        </div>
      )}

      {/* 5. MODAL: PREDLAGAJ ALI OBJAVI UGODNOST */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-5 sm:p-6 shadow-xl space-y-4 border border-surface-container animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-primary" />
                <span>Predlagaj ali objavi ugodnost</span>
              </h3>
              <button 
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-body-sm text-xs text-on-surface-variant">
              Ste opazili izjemen popust v slovenskih trgovinah ali imate kodo za popust? Delite jo s skupnostjo Portal.si!
            </p>

            {submitSuccess ? (
              <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-xl text-center text-xs text-secondary font-bold space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1" />
                <p>Hvala! Ugodnost je bila uspešno dodana in objavljena.</p>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-label-md text-on-surface font-semibold mb-1">
                    Naziv trgovca ali spletne strani *
                  </label>
                  <input 
                    type="text" 
                    value={modalForm.store}
                    onChange={(e) => setModalForm({ ...modalForm, store: e.target.value })}
                    placeholder="npr. Big Bang, Mercator, Spar, mimovrste..." 
                    required 
                    className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-on-surface font-semibold mb-1">
                    Naslov ponudbe ali opis ugodnosti *
                  </label>
                  <input 
                    type="text" 
                    value={modalForm.title}
                    onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                    placeholder="npr. -25% na male gospodinjske aparate" 
                    required 
                    className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-label-md text-on-surface font-semibold mb-1">Kategorija</label>
                    <select 
                      value={modalForm.category}
                      onChange={(e) => setModalForm({ ...modalForm, category: e.target.value as any })}
                      className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                    >
                      <option value="tehnika">Tehnika &amp; Elektronika</option>
                      <option value="prehrana">Prehrana &amp; Trgovine</option>
                      <option value="turizem">Turizem &amp; Doživetja</option>
                      <option value="sport">Moda &amp; Šport</option>
                      <option value="dom">Dom &amp; Vrt</option>
                      <option value="avto">Avto &amp; Mobilnost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-label-md text-on-surface font-semibold mb-1">Višina popusta</label>
                    <input 
                      type="text" 
                      value={modalForm.discount}
                      onChange={(e) => setModalForm({ ...modalForm, discount: e.target.value })}
                      placeholder="npr. -20% ali 1+1 gratis" 
                      className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-label-md text-on-surface font-semibold mb-1">
                      Koda za popust (če obstaja)
                    </label>
                    <input 
                      type="text" 
                      value={modalForm.code}
                      onChange={(e) => setModalForm({ ...modalForm, code: e.target.value.toUpperCase() })}
                      placeholder="npr. POMLAD25" 
                      className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-mono uppercase font-bold text-primary focus:outline-none focus:bg-surface-container border border-surface-container"
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-on-surface font-semibold mb-1">
                      Povezava do trgovine
                    </label>
                    <input 
                      type="url" 
                      value={modalForm.link}
                      onChange={(e) => setModalForm({ ...modalForm, link: e.target.value })}
                      placeholder="https://trgovina.si/akcija" 
                      className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-on-surface font-semibold mb-1">
                    Povezava do fotografije (neobvezno)
                  </label>
                  <input 
                    type="url" 
                    value={modalForm.image}
                    onChange={(e) => setModalForm({ ...modalForm, image: e.target.value })}
                    placeholder="https://... (pustite prazno za privzeto fotografijo kategorije)" 
                    className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-on-surface font-semibold mb-1">
                    Podrobnejši opis ugodnosti
                  </label>
                  <textarea 
                    rows={2}
                    value={modalForm.description}
                    onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                    placeholder="Opišite pogoje, kje koda velja in do kdaj..."
                    className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                  ></textarea>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button 
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md transition-colors cursor-pointer"
                    type="button"
                  >
                    Prekliči
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md font-semibold hover:bg-primary-container transition-colors cursor-pointer shadow-xs"
                  >
                    Objavi ugodnost
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
