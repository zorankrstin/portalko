import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  MapPin,
  UploadCloud,
  Image as ImageIcon,
  Link as LinkIcon,
  Share2,
  Loader2,
  Trash2
} from 'lucide-react';
import { RichTextEditor, RichTextEditorRef } from './RichTextEditor';
import { compressImageFileToDataUrl } from '../utils/imageUtils';
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
import { UserDisplayName } from './common/UserDisplayName';
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
    oldPrice: '',
    newPrice: '',
    expirationDate: '',
    link: '',
    date: 'Velja do konca meseca',
    image: '',
    images: [] as string[],
    embedCode: '',
  });
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('upload');
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);
  const [compressingProgress, setCompressingProgress] = useState('');
  const [urlPhotoInput, setUrlPhotoInput] = useState('');
  const editorRef = useRef<RichTextEditorRef>(null);
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
          discount: p.discount || p.price || 'Ugodnost',
          oldPrice: p.oldPrice,
          newPrice: p.newPrice,
          expirationDate: p.expirationDate,
          dealType: 'code' as const,
          dealTypeName: 'Uporabniški kupon',
          date: p.expirationDate ? `Velja do ${p.expirationDate}` : 'Pravkar objavljeno',
          description: p.content,
          code: p.promoCode || p.title.match(/[A-Z0-9]{4,10}/)?.[0] || undefined,
          link: p.dealLink || '#',
          votes: (p.likesCount || 0) + 1,
          verifiedText: 'Članski predlog',
          statusTag: 'today' as const,
          image: p.imageUrl || (p.images && p.images[0]) || CATEGORY_IMAGE_FALLBACKS.tehnika,
          images: p.images || p.imageUrls || (p.imageUrl ? [p.imageUrl] : undefined),
          embedCode: p.embedCode,
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

  // All available subcategories (when 'all' is selected, show all unique subcategories across all deals categories)
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

  // Only user-submitted deals (no mock data)
  const combinedDeals = useMemo(() => {
    return userDeals;
  }, [userDeals]);

  // Dynamic category counts based on real deals
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: combinedDeals.length,
    };
    for (const cat of categories) {
      const cName = cat.name.toLowerCase().trim();
      const cId = cat.id.toLowerCase().trim();
      counts[cat.id] = combinedDeals.filter(d => {
        const dCat = (d.category || '').toLowerCase().trim();
        const dCatName = (d.categoryName || '').toLowerCase().trim();
        return d.category === cat.id || 
          dCat === cId || 
          dCat === cName || 
          dCatName.includes(cName) || 
          cName.includes(dCat);
      }).length;
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
        const dCat = (deal.category || '').toLowerCase().trim();
        const dCatName = (deal.categoryName || '').toLowerCase().trim();
        const targetCat = selectedCategory.toLowerCase().trim();
        const matchesCat = deal.category === selectedCategory ||
          dCat === targetCat ||
          dCatName === targetCat ||
          (activeCategoryObj && (
            dCat === activeCategoryObj.name.toLowerCase().trim() ||
            dCat === activeCategoryObj.id.toLowerCase().trim() ||
            dCatName.includes(activeCategoryObj.name.toLowerCase().trim()) ||
            activeCategoryObj.name.toLowerCase().trim().includes(dCat)
          ));
        if (!matchesCat) return false;
      }

      // 5. Subcategory filter
      if (selectedSubcategory !== 'all') {
        const subId = ((deal as any).subcategory || '').toLowerCase().trim();
        const subName = ((deal as any).subcategoryName || '').toLowerCase().trim();
        const targetSub = selectedSubcategory.toLowerCase().trim();
        const matchesSub = subId === targetSub ||
          subName === targetSub ||
          (selectedSubcatObj && (
            subId === selectedSubcatObj.id.toLowerCase().trim() ||
            subId === selectedSubcatObj.name.toLowerCase().trim() ||
            subName === selectedSubcatObj.id.toLowerCase().trim() ||
            subName === selectedSubcatObj.name.toLowerCase().trim()
          ));
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

  // Multi-photo upload and management handlers
  const handleMultiPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsCompressingPhotos(true);
    const total = files.length;
    const newUploadedUrls: string[] = [];
    try {
      for (let i = 0; i < total; i++) {
        setCompressingProgress(`Optimiziram sliko ${i + 1} od ${total}...`);
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImageFileToDataUrl(file, 1200);
        newUploadedUrls.push(dataUrl);
      }
      setModalForm(prev => {
        const merged = [...prev.images, ...newUploadedUrls];
        return {
          ...prev,
          images: merged,
          image: prev.image || merged[0] || '',
        };
      });
    } catch (err) {
      console.error('Napaka pri stiskanju fotografij:', err);
    } finally {
      setIsCompressingPhotos(false);
      setCompressingProgress('');
      e.target.value = '';
    }
  };

  const handleAddPhotoUrl = () => {
    const trimmed = urlPhotoInput.trim();
    if (!trimmed) return;
    let finalUrl = trimmed;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      finalUrl = `https://${trimmed}`;
    }
    setModalForm(prev => {
      const merged = [...prev.images, finalUrl];
      return {
        ...prev,
        images: merged,
        image: prev.image || finalUrl,
      };
    });
    setUrlPhotoInput('');
  };

  const handleRemovePhoto = (idxToRemove: number) => {
    setModalForm(prev => {
      const updated = prev.images.filter((_, idx) => idx !== idxToRemove);
      return {
        ...prev,
        images: updated,
        image: updated[0] || '',
      };
    });
  };

  const handleSetPrimaryPhoto = (idxToPrimary: number) => {
    setModalForm(prev => {
      if (idxToPrimary <= 0 || idxToPrimary >= prev.images.length) return prev;
      const target = prev.images[idxToPrimary];
      const remaining = prev.images.filter((_, idx) => idx !== idxToPrimary);
      const reordered = [target, ...remaining];
      return {
        ...prev,
        images: reordered,
        image: target,
      };
    });
  };

  // Submit modal handler
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.title || !modalForm.store) return;

    const fallbackImg = CATEGORY_IMAGE_FALLBACKS[modalForm.category] || CATEGORY_IMAGE_FALLBACKS.tehnika;
    const primaryImg = modalForm.images[0] || modalForm.image || fallbackImg;
    const allImages = modalForm.images.length > 0 ? modalForm.images : (modalForm.image ? [modalForm.image] : [fallbackImg]);

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
      oldPrice: modalForm.oldPrice || undefined,
      newPrice: modalForm.newPrice || undefined,
      expirationDate: modalForm.expirationDate || undefined,
      dealType: modalForm.code ? 'code' : 'sale',
      dealTypeName: modalForm.code ? 'Koda za popust' : 'Letak & Akcija',
      date: modalForm.expirationDate ? `Velja do ${modalForm.expirationDate}` : (modalForm.date || 'Velja do konca meseca'),
      description: modalForm.description || 'Ugodnost, ki jo je predlagal član skupnosti Portal.si.',
      code: modalForm.code ? modalForm.code.toUpperCase() : undefined,
      link: modalForm.link || '#',
      votes: 1,
      verifiedText: 'Novo dodano',
      statusTag: 'today',
      image: primaryImg,
      images: allImages,
      embedCode: modalForm.embedCode ? modalForm.embedCode.trim() : undefined,
    };

    // Prepend locally
    setUserDeals(prev => [newDeal, ...prev]);

    // Also persist to Firestore if available
    try {
      if (currentUser) {
        await createPostInFirestore({
          title: `[Ugodnost] ${modalForm.title}`,
          content: modalForm.description || `${modalForm.title}. Trgovec: ${modalForm.store}. Koda: ${modalForm.code || 'Brez kode'}`,
          category: 'deal',
          categoryName: 'Ugodnosti',
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          authorAvatar: currentUser.avatar,
          price: modalForm.newPrice || modalForm.discount,
          oldPrice: modalForm.oldPrice || undefined,
          newPrice: modalForm.newPrice || undefined,
          expirationDate: modalForm.expirationDate || undefined,
          discount: modalForm.discount || undefined,
          promoCode: modalForm.code ? modalForm.code.toUpperCase() : undefined,
          dealLink: modalForm.link || undefined,
          embedCode: modalForm.embedCode ? modalForm.embedCode.trim() : undefined,
          likesCount: 1,
          commentsCount: 0,
          imageUrl: primaryImg,
          images: allImages,
          imageUrls: allImages,
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
        oldPrice: '',
        newPrice: '',
        expirationDate: '',
        link: '',
        date: 'Velja do konca meseca',
        image: '',
        images: [],
        embedCode: '',
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
              <span>Akcije</span>
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
              Ugodnosti, popusti, kuponi, nakupi in akcije v slovenskih trgovinah ter na spletu.
            </p>
          </div>
          <button 
            onClick={() => setIsSubmitModalOpen(true)}
            id="btn-submit-deal"
            className="flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Dodaj</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & SEARCH MODULE */}
      <div className="flex flex-col gap-3.5 p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/50">
        
        {/* Status Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-0.5">
          <button 
            onClick={() => { setSelectedStatus('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              selectedStatus === 'all' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Star className="w-3.5 h-3.5" />
            <span>Vse ponudbe</span>
          </button>
          <button 
            onClick={() => { setSelectedStatus('expiring'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              selectedStatus === 'expiring' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Timer className="w-3.5 h-3.5 text-error" />
            <span>Poteče kmalu</span>
          </button>
          <button 
            onClick={() => { setSelectedStatus('today'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              selectedStatus === 'today' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Zap className="w-3.5 h-3.5 text-secondary" />
            <span>Danes dodano</span>
          </button>
          <button 
            onClick={() => { setSelectedStatus('exclusive'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              selectedStatus === 'exclusive' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Award className="w-3.5 h-3.5 text-primary" />
            <span>Ekskluzivno</span>
          </button>
          <button 
            onClick={() => { setSelectedStatus('shipping'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full font-label-md text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              selectedStatus === 'shipping' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
            type="button"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Brezplačna dostava</span>
          </button>
        </div>

        {/* Category Rail with Dynamic Categories */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 pb-0.5">
          <button 
            onClick={() => handleCategorySelect('all')}
            className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-xl font-label-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
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

        {/* Subcategory Rail - always visible when subcategories are available */}
        {availableSubcategories.length > 0 && (
          <div className="bg-surface-container-low/60 p-2 sm:p-2.5 rounded-xl border border-surface-container/60 flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
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
          visibleDeals.map((deal, idx) => {
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
                key={`deal-${deal.id}-${idx}`}
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
                            <UserDisplayName name={deal.partner} role={deal.partnerRole} />
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
                            price: deal.newPrice || deal.discount,
                            discount: deal.discount,
                            oldPrice: deal.oldPrice,
                            newPrice: deal.newPrice,
                            expirationDate: deal.expirationDate,
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

                    {/* Pricing Highlight: Old price & New price */}
                    {(deal.newPrice || deal.oldPrice) && (
                      <div className="flex items-center gap-2.5 my-1.5 p-2 rounded-xl bg-surface-container-low/80 border border-surface-container/60 w-fit flex-wrap">
                        {deal.newPrice && (
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] uppercase font-bold text-outline">Akcija:</span>
                            <span className="font-headline-sm text-base sm:text-lg font-black text-secondary">
                              {deal.newPrice}
                            </span>
                          </div>
                        )}
                        {deal.oldPrice && (
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] text-outline">Redna:</span>
                            <span className="text-xs line-through text-outline font-medium">
                              {deal.oldPrice}
                            </span>
                          </div>
                        )}
                        {deal.discount && (
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-secondary/15 text-secondary border border-secondary/20">
                            {deal.discount}
                          </span>
                        )}
                      </div>
                    )}

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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-surface-container-lowest p-5 sm:p-6 shadow-2xl space-y-4 border border-surface-container animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
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
                    <label className="block font-label-md text-on-surface font-semibold mb-1">Višina popusta / Opis</label>
                    <input 
                      type="text" 
                      value={modalForm.discount}
                      onChange={(e) => setModalForm({ ...modalForm, discount: e.target.value })}
                      placeholder="npr. -20% ali 1+1 gratis" 
                      className="w-full bg-surface-container-low px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                    />
                  </div>
                </div>

                {/* Old Price & New Price & Expiration Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-surface-container-low/70 border border-surface-container">
                  <div>
                    <label className="block font-label-md text-outline font-semibold mb-1">
                      <span className="line-through">Stara cena</span>
                    </label>
                    <input 
                      type="text" 
                      value={modalForm.oldPrice}
                      onChange={(e) => {
                        const oldP = e.target.value;
                        const newP = modalForm.newPrice;
                        const cleanedO = parseFloat(oldP.replace(/[^0-9.,]/g, '').replace(',', '.'));
                        const cleanedN = parseFloat(newP.replace(/[^0-9.,]/g, '').replace(',', '.'));
                        let autoDisc = modalForm.discount;
                        if (!isNaN(cleanedO) && !isNaN(cleanedN) && cleanedO > 0 && cleanedN > 0 && cleanedO > cleanedN) {
                          autoDisc = `-${Math.round(((cleanedO - cleanedN) / cleanedO) * 100)}%`;
                        }
                        setModalForm({ ...modalForm, oldPrice: oldP, discount: autoDisc });
                      }}
                      placeholder="npr. 99,99 €" 
                      className="w-full bg-surface-container-lowest px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-secondary font-semibold mb-1">
                      Nova cena (akcijska)
                    </label>
                    <input 
                      type="text" 
                      value={modalForm.newPrice}
                      onChange={(e) => {
                        const newP = e.target.value;
                        const oldP = modalForm.oldPrice;
                        const cleanedO = parseFloat(oldP.replace(/[^0-9.,]/g, '').replace(',', '.'));
                        const cleanedN = parseFloat(newP.replace(/[^0-9.,]/g, '').replace(',', '.'));
                        let autoDisc = modalForm.discount;
                        if (!isNaN(cleanedO) && !isNaN(cleanedN) && cleanedO > 0 && cleanedN > 0 && cleanedO > cleanedN) {
                          autoDisc = `-${Math.round(((cleanedO - cleanedN) / cleanedO) * 100)}%`;
                        }
                        setModalForm({ ...modalForm, newPrice: newP, discount: autoDisc });
                      }}
                      placeholder="npr. 69,99 € (neobvezno)" 
                      className="w-full bg-surface-container-lowest px-3 py-2 rounded-xl font-body-sm font-bold text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container"
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-on-surface-variant font-semibold mb-1">
                      Datum poteka (Expiration date)
                    </label>
                    <input 
                      type="date" 
                      value={modalForm.expirationDate}
                      onChange={(e) => setModalForm({ 
                        ...modalForm, 
                        expirationDate: e.target.value,
                        date: e.target.value ? `Velja do ${new Date(e.target.value).toLocaleDateString('sl-SI')}` : modalForm.date
                      })}
                      className="w-full bg-surface-container-lowest px-3 py-2 rounded-xl font-body-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container text-xs"
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

                {/* Fotografije ugodnosti (ena ali več) */}
                <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-surface-container-low/70 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-on-surface text-xs">
                        Fotografije ponudbe / izdelka (ena ali več)
                      </span>
                      {modalForm.images.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px]">
                          {modalForm.images.length} {modalForm.images.length === 1 ? 'slika' : 'slik'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-lg text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPhotoMode('upload')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                          photoMode === 'upload' 
                            ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' 
                            : 'text-outline hover:text-on-surface'
                        }`}
                      >
                        Naloži z naprave
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoMode('url')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                          photoMode === 'url' 
                            ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' 
                            : 'text-outline hover:text-on-surface'
                        }`}
                      >
                        Spletna povezava
                      </button>
                    </div>
                  </div>

                  {photoMode === 'upload' ? (
                    <div className="flex flex-col gap-2">
                      <label className="border-2 border-dashed border-surface-container-high hover:border-primary/60 rounded-xl p-3.5 text-center cursor-pointer transition-colors bg-surface-container-lowest/50 hover:bg-surface-container-lowest flex flex-col items-center justify-center gap-1 group">
                        <UploadCloud className="w-6 h-6 text-primary group-hover:scale-110 transition-transform mb-0.5" />
                        <span className="text-xs font-semibold text-on-surface">
                          Kliknite za izbiro ene ali več fotografij
                        </span>
                        <span className="text-[10px] text-outline">
                          Podprte oblike: JPG, PNG, WEBP. Samodejno stiskanje in optimizacija.
                        </span>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*"
                          className="hidden"
                          onChange={handleMultiPhotoUpload}
                        />
                      </label>
                      {isCompressingPhotos && (
                        <div className="flex items-center gap-2 text-xs text-primary font-medium p-2 bg-primary/10 rounded-lg animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{compressingProgress || 'Optimiziram fotografije za objavo...'}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="url" 
                        value={urlPhotoInput}
                        onChange={(e) => setUrlPhotoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPhotoUrl();
                          }
                        }}
                        placeholder="https://... prilepite spletni naslov slike"
                        className="flex-1 bg-surface-container-lowest px-3 py-2 rounded-xl font-body-sm text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container"
                      />
                      <button
                        type="button"
                        onClick={handleAddPhotoUrl}
                        className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-xs font-bold text-on-surface transition-colors cursor-pointer"
                      >
                        Dodaj sliko
                      </button>
                    </div>
                  )}

                  {/* Predogled galerije naloženih slik */}
                  {modalForm.images.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-surface-container/60">
                      <div className="flex items-center justify-between text-[11px] text-outline">
                        <span>Zvezdica označi glavno naslovno sliko ponudbe:</span>
                        <span className="font-semibold text-on-surface-variant">Naloženo: {modalForm.images.length}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {modalForm.images.map((imgUrl, idx) => (
                          <div 
                            key={idx} 
                            className={`relative rounded-xl overflow-hidden aspect-video border group ${
                              idx === 0 ? 'border-primary ring-2 ring-primary/40 shadow-xs' : 'border-surface-container'
                            }`}
                          >
                            <img src={imgUrl} alt={`Fotografija ${idx + 1}`} className="w-full h-full object-cover" />
                            {idx === 0 && (
                              <span className="absolute top-1 left-1 bg-primary text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                <span>Glavna</span>
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              {idx !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryPhoto(idx)}
                                  className="p-1 rounded-md bg-surface-container-lowest/90 hover:bg-surface-container-lowest text-primary text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                                  title="Nastavi kot glavno naslovno sliko"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="p-1 rounded-md bg-error/90 hover:bg-error text-white text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                                title="Odstrani to fotografijo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Podrobnejši opis ugodnosti z obogatenim urejevalnikom (Rich Text Editor) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-label-md text-on-surface font-semibold">
                      Podrobnejši opis ugodnosti *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => editorRef.current?.openLinkDialog()}
                        className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-primary/20"
                        title="Vstavi spletno povezavo (URL link) v opis"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-primary" />
                        <span>Dodaj povezavo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => editorRef.current?.openEmbedDialog()}
                        className="px-2.5 py-1 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-secondary/25"
                        title="Vdelaj objavo z družbenih omrežij (YouTube, X, Instagram, Facebook, TikTok) ali video"
                      >
                        <Share2 className="w-3.5 h-3.5 text-secondary" />
                        <span>Vdelaj objavo</span>
                      </button>
                    </div>
                  </div>

                  <RichTextEditor
                    ref={editorRef}
                    placeholder="Podrobno opišite pogoje ugodnosti, kje in kako jo unovčiti, povezave ali dodatna navodila..."
                    initialContent={modalForm.description}
                    onChange={(html) => setModalForm(prev => ({ ...prev, description: html }))}
                    minHeight="min-h-[140px]"
                  />
                </div>

                {/* Vdelana vsebina (Embed koda / povezava z omrežij) */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-low/50 border border-surface-container">
                  <label className="flex items-center justify-between font-label-md text-outline font-semibold">
                    <span className="flex items-center gap-1.5 text-on-surface">
                      <Share2 className="w-3.5 h-3.5 text-secondary" />
                      <span>Vdelana objava z družbenih omrežij ali video (neobvezno)</span>
                    </span>
                    <span className="text-[10px] text-outline font-normal">YouTube, Instagram, Facebook, X ali &lt;iframe&gt;</span>
                  </label>
                  <input 
                    type="text" 
                    value={modalForm.embedCode}
                    onChange={(e) => setModalForm({ ...modalForm, embedCode: e.target.value })}
                    placeholder="Prilepite povezavo (npr. https://youtube.com/watch?v=... ali https://x.com/... ali iframe kodo)"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-xl font-body-sm text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container"
                  />
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
