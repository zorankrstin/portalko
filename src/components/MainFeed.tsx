import { useState, useEffect, useMemo } from 'react';
import { Edit2, Store, Percent, Calendar, FileText, Rss, ShoppingBag, Flame, CalendarDays, ArrowUpDown, ChevronDown, Globe } from 'lucide-react';
import { BlogPost } from './posts/BlogPost';
import { AdPost } from './posts/AdPost';
import { DealPost } from './posts/DealPost';
import { EventPost } from './posts/EventPost';
import { NewsPost } from './posts/NewsPost';
import { RssPost } from './posts/RssPost';
import { FirestorePostCard } from './posts/FirestorePostCard';
import { ComposeModal } from './ComposeModal';
import { parseSearchQuery, matchesSearchAndCategory } from '../utils/searchUtils';
import type { ViewMode } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPosts, subscribeToAds, subscribeToEvents, FirestorePost, FirestoreAd, FirestoreEvent } from '../services/firestoreService';
import { INITIAL_BLOG_POSTS, INITIAL_ADS, INITIAL_EVENTS } from '../data/mockFeedData';
import { INITIAL_DEALS, DealItem } from '../data/mockDealsData';
import { fetchRealRssNews, RealNewsItem } from '../services/rssService';
import { isItemActivelyPromoted } from '../services/promotionService';

type FeedItemKind = 
  | { type: 'firestore'; data: FirestorePost }
  | { type: 'firestore_ad'; data: FirestoreAd }
  | { type: 'firestore_event'; data: FirestoreEvent }
  | { type: 'news'; data: RealNewsItem }
  | { type: 'blog'; data: typeof INITIAL_BLOG_POSTS[0] }
  | { type: 'ad'; data: typeof INITIAL_ADS[0] }
  | { type: 'deal'; data: DealItem }
  | { type: 'event'; data: typeof INITIAL_EVENTS[0] };

interface MainFeedProps {
  searchQuery?: string;
  onViewChange?: (view: ViewMode) => void;
}

export function MainFeed({ searchQuery = '', onViewChange }: MainFeedProps) {
  const { currentUser } = useAuth();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<'post' | 'ad' | 'deal' | 'event'>('post');
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);
  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);
  const [realNews, setRealNews] = useState<RealNewsItem[]>([]);

  useEffect(() => {
    const unsubPosts = subscribeToPosts((posts) => {
      setFirestorePosts(posts);
    });
    const unsubAds = subscribeToAds((ads) => {
      setFirestoreAds(ads);
    });
    const unsubEvents = subscribeToEvents((events) => {
      setFirestoreEvents(events);
    });

    return () => {
      unsubPosts();
      unsubAds();
      unsubEvents();
    };
  }, []);

  useEffect(() => {
    fetchRealRssNews().then(items => setRealNews(items));

    const handleRssUpdate = () => {
      fetchRealRssNews(true).then(items => setRealNews(items));
    };

    window.addEventListener('rss_feeds_updated', handleRssUpdate);
    return () => window.removeEventListener('rss_feeds_updated', handleRssUpdate);
  }, []);

  const openCompose = (type: 'post' | 'ad' | 'deal' | 'event' = 'post') => {
    setComposeType(type);
    setIsComposeOpen(true);
  };

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoading(false);
    }, 450);
  };

  // Construct an interleaved master list of content for the landing page
  const masterFeedItems = useMemo(() => {
    const items: FeedItemKind[] = [];
    const isAdminOrSuper = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

    // Insert live firestore posts (published live without admin approval; only hide if rejected/archived)
    firestorePosts.forEach(fp => {
      if (fp.status === 'rejected' || fp.status === 'archived') {
        const isAuthor = currentUser?.id === fp.authorId || (currentUser?.name && currentUser.name === fp.authorName);
        if (!isAdminOrSuper && !isAuthor) return;
      }
      items.push({ type: 'firestore', data: fp });
    });

    // Insert live firestore ads
    firestoreAds.forEach(fa => {
      if (fa.status === 'rejected' || fa.status === 'sold' || fa.status === 'closed') {
        const isAuthor = currentUser?.id === fa.authorId || (currentUser?.name && currentUser.name === fa.authorName);
        if (!isAdminOrSuper && !isAuthor) return;
      }
      items.push({ type: 'firestore_ad', data: fa });
    });

    // Insert live firestore events
    firestoreEvents.forEach(fe => {
      if (fe.status === 'rejected') {
        const isAuthor = currentUser?.id === fe.authorId || (currentUser?.name && currentUser.name === fe.authorName);
        if (!isAdminOrSuper && !isAuthor) return;
      }
      items.push({ type: 'firestore_event', data: fe });
    });

    // Interleave real news, blog, ad, deal, event, and mock feed
    const maxLen = Math.max(
      realNews.length,
      INITIAL_BLOG_POSTS.length,
      INITIAL_ADS.length,
      INITIAL_EVENTS.length,
      INITIAL_DEALS.length
    );

    for (let i = 0; i < maxLen; i++) {
      if (realNews[i]) items.push({ type: 'news', data: realNews[i] });
      if (INITIAL_BLOG_POSTS[i]) items.push({ type: 'blog', data: INITIAL_BLOG_POSTS[i] });
      if (INITIAL_ADS[i]) items.push({ type: 'ad', data: INITIAL_ADS[i] });
      if (INITIAL_DEALS[i % INITIAL_DEALS.length] && i % 2 === 0) {
        items.push({ type: 'deal', data: INITIAL_DEALS[i % INITIAL_DEALS.length] });
      }
      if (INITIAL_EVENTS[i]) items.push({ type: 'event', data: INITIAL_EVENTS[i] });
    }

    return items;
  }, [firestorePosts, firestoreAds, firestoreEvents, realNews, currentUser]);

  // Filter based on search query and active tab
  const filteredItems = useMemo(() => {
    return masterFeedItems.filter(item => {
      // 1. Filter by category tab
      if (filterType === 'news' && item.type !== 'news') return false;
      
      if (filterType === 'ad') {
        const isAd = item.type === 'ad' || 
          item.type === 'firestore_ad' || 
          (item.type === 'firestore' && item.data.category === 'ad');
        if (!isAd) return false;
      }

      if (filterType === 'deal') {
        const isDeal = item.type === 'deal' || 
          (item.type === 'firestore' && item.data.category === 'deal');
        if (!isDeal) return false;
      }

      if (filterType === 'event') {
        const isEvent = item.type === 'event' || 
          item.type === 'firestore_event' || 
          (item.type === 'firestore' && item.data.category === 'event');
        if (!isEvent) return false;
      }

      if (filterType === 'blog') {
        const isBlog = item.type === 'blog' || 
          (item.type === 'firestore' && (!item.data.category || item.data.category === 'blog' || item.data.category === 'post'));
        if (!isBlog) return false;
      }

      // 2. Filter by search query
      if (!searchQuery.trim()) return true;

      let textToMatch = '';
      let cat = 'all';

      if (item.type === 'firestore') {
        textToMatch = `${item.data.title} ${item.data.content} ${item.data.authorName} ${item.data.category || ''}`;
        cat = item.data.category || 'all';
      } else if (item.type === 'firestore_ad') {
        textToMatch = `${item.data.title} ${item.data.description} ${item.data.authorName} ${item.data.category || ''} ${item.data.location || ''}`;
        cat = 'ads';
      } else if (item.type === 'firestore_event') {
        textToMatch = `${item.data.title} ${item.data.description} ${item.data.authorName} ${item.data.category || ''} ${item.data.location || ''}`;
        cat = 'events';
      } else if (item.type === 'news') {
        textToMatch = `${item.data.title} ${item.data.description} ${item.data.sourceName} ${item.data.category || ''}`;
        cat = 'news';
      } else if (item.type === 'blog') {
        textToMatch = `${item.data.title} ${item.data.description} ${item.data.author} ${item.data.location} ${item.data.tags.join(' ')}`;
        cat = 'blog';
      } else if (item.type === 'ad') {
        textToMatch = `${item.data.title} ${item.data.description} ${item.data.categoryName} ${item.data.location}`;
        cat = 'ads';
      } else if (item.type === 'deal') {
        textToMatch = `${item.data.title} ${item.data.description} ${item.data.partner} ${item.data.code}`;
        cat = 'deals';
      } else if (item.type === 'event') {
        textToMatch = `${item.data.title} ${item.data.description} ${item.data.categoryName} ${item.data.location} ${item.data.organizer}`;
        cat = 'events';
      }

      return matchesSearchAndCategory(textToMatch, cat, searchQuery);
    }).sort((a, b) => {
      const checkItemPromoted = (item: FeedItemKind): boolean => {
        const d: any = item.data;
        if (d.promotion) {
          return isItemActivelyPromoted(d.promotion);
        }
        if (d.isPromoted) {
          if (d.promotedUntil) {
            return new Date(d.promotedUntil).getTime() > Date.now();
          }
          return true;
        }
        return false;
      };

      const aPromoted = checkItemPromoted(a);
      const bPromoted = checkItemPromoted(b);

      if (aPromoted && !bPromoted) return -1;
      if (!aPromoted && bPromoted) return 1;
      return 0;
    });
  }, [masterFeedItems, filterType, searchQuery]);

  // Pagination: exactly 10 cards initially, 10 more on each load click
  const PAGE_SIZE = 10;
  const currentLimit = page * PAGE_SIZE;

  const visibleItems = useMemo(() => {
    if (filteredItems.length === 0) return [];
    if (currentLimit <= filteredItems.length) {
      return filteredItems.slice(0, currentLimit);
    }
    // Repeat items with unique virtual keys if page exceeds initial unique list
    const result: FeedItemKind[] = [...filteredItems];
    let counter = 1;
    while (result.length < currentLimit) {
      for (const item of filteredItems) {
        if (result.length >= currentLimit) break;
        if (item.type === 'firestore') {
          result.push({ type: 'firestore', data: { ...item.data, id: `${item.data.id}-p${counter}` } });
        } else if (item.type === 'firestore_ad') {
          result.push({ type: 'firestore_ad', data: { ...item.data, id: `${item.data.id}-p${counter}` } });
        } else if (item.type === 'firestore_event') {
          result.push({ type: 'firestore_event', data: { ...item.data, id: `${item.data.id}-p${counter}` } });
        } else if (item.type === 'news') {
          result.push({ type: 'news', data: { ...item.data, id: `${item.data.id}-p${counter}` } });
        } else if (item.type === 'blog') {
          result.push({ type: 'blog', data: { ...item.data, id: `${item.data.id}-p${counter}` } });
        } else if (item.type === 'ad') {
          result.push({ type: 'ad', data: { ...item.data, id: `${item.data.id}-p${counter}` } });
        } else if (item.type === 'deal') {
          result.push({ type: 'deal', data: { ...item.data, id: `${item.data.id}-p${counter}` } });
        } else if (item.type === 'event') {
          result.push({ type: 'event', data: { ...item.data, id: `${item.data.id}-p${counter}` } });
        }
      }
      counter++;
    }
    return result;
  }, [filteredItems, currentLimit]);

  const userAvatar = currentUser?.avatar || "https://lh3.googleusercontent.com/aida/AEtjO1WzgwshpYtUlUT6B6hzTtlscXMkpKFYIjPiStIYfRrhCOV_MJeKV53x2D-tigu5SbHyESMyvILulBOUHZNfXTh6f8BRNGoWAkmZGhTeSWRB6n0Yw7IQRI0B91gU_U5KeEaSv6GZGH_W05qE5EOybPtK8yTXIY8KRAN88q_810UgS5RUyRmLSTI-zFjGHDUBCI7ELn7zCVDuy5Hy1SYdchdHKbBPfokQqaaMmc3liYXq_mNFC7yqQPYrfuA";
  const firstName = currentUser ? currentUser.name.split(' ')[0] : 'obiskovalec';

  return (
    <div className="flex flex-col gap-space-md">
      {/* Hitro ustvarjanje objave (Composer Widget) */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img alt={`Avatar ${firstName}`} className="w-10 h-10 rounded-full object-cover ring-1 ring-black/5" src={userAvatar} />
          <div 
            onClick={() => openCompose('post')}
            className="flex-1 bg-surface-container-low hover:bg-surface-container rounded-xl px-4 py-2.5 text-outline text-body-md font-body-md cursor-pointer transition-colors flex items-center justify-between"
          >
            <span>{currentUser ? `Kaj bi želeli deliti danes, ${firstName}?` : 'Kaj bi želeli deliti danes? (Delite novico, oglas ali dogodek)...'}</span>
            <Edit2 className="w-[1em] h-[1em] text-outline text-lg" />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <button 
            onClick={() => openCompose('ad')}
            className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold transition-colors cursor-pointer" type="button"
          >
            <Store className="w-[1em] h-[1em] text-primary text-base" />
            <span>Mali oglasi</span>
          </button>
          <button 
            onClick={() => openCompose('deal')}
            className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold transition-colors cursor-pointer" type="button"
          >
            <Percent className="w-[1em] h-[1em] text-secondary text-base" />
            <span>Akcije</span>
          </button>
          <button 
            onClick={() => openCompose('event')}
            className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold transition-colors cursor-pointer" type="button"
          >
            <Calendar className="w-[1em] h-[1em] text-tertiary-container text-base" />
            <span>Dogodek</span>
          </button>
          <button 
            onClick={() => openCompose('post')}
            className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold transition-colors cursor-pointer" type="button"
          >
            <FileText className="w-[1em] h-[1em] text-primary text-base" />
            <span>Blog</span>
          </button>
        </div>
      </div>
      
      {/* Filter vrstica za vrsto vsebine & sortiranje */}
      <div className="bg-surface-container-lowest rounded-2xl p-1.5 sm:p-2 shadow-sm border border-surface-container/50 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-0.5">
          <button 
            onClick={() => { setFilterType('all'); setPage(1); }} 
            className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl font-label-md text-[11px] sm:text-xs whitespace-nowrap shadow-xs transition-colors cursor-pointer ${filterType === 'all' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
            id="main-filter-tab-all"
          >
            Vse objave
          </button>
          <button 
            onClick={() => { 
              if (onViewChange) {
                onViewChange('news');
              } else {
                setFilterType('news'); 
                setPage(1); 
              }
            }} 
            className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl font-label-md text-[11px] sm:text-xs whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${filterType === 'news' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
            id="main-filter-tab-news"
          >
            <Rss className={`w-3.5 h-3.5 shrink-0 ${filterType === 'news' ? 'text-on-primary' : 'text-primary'}`} />
            <span>Novice RSS</span>
          </button>
          <button 
            onClick={() => { 
              if (onViewChange) {
                onViewChange('ads');
              } else {
                setFilterType('ad'); 
                setPage(1); 
              }
            }} 
            className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl font-label-md text-[11px] sm:text-xs whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${filterType === 'ad' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
            id="main-filter-tab-ads"
          >
            <Store className={`w-3.5 h-3.5 shrink-0 ${filterType === 'ad' ? 'text-on-primary' : 'text-outline'}`} />
            <span>Oglasi</span>
          </button>
          <button 
            onClick={() => { 
              if (onViewChange) {
                onViewChange('deals');
              } else {
                setFilterType('deal'); 
                setPage(1); 
              }
            }} 
            className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl font-label-md text-[11px] sm:text-xs whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${filterType === 'deal' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
            id="main-filter-tab-deals"
          >
            <Percent className={`w-3.5 h-3.5 shrink-0 ${filterType === 'deal' ? 'text-on-primary' : 'text-secondary'}`} />
            <span>Ugodnosti</span>
          </button>
          <button 
            onClick={() => { 
              if (onViewChange) {
                onViewChange('events');
              } else {
                setFilterType('event'); 
                setPage(1); 
              }
            }} 
            className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl font-label-md text-[11px] sm:text-xs whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${filterType === 'event' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
            id="main-filter-tab-events"
          >
            <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${filterType === 'event' ? 'text-on-primary' : 'text-tertiary-container'}`} />
            <span>Dogodki</span>
          </button>
          <button 
            onClick={() => { 
              if (onViewChange) {
                onViewChange('blog');
              } else {
                setFilterType('blog'); 
                setPage(1); 
              }
            }} 
            className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl font-label-md text-[11px] sm:text-xs whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${filterType === 'blog' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
            id="main-filter-tab-blog"
          >
            <FileText className={`w-3.5 h-3.5 shrink-0 ${filterType === 'blog' ? 'text-on-primary' : 'text-primary'}`} />
            <span>Blog</span>
          </button>
        </div>
        
      </div>
      
      {/* 10 Cards initially */}
      <div className="flex flex-col gap-space-md">
        {visibleItems.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50">
            Ni najdenih objav za izbrane kriterije.
          </div>
        ) : (
          visibleItems.map((item, idx) => {
            if (item.type === 'firestore') {
              return <FirestorePostCard key={`fp-${item.data.id}-${idx}`} post={item.data} />;
            }
            if (item.type === 'firestore_ad') {
              const ad = item.data;
              const isPromoted = Boolean(
                ad.promotion 
                  ? isItemActivelyPromoted(ad.promotion, 'oglasi')
                  : (ad.isPromoted && (!ad.promotedUntil || new Date(ad.promotedUntil).getTime() > Date.now()))
              );
              return (
                <AdPost
                  key={`f-ad-${ad.id}-${idx}`}
                  id={ad.id}
                  title={ad.title}
                  price={ad.price}
                  author={ad.authorName}
                  authorInitials={ad.authorName.slice(0, 2).toUpperCase()}
                  location={ad.location || 'Slovenija'}
                  date="Ravno objavljeno"
                  description={ad.description}
                  categoryName={ad.category || 'Mali oglas'}
                  image={ad.imageUrl}
                  isPromoted={isPromoted}
                  promotionBadgeType={ad.promotionBadgeType || ad.promotion?.badgeType}
                />
              );
            }
            if (item.type === 'firestore_event') {
              const ev = item.data;
              const isPromoted = Boolean(
                ev.promotion 
                  ? isItemActivelyPromoted(ev.promotion, 'dogodki')
                  : (ev.isPromoted && (!ev.promotedUntil || new Date(ev.promotedUntil).getTime() > Date.now()))
              );
              return (
                <EventPost
                  key={`f-ev-${ev.id}-${idx}`}
                  id={ev.id}
                  title={ev.title}
                  organizer={ev.authorName}
                  categoryName={ev.category || 'Dogodek'}
                  location={ev.location || 'Slovenija'}
                  date={ev.eventDate || ev.date || 'Ravno objavljeno'}
                  month="AKT"
                  day="★"
                  price={ev.price || 'Vstop prost'}
                  description={ev.description}
                  image={ev.imageUrl}
                  isPromoted={isPromoted}
                  promotionBadgeType={ev.promotionBadgeType || ev.promotion?.badgeType}
                />
              );
            }
            if (item.type === 'news') {
              const news = item.data;
              return (
                <RssPost
                  key={`news-${news.id}-${idx}`}
                  id={news.id}
                  title={news.title}
                  link={news.link}
                  description={news.description}
                  pubDate={news.pubDate}
                  sourceName={news.sourceName}
                  thumbnail={news.thumbnail}
                />
              );
            }
            if (item.type === 'blog') {
              const blog = item.data;
              return (
                <BlogPost
                  key={`blog-post-${blog.id}-${idx}`}
                  id={blog.id}
                  title={blog.title}
                  author={blog.author}
                  authorRole={blog.authorRole}
                  authorAvatar={blog.authorAvatar}
                  date={blog.date}
                  location={blog.location}
                  description={blog.description}
                  image={blog.image}
                  readTime={blog.readTime}
                  photoCount={blog.photoCount}
                  likesCount={`${blog.likesCount} všečkov`}
                  commentsCount={`${blog.commentsCount} komentarjev`}
                  viewsCount={`${blog.viewsCount} ogledov`}
                  tags={blog.tags}
                />
              );
            }
            if (item.type === 'ad') {
              const ad = item.data;
              return (
                <AdPost
                  key={`ad-post-${ad.id}-${idx}`}
                  id={ad.id}
                  title={ad.title}
                  price={ad.price}
                  author={ad.author}
                  authorInitials={ad.authorInitials}
                  location={ad.location}
                  date={ad.date}
                  description={ad.description}
                  categoryName={ad.categoryName}
                  image={ad.image}
                />
              );
            }
            if (item.type === 'deal') {
              const deal = item.data;
              return (
                <DealPost
                  key={`deal-post-${deal.id}-${idx}`}
                  id={deal.id}
                  title={deal.title}
                  discount={deal.discount}
                  author={deal.partner}
                  authorRole={deal.partnerRole}
                  authorAvatar={deal.partnerAvatar}
                  date={deal.date}
                  description={deal.description}
                  code={deal.code}
                  link={deal.link}
                  image={deal.image}
                  categoryName={deal.categoryName}
                  region={deal.region}
                  verifiedText={deal.verifiedText}
                  featured={deal.featured}
                  votesCount={deal.votes}
                />
              );
            }
            if (item.type === 'event') {
              const ev = item.data;
              return (
                <EventPost
                  key={`event-post-${ev.id}-${idx}`}
                  id={ev.id}
                  title={ev.title}
                  organizer={ev.organizer}
                  categoryName={ev.categoryName}
                  location={ev.location}
                  date={ev.date}
                  month={ev.month}
                  day={ev.day}
                  price={ev.price}
                  description={ev.description}
                  image={ev.image}
                  interestedCount={ev.interestedCount}
                />
              );
            }
            return null;
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
            <span>{isLoading ? 'Nalaganje objav...' : 'Naloži še 10 objav'}</span>
          </button>
          <span className="font-body-sm text-xs text-outline">
            Prikazano {visibleItems.length} objav (stran {page})
          </span>
        </div>
      )}

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        initialType={composeType}
      />
    </div>
  );
}
