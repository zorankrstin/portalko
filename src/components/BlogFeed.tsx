import { useState, useEffect } from 'react';
import { FileText, PlusCircle, Search, ChevronDown, Sparkles, BookOpen } from 'lucide-react';
import { BlogPost } from './posts/BlogPost';
import { FirestorePostCard } from './posts/FirestorePostCard';
import { ComposeModal } from './ComposeModal';
import { subscribeToPosts, FirestorePost } from '../services/firestoreService';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { INITIAL_BLOG_POSTS, MockBlogItem } from '../data/mockFeedData';
import type { PostDetailTarget } from '../types';

interface BlogFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function BlogFeed({ onViewChange, searchQuery = '', onNavigatePost }: BlogFeedProps) {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPosts((posts) => {
      // Filter posts that are blog/articles
      const blogFirestorePosts = posts.filter(p => !p.category || p.category === 'blog' || p.category === 'post');
      setFirestorePosts(blogFirestorePosts);
    });
    return () => unsub();
  }, []);

  // Filter Firestore posts
  const filteredFirestore = firestorePosts.filter(post => {
    const textToMatch = `${post.title} ${post.content} ${post.authorName} ${post.category || ''}`;
    const matchesSearch = matchesSearchAndCategory(textToMatch, 'blog', searchQuery);
    return matchesSearch;
  });

  // Filter static/mock posts
  const filteredMock = INITIAL_BLOG_POSTS.filter(post => {
    const textToMatch = `${post.title} ${post.description} ${post.author} ${post.location} ${post.tags.join(' ')}`;
    const matchesSearch = matchesSearchAndCategory(textToMatch, 'blog', searchQuery);
    const matchesTag = selectedTag === 'all' || post.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase());
    return matchesSearch && matchesTag;
  });

  // Combined pool of all blog items
  type UnifiedBlogItem = 
    | { type: 'firestore'; data: FirestorePost }
    | { type: 'mock'; data: MockBlogItem };

  const allItems: UnifiedBlogItem[] = [
    ...filteredFirestore.map(p => ({ type: 'firestore' as const, data: p })),
    ...filteredMock.map(p => ({ type: 'mock' as const, data: p }))
  ];

  // If user requests more than available unique items, cycle or generate virtual items
  const PAGE_SIZE = 10;
  const currentVisibleLimit = page * PAGE_SIZE;
  
  // Create a display list that can paginate indefinitely if needed
  const getPagedItems = (): UnifiedBlogItem[] => {
    if (allItems.length === 0) return [];
    if (currentVisibleLimit <= allItems.length) {
      return allItems.slice(0, currentVisibleLimit);
    }
    // Repeat items with modified keys if page extends beyond base dataset
    const result: UnifiedBlogItem[] = [...allItems];
    let counter = 1;
    while (result.length < currentVisibleLimit) {
      for (const item of allItems) {
        if (result.length >= currentVisibleLimit) break;
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

  const visibleItems = getPagedItems();

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoading(false);
    }, 450);
  };

  const TAGS = [
    { id: 'all', label: 'Vse teme' },
    { id: 'turizem', label: 'Izleti & Turizem' },
    { id: 'dom', label: 'Dom & Gradnja' },
    { id: 'kulinarika', label: 'Kulinarika' },
    { id: 'šport', label: 'Šport & Outdoor' },
    { id: 'finance', label: 'Finance' },
    { id: 'tehnologija', label: 'Tehnologija' },
  ];

  return (
    <main className="lg:col-span-6 flex flex-col gap-space-md">
      {/* Header section */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        <nav className="flex items-center gap-2 font-label-md text-xs text-outline">
          <a className="hover:text-primary transition-colors cursor-pointer" onClick={() => onViewChange('main')}>Domov</a>
          <span>/</span>
          <span className="text-primary font-semibold">Blog & Članki</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface flex items-center gap-2.5">
              <BookOpen className="w-[1em] h-[1em] text-primary shrink-0" />
              <span>Blog & Članki</span>
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

      {/* Topics filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => { setSelectedTag(tag.id); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors shadow-sm ${
              selectedTag === tag.id
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-lowest hover:bg-surface-container border border-surface-container text-on-surface-variant'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Cards List: 10 cards initially, 10 more on each load */}
      <div className="flex flex-col gap-space-md">
        {visibleItems.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50">
            Ni najdenih blog člankov za izbrane kriterije.
          </div>
        ) : (
          visibleItems.map((item) => {
            if (item.type === 'firestore') {
              return <FirestorePostCard key={item.data.id} post={item.data} />;
            }
            const post = item.data;
            return (
              <BlogPost
                key={post.id}
                id={post.id}
                title={post.title}
                author={post.author}
                authorRole={post.authorRole}
                authorAvatar={post.authorAvatar}
                date={post.date}
                location={post.location}
                description={post.description}
                image={post.image}
                readTime={post.readTime}
                photoCount={post.photoCount}
                likesCount={`${post.likesCount} všečkov`}
                commentsCount={`${post.commentsCount} komentarjev`}
                viewsCount={`${post.viewsCount} ogledov`}
                tags={post.tags}
                onNavigatePost={onNavigatePost}
              />
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {visibleItems.length > 0 && (
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
            <span>{isLoading ? 'Nalaganje novih člankov...' : 'Naloži še 10 člankov'}</span>
          </button>
          <span className="font-body-sm text-xs text-outline">
            Prikazano {visibleItems.length} člankov (stran {page})
          </span>
        </div>
      )}

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        initialType="post" 
      />
    </main>
  );
}
