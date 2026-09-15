import React, { useState, useEffect, useMemo } from 'react';
import { 
  Percent, 
  Search, 
  ChevronDown, 
  Sparkles, 
  Tag, 
  CheckCircle2, 
  ShieldCheck, 
  PiggyBank, 
  Timer, 
  PlusCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  SlidersHorizontal, 
  Clock, 
  Bookmark, 
  Share2, 
  ArrowRight, 
  Zap, 
  Award, 
  Truck, 
  Star, 
  BookOpen, 
  Calculator, 
  Bell, 
  Flame, 
  ThumbsUp, 
  X, 
  MapPin, 
  Flower2, 
  Laptop, 
  ShoppingBag, 
  Car, 
  Home, 
  Mountain 
} from 'lucide-react';
import { 
  DealItem, 
  HERO_BENTO_DEALS, 
  INITIAL_DEALS, 
  TOP_VOUCHER_CODES, 
  CATALOGUES_DATA 
} from '../data/mockDealsData';
import { BookmarkButton } from './BookmarkButton';
import { ShareMenu } from './ShareMenu';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPosts, createPostInFirestore, FirestorePost } from '../services/firestoreService';

interface DealsFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
}

export function DealsFeed({ onViewChange, searchQuery = '' }: DealsFeedProps) {
  const { currentUser } = useAuth();
  
  // State
  const [localSearch, setLocalSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('featured');
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Interactive Widgets State
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [userDeals, setUserDeals] = useState<DealItem[]>([]);
  const [votesMap, setVotesMap] = useState<Record<string, number>>({});
  const [votedSet, setVotedSet] = useState<Set<string>>(new Set());
  
  // Calculator state
  const [calcCategories, setCalcCategories] = useState({
    fuel: true,
    groceries: true,
    tech: true,
    tourism: false,
  });

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
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Subscribe to Firestore for real community deals
  useEffect(() => {
    const unsub = subscribeToPosts((posts) => {
      const dealPosts = posts
        .filter(p => p.category === 'deal')
        .map(p => ({
          id: p.id,
          title: p.title,
          partner: p.authorName || 'Član skupnosti',
          partnerRole: 'Uporabniški predlog',
          partnerInitial: (p.authorName || 'Č')[0].toUpperCase(),
          partnerLogoBg: 'bg-primary text-on-primary',
          category: 'tehnika' as const,
          categoryName: 'Skupnost',
          region: p.location || 'Vsa Slovenija',
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

  // Combine initial curated deals + any user submitted deals
  const combinedDeals = useMemo(() => {
    return [...userDeals, ...INITIAL_DEALS];
  }, [userDeals]);

  // Dynamic category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: combinedDeals.length + HERO_BENTO_DEALS.length + 474, // matching the 486 figure
      tehnika: 142,
      prehrana: 98,
      turizem: 74,
      sport: 65,
      dom: 58,
      avto: 49,
    };
    return counts;
  }, [combinedDeals]);

  // Combined search term (app header search + local deals search)
  const activeSearch = (searchQuery + ' ' + localSearch).trim().toLowerCase();

  // Filter deals
  const filteredDeals = useMemo(() => {
    return combinedDeals.filter(deal => {
      // 1. Search text
      if (activeSearch) {
        const text = `${deal.title} ${deal.partner} ${deal.description} ${deal.categoryName} ${deal.region} ${deal.code || ''}`.toLowerCase();
        const terms = activeSearch.split(/\s+/).filter(Boolean);
        const matchesAllTerms = terms.every(t => text.includes(t));
        if (!matchesAllTerms) return false;
      }

      // 2. Status filter
      if (selectedStatus === 'expiring' && deal.statusTag !== 'expiring') return false;
      if (selectedStatus === 'today' && deal.statusTag !== 'today') return false;
      if (selectedStatus === 'exclusive' && deal.statusTag !== 'exclusive') return false;
      if (selectedStatus === 'shipping' && deal.statusTag !== 'shipping') return false;

      // 3. Category filter
      if (selectedCategory !== 'all' && deal.category !== selectedCategory) return false;

      // 4. Region filter
      if (selectedRegion !== 'all') {
        const regLower = selectedRegion.toLowerCase();
        if (!deal.region.toLowerCase().includes(regLower) && !deal.region.toLowerCase().includes('vsa slo')) {
          return false;
        }
      }

      // 5. Deal type filter
      if (selectedType !== 'all') {
        if (selectedType === 'code' && deal.dealType !== 'code') return false;
        if (selectedType === 'flyer' && deal.dealType !== 'flyer' && deal.dealType !== 'sale') return false;
        if (selectedType === 'coupon' && deal.dealType !== 'coupon') return false;
        if (selectedType === 'bogo' && deal.dealType !== 'bogo') return false;
      }

      return true;
    }).sort((a, b) => {
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
  }, [combinedDeals, activeSearch, selectedStatus, selectedCategory, selectedRegion, selectedType, sortOption, votesMap]);

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

    const newDeal: DealItem = {
      id: `user-deal-${Date.now()}`,
      title: modalForm.title,
      partner: modalForm.store,
      partnerRole: 'Uporabniški predlog',
      partnerInitial: modalForm.store.substring(0, 2).toUpperCase(),
      partnerLogoBg: 'bg-primary text-on-primary',
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
      });
    }, 1500);
  };

  // Calculate annual savings for widget
  const calculatedSavings = useMemo(() => {
    let total = 0;
    if (calcCategories.fuel) total += 40;
    if (calcCategories.groceries) total += 95;
    if (calcCategories.tech) total += 50;
    if (calcCategories.tourism) total += 60;
    return total;
  }, [calcCategories]);

  return (
    <main className="lg:col-span-9 flex flex-col gap-space-md w-full">
      {/* 1. TOP ALPINE CIVIC UTILITY BAR */}
      <section className="w-full bg-surface-container-low/90 backdrop-blur-sm px-4 sm:px-6 py-2.5 rounded-2xl border border-surface-container/60 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 font-label-md text-xs sm:text-sm text-on-surface-variant">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-caps text-[11px] uppercase tracking-wider font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
              V živo
            </span>
            <span className="text-on-surface font-semibold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-secondary shrink-0" />
              <span>Preverjene slovenske kode &amp; akcije</span>
            </span>
            <span className="text-outline-variant">•</span>
            <span className="text-outline truncate text-xs">Zadnja preverba: pred 4 min (Big Bang, Spar, Mercator)</span>
          </div>
          <div className="flex items-center gap-4 text-outline font-label-md text-xs ml-auto sm:ml-0">
            <span className="flex items-center gap-1 text-secondary font-medium">
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Povprečni prihranek: 24,6 %</span>
            </span>
            <span className="hidden md:inline text-outline-variant">|</span>
            <span className="hidden md:flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Danes poteče: 14 ponudb</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. SECTION: HEADER, KEY METRICS & SUBMISSION CTA */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md sm:p-6 shadow-sm border border-surface-container/50 flex flex-col gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-label-caps text-xs text-outline uppercase tracking-wider">
          <a onClick={() => onViewChange('main')} className="hover:text-primary transition-colors cursor-pointer">PORTAL.SI</a>
          <span>&gt;</span>
          <span className="text-primary font-bold">UGODNOSTI IN POPUSTI</span>
          <span>&gt;</span>
          <span>SLOVENIJA 2026</span>
        </nav>

        {/* Title & Description & CTA */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
          <div className="max-w-3xl space-y-2">
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2.5">
              <Percent className="w-[1em] h-[1em] text-secondary shrink-0" />
              <span>Ugodnosti, Popusti &amp; Kuponi v Sloveniji</span>
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Prihranite pri nakupih elektronike, prehrane, mode, turizma ter lokalnih slovenskih ponudnikov. Preverjene kode in ekskluzivni popusti za člane skupnosti Portal.si.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button 
              onClick={() => setIsSubmitModalOpen(true)}
              id="btn-submit-deal"
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-semibold shadow-sm hover:bg-primary-container transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Predlagaj ali objavi ugodnost</span>
            </button>
            <button 
              onClick={() => { setSelectedStatus('all'); setSelectedCategory('all'); setLocalSearch(''); }}
              className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer border border-surface-container" 
              title="Ponastavi filtre" 
              type="button"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Live Metric Badges Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-container-low border border-surface-container/60 shadow-xs">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center flex-shrink-0 font-bold">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-headline-sm text-lg font-bold text-on-surface leading-tight">486</div>
              <div className="font-label-md text-xs text-outline truncate">Aktivnih popustov</div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="font-headline-sm text-lg font-bold text-secondary leading-tight">+18</div>
              <div className="font-label-md text-xs text-outline truncate">Danes dodanih</div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-surface-container-highest text-primary flex items-center justify-center flex-shrink-0 font-bold">
              <Percent className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-headline-sm text-lg font-bold text-on-surface leading-tight">24 %</div>
              <div className="font-label-md text-xs text-outline truncate">Povprečni prihranek</div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="font-headline-sm text-lg font-bold text-on-surface leading-tight">99,1 %</div>
              <div className="font-label-md text-xs text-outline truncate">Preverjeno delujoče</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TWO-COLUMN RESPONSIVE LAYOUT (CENTER FEED + RIGHT UTILITIES) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        
        {/* ============================================================== */}
        {/* LEFT / CENTER DEALS FEED (xl:col-span-8) */}
        {/* ============================================================== */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          
          {/* FILTER MODULE */}
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
                <span>Zadnji dnevi (Poteče kmalu)</span>
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
                <span>Ekskluzivno za člane</span>
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

            {/* Category Rail with Live Counters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button 
                onClick={() => { setSelectedCategory('all'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'all' 
                    ? 'bg-primary text-on-primary font-bold' 
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                <span>Vse kategorije</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                  {categoryCounts.all}
                </span>
              </button>
              <button 
                onClick={() => { setSelectedCategory('tehnika'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'tehnika' 
                    ? 'bg-primary text-on-primary font-bold' 
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                <span>📱 Tehnika &amp; Elektronika</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-container text-outline">
                  {categoryCounts.tehnika}
                </span>
              </button>
              <button 
                onClick={() => { setSelectedCategory('prehrana'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'prehrana' 
                    ? 'bg-primary text-on-primary font-bold' 
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                <span>🛒 Prehrana &amp; Trgovine</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-container text-outline">
                  {categoryCounts.prehrana}
                </span>
              </button>
              <button 
                onClick={() => { setSelectedCategory('turizem'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'turizem' 
                    ? 'bg-primary text-on-primary font-bold' 
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                <span>🏔️ Turizem &amp; Doživetja</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-container text-outline">
                  {categoryCounts.turizem}
                </span>
              </button>
              <button 
                onClick={() => { setSelectedCategory('sport'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'sport' 
                    ? 'bg-primary text-on-primary font-bold' 
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                <span>👕 Moda &amp; Šport</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-container text-outline">
                  {categoryCounts.sport}
                </span>
              </button>
              <button 
                onClick={() => { setSelectedCategory('dom'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'dom' 
                    ? 'bg-primary text-on-primary font-bold' 
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                <span>🏡 Dom &amp; Vrt</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-container text-outline">
                  {categoryCounts.dom}
                </span>
              </button>
              <button 
                onClick={() => { setSelectedCategory('avto'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === 'avto' 
                    ? 'bg-primary text-on-primary font-bold' 
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                <span>🚗 Avto &amp; Mobilnost</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-container text-outline">
                  {categoryCounts.avto}
                </span>
              </button>
            </div>

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
                  <option value="all">Vsa Slovenija / Splet</option>
                  <option value="Ljubljana">Ljubljana &amp; Osrednja</option>
                  <option value="Maribor">Maribor &amp; Podravje</option>
                  <option value="Celje">Celje &amp; Savinjska</option>
                  <option value="Kranj">Kranj &amp; Gorenjska</option>
                  <option value="Koper">Koper &amp; Obala</option>
                  <option value="Novo Mesto">Novo Mesto &amp; Dolenjska</option>
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
                  <option value="code">Koda za popust</option>
                  <option value="flyer">Letak &amp; Akcija</option>
                  <option value="coupon">Kupon za tisk</option>
                  <option value="bogo">Darilo / 1+1</option>
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
                  <option value="highest_discount">Najvišji popust %</option>
                  <option value="popular">Najbolj priljubljeno</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* FEATURED HERO DEAL BENTO GRID (DUAL LEAD) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Bento Card 1: Paket domačih dobrot Kras & Istra (7 cols on md) */}
            <div className="md:col-span-7 rounded-2xl bg-surface-container-lowest overflow-hidden shadow-sm border border-surface-container/60 flex flex-col justify-between group">
              <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-surface-container-high">
                <img 
                  src={HERO_BENTO_DEALS[0].image}
                  alt={HERO_BENTO_DEALS[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"></div>
                
                {/* Badges on Image */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-tertiary text-on-tertiary font-label-caps text-[10px] sm:text-xs uppercase tracking-wider font-bold">
                    Super Deal
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface font-label-caps text-[10px] sm:text-xs uppercase font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-secondary" />
                    Lokalni ponudniki
                  </span>
                </div>
                <div className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-error-container text-on-error-container font-label-md text-xs sm:text-sm font-bold shadow">
                  {HERO_BENTO_DEALS[0].discount}
                </div>

                {/* Bottom of Image Context */}
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <div className="font-label-caps text-[11px] uppercase text-white/80 tracking-wider">
                    {HERO_BENTO_DEALS[0].subtitle}
                  </div>
                  <div className="font-headline-sm text-base sm:text-lg font-bold text-white leading-tight">
                    {HERO_BENTO_DEALS[0].title}
                  </div>
                </div>
              </div>

              {/* Bento Card Content & Promo Code Action */}
              <div className="p-4 sm:p-5 flex flex-col gap-3.5">
                <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                  {HERO_BENTO_DEALS[0].description}
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-surface-container/60">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-surface-container-lowest font-mono font-bold text-primary tracking-wider text-xs sm:text-sm select-all border border-surface-container">
                      {HERO_BENTO_DEALS[0].code}
                    </div>
                    <button 
                      onClick={() => handleCopy(HERO_BENTO_DEALS[0].code!, 'hero-code')}
                      className="p-1.5 rounded-md hover:bg-surface-container text-primary transition-colors cursor-pointer" 
                      title="Kopiraj kodo" 
                      type="button"
                    >
                      {copiedCodeId === 'hero-code' ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {copiedCodeId === 'hero-code' && (
                      <span className="text-[11px] font-bold text-secondary">Kopirano!</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="font-label-caps text-[11px] text-secondary font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Preverjeno danes
                    </span>
                    <a 
                      href={HERO_BENTO_DEALS[0].link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold hover:bg-primary-container transition-colors inline-flex items-center gap-1"
                    >
                      <span>Uveljavi popust</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Big Bang Tehnika & Boni (5 cols on md) */}
            <div className="md:col-span-5 rounded-2xl bg-surface-container-lowest p-4 sm:p-5 shadow-sm border border-surface-container/60 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary text-on-primary font-bold flex items-center justify-center text-xs tracking-tighter shadow-xs">
                      BB
                    </div>
                    <div>
                      <span className="font-label-lg text-xs sm:text-sm font-bold text-on-surface">Big Bang Slovenija</span>
                      <div className="font-label-caps text-[11px] text-outline flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-secondary" />
                        Uradni trgovec
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-secondary-fixed text-on-secondary-fixed font-label-caps text-xs uppercase font-bold">
                    {HERO_BENTO_DEALS[1].discount}
                  </span>
                </div>

                <div className="pt-1">
                  <div className="font-headline-sm text-sm sm:text-base font-bold text-on-surface leading-snug">
                    {HERO_BENTO_DEALS[1].title}
                  </div>
                  <p className="font-body-sm text-xs text-on-surface-variant pt-2 leading-relaxed">
                    {HERO_BENTO_DEALS[1].description}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container/60">
                  <div className="space-y-0.5">
                    <div className="font-label-caps text-[10px] text-outline uppercase">Veljavnost akcije</div>
                    <div className="font-label-md text-xs text-error font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{HERO_BENTO_DEALS[1].date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-label-caps text-[10px] text-outline uppercase">Skupnost</div>
                    <div className="font-label-md text-xs text-secondary font-bold">
                      {HERO_BENTO_DEALS[1].verifiedText}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-3 border-t border-surface-container-low">
                <div className="font-mono text-xs text-outline">Koda ni potrebna</div>
                <a 
                  href={HERO_BENTO_DEALS[1].link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Odpri akcijo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>

          {/* CURATED FEED OF ACTIVE DEALS */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between pt-1">
              <h2 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                <span>Aktualne ugodnosti &amp; kuponi</span>
                <span className="font-label-md text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-normal">
                  Prikazano {visibleDeals.length} od {filteredDeals.length}
                </span>
              </h2>
              <div className="hidden sm:flex items-center gap-1 text-outline font-label-sm text-xs">
                <span>Razvrščeno po:</span>
                <span className="text-primary font-semibold">Priporočeno za vas</span>
              </div>
            </div>

            {/* List of Deals */}
            {visibleDeals.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50 flex flex-col items-center gap-2">
                <Percent className="w-8 h-8 text-outline/50" />
                <p className="font-headline-sm text-base font-bold text-on-surface">Ni najdenih ugodnosti</p>
                <p className="font-body-sm text-xs text-outline max-w-sm">
                  Za izbrane filtre ali iskalni niz trenutno ni zadetkov med popusti. Poskusite ponastaviti filtre.
                </p>
                <button 
                  onClick={() => { setSelectedStatus('all'); setSelectedCategory('all'); setSelectedRegion('all'); setSelectedType('all'); setLocalSearch(''); }}
                  className="mt-2 px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl"
                >
                  Prikaži vse ugodnosti
                </button>
              </div>
            ) : (
              visibleDeals.map((deal) => {
                const currentVotes = votesMap[deal.id] ?? deal.votes;
                const hasVoted = votedSet.has(deal.id);
                const isCopied = copiedCodeId === deal.id;

                return (
                  <article 
                    key={deal.id}
                    className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 sm:gap-5 items-start border border-surface-container/60"
                  >
                    {/* Partner Icon / Avatar */}
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-lg sm:text-xl shadow-xs ${deal.partnerLogoBg || 'bg-surface-container-high text-primary'}`}>
                      {deal.partnerInitial || deal.partner.substring(0, 2)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2 w-full">
                      {/* Top Bar: Partner & Discount Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-label-lg text-xs sm:text-sm font-bold text-on-surface">
                            {deal.partner}
                          </span>
                          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-surface-container text-outline uppercase font-semibold">
                            {deal.categoryName}
                          </span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-xs sm:text-sm">
                          {deal.discount}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface leading-snug">
                        {deal.title}
                      </h3>
                      <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                        {deal.description}
                      </p>

                      {/* Action & Metadata Row */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-outline font-label-md text-xs">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {deal.verifiedText && (
                            <span className="flex items-center gap-1 text-secondary font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{deal.verifiedText}</span>
                            </span>
                          )}
                          <span className="hidden sm:inline">•</span>
                          <span className="flex items-center gap-1 text-error font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{deal.date}</span>
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate max-w-[140px]">{deal.region}</span>
                        </div>

                        <div className="flex items-center gap-2 ml-auto sm:ml-0">
                          {/* Upvote counter */}
                          <button
                            onClick={() => handleVote(deal.id, deal.votes)}
                            disabled={hasVoted}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              hasVoted 
                                ? 'bg-secondary/10 text-secondary' 
                                : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                            }`}
                            title="Glasuj za to ugodnost"
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                            <span>{currentVotes}</span>
                          </button>

                          {/* Bookmark */}
                          <BookmarkButton 
                            id={deal.id} 
                            data={{
                              type: 'deal',
                              category: 'deals',
                              title: deal.title,
                              price: deal.discount,
                              author: deal.partner,
                              date: deal.date,
                              description: deal.description,
                            }}
                          />

                          {/* Share */}
                          <ShareMenu id={deal.id} />
                        </div>
                      </div>

                      {/* Promo code or Direct link CTA bar */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
                        {deal.code ? (
                          <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-xl border border-surface-container/60">
                            <span className="font-label-caps text-[10px] text-outline uppercase px-1.5 font-bold">Koda:</span>
                            <span className="font-mono font-bold text-primary px-2.5 py-0.5 bg-surface-container-lowest rounded-lg select-all text-xs border border-surface-container">
                              {deal.code}
                            </span>
                            <button 
                              onClick={() => handleCopy(deal.code!, deal.id)}
                              className="p-1 text-outline hover:text-primary transition-colors cursor-pointer" 
                              title="Kopiraj" 
                              type="button"
                            >
                              {isCopied ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                            </button>
                            {isCopied && <span className="text-[11px] font-bold text-secondary pr-1">Kopirano!</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-outline italic">Koda ni potrebna (akcijska cena)</span>
                        )}

                        <a 
                          href={deal.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary-container transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <span>{deal.dealType === 'flyer' ? 'Prelistaj letak' : 'Uveljavi popust'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>

                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Pagination & Infinite Stream Trigger */}
          {visibleDeals.length > 0 && hasMore && (
            <div className="p-5 rounded-2xl bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-4 border border-surface-container/60 shadow-xs">
              <div className="font-body-sm text-xs sm:text-sm text-on-surface-variant text-center sm:text-left">
                Prikazanih <strong>{visibleDeals.length}</strong> od skupaj <strong>{filteredDeals.length}</strong> aktivnih popustov za Slovenijo.
              </div>
              <button 
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-primary font-label-lg text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-surface-container" 
                type="button"
              >
                {isLoadingMore ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>{isLoadingMore ? 'Nalaganje ugodnosti...' : 'Naloži naslednjih 10 popustov'}</span>
              </button>
            </div>
          )}

          {visibleDeals.length > 0 && !hasMore && (
            <div className="text-center py-4 font-body-sm text-xs text-outline border-t border-surface-container-low">
              Prikazane so vse ugodnosti ({filteredDeals.length} popustov).
            </div>
          )}

        </div>

        {/* ============================================================== */}
        {/* RIGHT RAIL / CIVIC DEALS UTILITY (xl:col-span-4) */}
        {/* ============================================================== */}
        <aside className="xl:col-span-4 flex flex-col gap-space-md xl:sticky xl:top-20 xl:max-h-[calc(100vh-5.5rem)] xl:overflow-y-auto no-scrollbar">
          
          {/* WIDGET 1: Top kode tedna */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">Top kode tedna</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[10px] uppercase font-bold">
                100% preverjeno
              </span>
            </div>
            <p className="font-body-sm text-xs text-outline leading-snug">
              Najbolj uporabljane kode za popust v zadnjih 48 urah s strani članov:
            </p>

            <div className="space-y-2.5 pt-1">
              {TOP_VOUCHER_CODES.map(item => {
                const isCopied = copiedCodeId === item.id;
                return (
                  <div 
                    key={item.id}
                    className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2 hover:bg-surface-container transition-colors border border-surface-container/50"
                  >
                    <div className="min-w-0">
                      <div className="font-label-lg text-xs font-bold text-on-surface truncate">{item.store}</div>
                      <div className="font-label-sm text-[11px] text-outline truncate">{item.description}</div>
                    </div>
                    <button 
                      onClick={() => handleCopy(item.code, item.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-mono text-xs font-bold shadow-xs hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1 shrink-0 cursor-pointer border border-surface-container"
                      type="button"
                      title="Klikni za kopiranje kode"
                    >
                      <span>{item.code}</span>
                      {isCopied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WIDGET 2: Katalogi & Letaki */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Katalogi &amp; Letaki</span>
              </h3>
              <span className="font-label-caps text-[10px] text-outline uppercase font-semibold">Ta teden</span>
            </div>

            <div className="space-y-2">
              {CATALOGUES_DATA.map(item => (
                <a 
                  key={item.id}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container-low transition-colors group border border-transparent hover:border-surface-container"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${item.logoBg}`}>
                      {item.initial}
                    </div>
                    <div className="min-w-0">
                      <div className="font-label-md text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </div>
                      <div className="font-label-caps text-[10px] text-outline">
                        {item.validity} • {item.pages}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-outline group-hover:text-primary -rotate-90 shrink-0" />
                </a>
              ))}
            </div>
          </div>

          {/* WIDGET 3: Kalkulator prihrankov */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-primary-fixed/30 via-surface-container-low to-surface-container-lowest shadow-sm border border-surface-container/60 space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">Kalkulator prihrankov</h3>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant leading-snug">
              Izberite kategorije in ocenite svoj letni prihranek z uporabo ugodnosti na portalu:
            </p>

            {/* Total Display */}
            <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs text-center border border-surface-container/60">
              <span className="font-display-xl text-3xl sm:text-4xl text-primary font-black">
                {calculatedSavings} €
              </span>
              <span className="block font-label-caps text-[10px] text-outline uppercase tracking-wider mt-1 font-semibold">
                Letni ocenjeni prihranek na gospodinjstvo
              </span>
            </div>

            {/* Interactive Category Checkboxes */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => setCalcCategories(c => ({ ...c, fuel: !c.fuel }))}
                className={`p-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                  calcCategories.fuel ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'bg-surface-container text-outline'
                }`}
              >
                <span>Gorivo</span>
                <span className="text-[11px]">~40 €</span>
              </button>
              <button
                type="button"
                onClick={() => setCalcCategories(c => ({ ...c, groceries: !c.groceries }))}
                className={`p-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                  calcCategories.groceries ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'bg-surface-container text-outline'
                }`}
              >
                <span>Trgovine</span>
                <span className="text-[11px]">~95 €</span>
              </button>
              <button
                type="button"
                onClick={() => setCalcCategories(c => ({ ...c, tech: !c.tech }))}
                className={`p-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                  calcCategories.tech ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'bg-surface-container text-outline'
                }`}
              >
                <span>Tehnika</span>
                <span className="text-[11px]">~50 €</span>
              </button>
              <button
                type="button"
                onClick={() => setCalcCategories(c => ({ ...c, tourism: !c.tourism }))}
                className={`p-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                  calcCategories.tourism ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'bg-surface-container text-outline'
                }`}
              >
                <span>Turizem</span>
                <span className="text-[11px]">~60 €</span>
              </button>
            </div>
          </div>

          {/* WIDGET 4: Tedenski opomnik akcij (Newsletter) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/60 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-secondary" />
              <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">Tedenski opomnik akcij</h3>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant leading-snug">
              Prejmite vsak četrtek zjutraj pregled 10 največjih popustov, novih letakov in ekskluzivnih kod neposredno v e-nabiralnik.
            </p>

            {newsletterSubscribed ? (
              <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl text-xs text-secondary font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Uspešno ste prijavljeni na tedenski izbor!</span>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newsletterEmail) return;
                  setNewsletterSubscribed(true);
                }}
                className="space-y-2.5"
              >
                <input 
                  type="email" 
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Vaš e-poštni naslov..." 
                  required
                  className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container transition-colors border border-surface-container/60"
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="newsletter-agree" 
                    required 
                    defaultChecked
                    className="rounded text-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="newsletter-agree" className="font-label-md text-[11px] text-outline cursor-pointer">
                    Strinjam se s tedenskim prejemom akcij
                  </label>
                </div>
                <button 
                  type="submit"
                  className="w-full py-2 rounded-xl bg-primary text-on-primary font-label-lg text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs cursor-pointer"
                >
                  Prijava na tedenski izbor
                </button>
              </form>
            )}
          </div>

        </aside>

      </div>

      {/* 4. MODAL: PREDLAGAJ ALI OBJAVI UGODNOST */}
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
                <p>Hvala! Ugodnost je bila uspešno dodana v pregled in prikazana na portalu.</p>
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
    </main>
  );
}
