import { useState, useEffect, useMemo } from 'react';
import { FileText, PlusCircle, Search, ChevronDown, Sparkles, BookOpen, Tag, Layers, MapPin } from 'lucide-react';
import { BlogPost } from './posts/BlogPost';
import { FirestorePostCard } from './posts/FirestorePostCard';
import { ComposeModal } from './ComposeModal';
import { subscribeToPosts, FirestorePost } from '../services/firestoreService';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { INITIAL_BLOG_POSTS, MockBlogItem } from '../data/mockFeedData';
import type { PostDetailTarget } from '../types';
import { useCategories } from '../hooks/useCategories';
import { SLOVENIA_REGIONS } from '../services/categoryService';
import { isItemActivelyPromoted } from '../services/promotionService';

interface BlogFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function BlogFeed({ onViewChange, searchQuery = '', onNavigatePost }: BlogFeedProps) {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Dynamic categories for blog
  const { categories } = useCategories('blog');

  useEffect(() => {
    const unsub = subscribeToPosts((posts) => {
      // Filter posts that are blog/articles (not deals)
      const blogFirestorePosts = posts.filter(p => p.category !== 'deal');
      setFirestorePosts(blogFirestorePosts);
    });
    return () => unsub();
  }, []);

  // Active Category Object
  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return categories.find(c => c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  // All available subcategories (when 'all' is selected, show all unique subcategories across all blog categories)
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

  // Category counts based on real user blog posts
  const categoryCounts = useMemo(() => {
    const validPosts = firestorePosts.filter(p => {
      const isDeal = p.category === 'deal' || p.category === 'ugodnosti' || p.category?.startsWith('deal') || p.categoryName === 'Ugodnosti';
      return !isDeal;
    });
    const counts: Record<string, number> = { all: validPosts.length };
    for (const cat of categories) {
      counts[cat.id] = validPosts.filter(p => {
        const cLower = cat.name.toLowerCase().trim();
        const pCat = (p.category || '').toLowerCase().trim();
        const pCatName = (p.categoryName || '').toLowerCase().trim();
        return p.category === cat.id || pCat === cLower || pCatName === cLower || pCat.includes(cLower) || pCatName.includes(cLower);
      }).length;
    }
    return counts;
  }, [firestorePosts, categories]);

  // Filter real Firestore posts
  const filteredFirestore = useMemo(() => {
    return firestorePosts.filter(post => {
      // Strictly exclude deals and posts in category Ugodnosti from Blog feed
      const isDeal = post.category === 'deal' || 
                     post.category === 'ugodnosti' || 
                     post.category?.startsWith('deal') || 
                     post.categoryName === 'Ugodnosti' || 
                     post.categoryName === 'Ugodnost' ||
                     post.id.startsWith('deal-') || 
                     post.id.startsWith('hero-bento-');
      if (isDeal) return false;

      const textToMatch = `${post.title} ${post.content} ${post.authorName || ''} ${post.category || ''} ${post.categoryName || ''} ${post.subcategory || ''} ${post.subcategoryName || ''} ${post.region || ''} ${post.location || ''}`;
      const matchesSearch = matchesSearchAndCategory(textToMatch, 'blog', searchQuery);
      
      const pCatLower = (post.category || '').toLowerCase().trim();
      const pCatNameLower = (post.categoryName || '').toLowerCase().trim();

      const matchesCat = selectedCategory === 'all' || 
        post.category === selectedCategory ||
        pCatLower === selectedCategory.toLowerCase().trim() ||
        pCatNameLower === selectedCategory.toLowerCase().trim() ||
        (activeCategoryObj && (
          pCatLower === activeCategoryObj.name.toLowerCase().trim() ||
          pCatNameLower === activeCategoryObj.name.toLowerCase().trim() ||
          pCatLower.includes(activeCategoryObj.name.toLowerCase().trim()) ||
          pCatNameLower.includes(activeCategoryObj.name.toLowerCase().trim())
        ));

      const pSubLower = (post.subcategory || '').toLowerCase().trim();
      const pSubNameLower = (post.subcategoryName || '').toLowerCase().trim();
      const targetSubLower = selectedSubcategory.toLowerCase().trim();

      const matchesSubcat = selectedSubcategory === 'all' ||
        post.subcategory === selectedSubcategory ||
        pSubLower === targetSubLower ||
        pSubNameLower === targetSubLower ||
        (selectedSubcatObj && (
          pSubLower === selectedSubcatObj.name.toLowerCase().trim() ||
          pSubLower === selectedSubcatObj.id.toLowerCase().trim() ||
          pSubNameLower === selectedSubcatObj.name.toLowerCase().trim() ||
          pSubNameLower === selectedSubcatObj.id.toLowerCase().trim()
        ));

      const matchesReg = selectedRegion === 'all' ||
        (post.region && post.region.toLowerCase().includes(selectedRegion.toLowerCase())) ||
        (post.location && post.location.toLowerCase().includes(selectedRegion.toLowerCase()));

      return matchesSearch && matchesCat && matchesSubcat && matchesReg;
    });
  }, [firestorePosts, searchQuery, selectedCategory, activeCategoryObj, selectedSubcategory, selectedSubcatObj, selectedRegion]);

  // Combined pool of all blog items
  type UnifiedBlogItem = { type: 'firestore'; data: FirestorePost };

  const allItems: UnifiedBlogItem[] = useMemo(() => {
    return filteredFirestore.map(p => ({ type: 'firestore' as const, data: p }));
  }, [filteredFirestore]);

  // Helper to check promotion status
  const checkBlogPromoted = (item: UnifiedBlogItem): boolean => {
    const post = item.data;
    if (post.promotion) {
      return isItemActivelyPromoted(post.promotion, 'blog', selectedCategory, selectedSubcategory);
    }
    if (post.isPromoted) {
      if (post.promotedUntil) {
        return new Date(post.promotedUntil).getTime() > Date.now();
      }
      return true;
    }
    return false;
  };

  // Sorting: Actively promoted (PROMO / OGLAS) articles are positioned FIRST in the feed
  const sortedItems = useMemo(() => {
    const copy = [...allItems];
    copy.sort((a, b) => {
      const aPromoted = checkBlogPromoted(a);
      const bPromoted = checkBlogPromoted(b);
      if (aPromoted && !bPromoted) return -1;
      if (!aPromoted && bPromoted) return 1;
      return 0;
    });
    return copy;
  }, [allItems, selectedCategory, selectedSubcategory]);

  const PAGE_SIZE = 10;
  const currentVisibleLimit = page * PAGE_SIZE;
  const visibleItems = sortedItems.slice(0, currentVisibleLimit);
  const hasMore = currentVisibleLimit < sortedItems.length;

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoading(false);
    }, 450);
  };

  return (
    <div className="flex flex-col gap-space-md">
      {/* Header section */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <BookOpen className="w-[1em] h-[1em] text-primary shrink-0" />
              <span>Blog članki in mnenja skupnosti</span>
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
              Poglobljeni zapisi, potopisi, praktični vodniki za dom ter izkušnje slovenskih ustvarjalcev in strokovnjakov.
            </p>
          </div>
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="flex-shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Napiši blog članek</span>
          </button>
        </div>
      </div>

      {/* Dynamic Categories filter */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1">
        <button
          onClick={() => handleCategorySelect('all')}
          className={`px-3.5 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-primary text-on-primary font-bold'
              : 'bg-surface-container-lowest hover:bg-surface-container border border-surface-container text-on-surface-variant'
          }`}
        >
          <span>Vse teme</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
            {categoryCounts.all || 0}
          </span>
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
            <span>{cat.icon || '📝'}</span>
            <span>{cat.name}</span>
            {categoryCounts[cat.id] !== undefined && categoryCounts[cat.id] > 0 && (
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'}`}>
                {categoryCounts[cat.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Subcategories filter - always visible when subcategories are available */}
      {availableSubcategories.length > 0 && (
        <div className="bg-surface-container-low/60 p-2 sm:p-2.5 rounded-xl border border-surface-container/60 flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="text-[11px] font-semibold text-outline uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-primary" />
            <span>Podteme:</span>
          </div>
          <button
            onClick={() => { setSelectedSubcategory('all'); setPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
              selectedSubcategory === 'all'
                ? 'bg-surface-container-lowest text-primary font-bold shadow-xs border border-surface-container'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            Vse podteme
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

      {/* Localization filter */}
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
                {reg.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body-sm text-xs text-outline">Prikazanih {allItems.length} člankov</span>
        </div>
      </div>

      {/* Cards List: 10 cards initially, 10 more on each load */}
      <div className="flex flex-col gap-space-md">
        {visibleItems.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50">
            Ni najdenih blog člankov za izbrane kriterije.
          </div>
        ) : (
          visibleItems.map((item, idx) => (
            <FirestorePostCard 
              key={`fs-post-${item.data.id}-${idx}`} 
              post={item.data} 
            />
          ))
        )}
      </div>

      {/* Load more button */}
      {visibleItems.length > 0 && hasMore && (
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
            <span>{isLoading ? 'Nalaganje člankov...' : 'Naloži še člankov'}</span>
          </button>
          <span className="font-body-sm text-xs text-outline">
            Prikazano {visibleItems.length} od {sortedItems.length} člankov
          </span>
        </div>
      )}

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        initialType="post" 
      />
    </div>
  );
}
