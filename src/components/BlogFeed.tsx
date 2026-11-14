import { useState, useEffect, useMemo, useRef } from 'react';
import { BookOpen, PlusCircle, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { slugify } from '../utils/urlUtils';
import { usePageSeo } from '../services/seoSettingsService';

interface BlogFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function BlogFeed({ onViewChange, searchQuery = '', onNavigatePost }: BlogFeedProps) {
  const { currentSeo } = usePageSeo('blog');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedTertiaryCategory, setSelectedTertiaryCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const pillsScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategoryPills = (direction: 'left' | 'right') => {
    const el = pillsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  // Dynamic categories for blog
  const { categories } = useCategories('blog');

  useEffect(() => {
    const unsub = subscribeToPosts((posts) => {
      // Filter posts that are blog/articles (not deals)
      const blogFirestorePosts = posts.filter(p => p.category !== 'deal');
      setFirestorePosts(blogFirestorePosts);
    });

    const handleLocalUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<FirestorePost>;
      const newPost = customEvt.detail;
      if (newPost && newPost.category !== 'deal') {
        setFirestorePosts(prev => [newPost, ...prev.filter(p => p.id !== newPost.id)]);
      }
    };

    window.addEventListener('portal_posts_updated', handleLocalUpdate);
    return () => {
      unsub();
      window.removeEventListener('portal_posts_updated', handleLocalUpdate);
    };
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
      if (p.status === 'osnutek' || p.status === 'rejected' || p.status === 'archived') {
        return false;
      }
      const isDeal = p.category === 'deal' || 
                     p.category === 'ugodnosti' || 
                     p.category === 'akcije' ||
                     p.category === 'akcija' ||
                     p.category?.startsWith('deal') || 
                     p.categoryName === 'Ugodnosti' || 
                     p.categoryName === 'Ugodnost' ||
                     p.categoryName === 'Akcije' ||
                     p.categoryName === 'Akcija' ||
                     p.type === 'deal' ||
                     p.id === 'ldy5f0a2hzqtibpfau6g' ||
                     slugify(p.title) === 'znizane-cene-v-egiptu' ||
                     p.id.startsWith('deal-') || 
                     p.id.startsWith('hero-bento-') ||
                     Boolean(p.discount) ||
                     Boolean(p.promoCode) ||
                     Boolean(p.dealLink) ||
                     Boolean(p.price && p.category !== 'ad' && p.category !== 'event');
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
      if (post.status === 'osnutek' || post.status === 'rejected' || post.status === 'archived') {
        return false;
      }
      // Strictly exclude deals and posts in category Ugodnosti from Blog feed
      const isDeal = post.category === 'deal' || 
                     post.category === 'ugodnosti' || 
                     post.category === 'akcije' ||
                     post.category === 'akcija' ||
                     post.category?.startsWith('deal') || 
                     post.categoryName === 'Ugodnosti' || 
                     post.categoryName === 'Ugodnost' ||
                     post.categoryName === 'Akcije' ||
                     post.categoryName === 'Akcija' ||
                     post.type === 'deal' ||
                     post.id === 'ldy5f0a2hzqtibpfau6g' ||
                     slugify(post.title) === 'znizane-cene-v-egiptu' ||
                     post.id.startsWith('deal-') || 
                     post.id.startsWith('hero-bento-') ||
                     Boolean(post.discount) ||
                     Boolean(post.promoCode) ||
                     Boolean(post.dealLink) ||
                     Boolean(post.price && post.category !== 'ad' && post.category !== 'event');
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

  const FEED_DELAY_CLASSES = [
    'animate-feed-delay-0',
    'animate-feed-delay-1',
    'animate-feed-delay-2',
    'animate-feed-delay-3',
    'animate-feed-delay-4',
    'animate-feed-delay-5',
    'animate-feed-delay-6',
    'animate-feed-delay-7',
  ] as const;

  return (
    <div className="flex flex-col gap-space-md animate-feed-item">
      {/* Header section */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <BookOpen className="w-[1em] h-[1em] text-primary shrink-0" />
              <span>{currentSeo?.h1 || 'Blog & Zgodbe slovenske skupnosti'}</span>
            </h1>
            <h2 className="font-body-md text-xs sm:text-sm text-on-surface-variant">
              {currentSeo?.h2 || 'Poglobljeni zapisi, potopisi, praktični vodniki za dom ter izkušnje slovenskih ustvarjalcev in strokovnjakov'}
            </h2>
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

      {/* Horizontal Scrollable Category Filter Pills above Blog Post Cards */}
      <div
        role="region"
        aria-label="Hitri filter po temah bloga"
        className="flex flex-col gap-2"
      >
        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollCategoryPills('left')}
            className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-surface-container-lowest hover:bg-surface-container-low border border-surface-container text-on-surface-variant hover:text-primary shadow-2xs transition-colors cursor-pointer"
            aria-label="Pomakni kategorije levo"
            title="Pomakni levo"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={pillsScrollRef}
            className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
          >
            <button
              type="button"
              onClick={() => handleCategorySelect('all')}
              aria-pressed={selectedCategory === 'all'}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-surface-container'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Vse teme</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                  selectedCategory === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-container text-outline'
                }`}
              >
                {categoryCounts.all ?? filteredFirestore.length}
              </span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] ?? 0;
              return (
                <button
                  key={`pill-${cat.id}`}
                  type="button"
                  onClick={() => handleCategorySelect(isSelected ? 'all' : cat.id)}
                  aria-pressed={isSelected}
                  className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-surface-container'
                  }`}
                >
                  {cat.icon && <span aria-hidden="true">{cat.icon}</span>}
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-container text-outline'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollCategoryPills('right')}
            className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-surface-container-lowest hover:bg-surface-container-low border border-surface-container text-on-surface-variant hover:text-primary shadow-2xs transition-colors cursor-pointer"
            aria-label="Pomakni kategorije desno"
            title="Pomakni desno"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {activeCategoryObj && activeCategoryObj.subcategories && activeCategoryObj.subcategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5 pl-0.5">
            <button
              type="button"
              onClick={() => {
                setSelectedSubcategory('all');
                setSelectedTertiaryCategory('all');
                setPage(1);
              }}
              aria-pressed={selectedSubcategory === 'all'}
              className={`px-3 py-1 rounded-full font-label-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                selectedSubcategory === 'all'
                  ? 'bg-secondary text-on-secondary shadow-2xs'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant border border-surface-container/70'
              }`}
            >
              Vse podteme
            </button>
            {activeCategoryObj.subcategories.map((sub) => {
              const isSubSelected = selectedSubcategory === sub.id;
              return (
                <button
                  key={`subpill-${sub.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedSubcategory(isSubSelected ? 'all' : sub.id);
                    setSelectedTertiaryCategory('all');
                    setPage(1);
                  }}
                  aria-pressed={isSubSelected}
                  className={`px-3 py-1 rounded-full font-label-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isSubSelected
                      ? 'bg-secondary text-on-secondary shadow-2xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant border border-surface-container/70'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards List: 10 cards initially, 10 more on each load */}
      <div className="flex flex-col gap-space-md">
        {visibleItems.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50 animate-feed-item">
            Ni najdenih blog člankov za izbrane kriterije.
          </div>
        ) : (
          visibleItems.map((item, idx) => {
            const delayClass = FEED_DELAY_CLASSES[Math.min(idx % PAGE_SIZE, FEED_DELAY_CLASSES.length - 1)];
            return (
              <div
                key={`${selectedCategory}-${selectedSubcategory}-${selectedTertiaryCategory}-${selectedRegion}-${sortOption}-fs-post-${item.data.id}-${idx}`}
                className={`animate-feed-item ${delayClass}`}
              >
                <FirestorePostCard
                  post={item.data}
                  onNavigatePost={onNavigatePost}
                />
              </div>
            );
          })
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

