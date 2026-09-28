import { useState, useEffect, useMemo } from 'react';
import { BookOpen, PlusCircle, ChevronDown } from 'lucide-react';
import { BlogPost } from './posts/BlogPost';
import { FirestorePostCard } from './posts/FirestorePostCard';
import { ComposeModal } from './ComposeModal';
import { subscribeToPosts, FirestorePost } from '../services/firestoreService';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { INITIAL_BLOG_POSTS, MockBlogItem } from '../data/mockFeedData';
import type { PostDetailTarget } from '../types';
import { useCategories } from '../hooks/useCategories';
import { isItemActivelyPromoted } from '../services/promotionService';
import { BlogCategoryLocationFilter } from './blog/BlogCategoryLocationFilter';

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
  const [selectedTertiaryCategory, setSelectedTertiaryCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');
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
    setSelectedTertiaryCategory('all');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedTertiaryCategory('all');
    setSelectedRegion('all');
    setSortOption('newest');
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

      const textToMatch = `${post.title} ${post.content} ${post.authorName || ''} ${post.category || ''} ${post.categoryName || ''} ${post.subcategory || ''} ${post.subcategoryName || ''} ${post.thirdLevelCategory || ''} ${post.make || ''} ${(post.tags || []).join(' ')} ${post.region || ''} ${post.location || ''}`;
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

      // Match 3rd Level Category (Destinacija / Zvrst / Ključna tema / Oznaka)
      let matchesTertiary = true;
      if (selectedTertiaryCategory !== 'all') {
        const tLower = selectedTertiaryCategory.toLowerCase().trim();
        const postTertiary = (post.thirdLevelCategory || post.make || '').toLowerCase().trim();
        const postTitle = (post.title || '').toLowerCase();
        const postContent = (post.content || '').toLowerCase();
        const postTags = Array.isArray(post.tags) ? post.tags.map(t => String(t).toLowerCase()).join(' ') : String(post.tags || '').toLowerCase();

        matchesTertiary = postTertiary === tLower ||
                          postTertiary.includes(tLower) ||
                          postTags.includes(tLower) ||
                          postTitle.includes(tLower) ||
                          postContent.includes(tLower);
      }

      const matchesReg = selectedRegion === 'all' ||
        (post.region && post.region.toLowerCase().includes(selectedRegion.toLowerCase())) ||
        (post.location && post.location.toLowerCase().includes(selectedRegion.toLowerCase()));

      return matchesSearch && matchesCat && matchesSubcat && matchesTertiary && matchesReg;
    });
  }, [firestorePosts, searchQuery, selectedCategory, activeCategoryObj, selectedSubcategory, selectedSubcatObj, selectedTertiaryCategory, selectedRegion]);

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
      // Actively promoted items first
      const aPromoted = checkBlogPromoted(a);
      const bPromoted = checkBlogPromoted(b);
      if (aPromoted && !bPromoted) return -1;
      if (!aPromoted && bPromoted) return 1;

      // Apply sorting option
      if (sortOption === 'popular') {
        const likesA = (a.data.likesCount || 0) + (a.data.viewsCount || 0);
        const likesB = (b.data.likesCount || 0) + (b.data.viewsCount || 0);
        return likesB - likesA;
      }
      if (sortOption === 'comments') {
        return (b.data.commentsCount || 0) - (a.data.commentsCount || 0);
      }
      // 'newest' default
      const dateA = a.data.createdAt ? new Date(a.data.createdAt).getTime() : 0;
      const dateB = b.data.createdAt ? new Date(b.data.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    return copy;
  }, [allItems, selectedCategory, selectedSubcategory, sortOption]);

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

      {/* DEDICATED CATEGORY BADGES AND COMPACT DROPDOWN FILTERS MODULE */}
      <BlogCategoryLocationFilter
        categories={categories}
        categoryCounts={categoryCounts}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
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

