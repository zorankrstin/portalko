import { useState, useEffect, useMemo } from 'react';
import { Edit2, Store, Percent, Calendar, FileText, Rss, ShoppingBag, Flame, CalendarDays, ArrowUpDown, ChevronDown } from 'lucide-react';
import { BlogPost } from './posts/BlogPost';
import { AdPost } from './posts/AdPost';
import { DealPost } from './posts/DealPost';
import { EventPost } from './posts/EventPost';
import { NewsPost } from './posts/NewsPost';
import { RssPost } from './posts/RssPost';
import { FirestorePostCard } from './posts/FirestorePostCard';
import { ComposeModal } from './ComposeModal';
import { parseSearchQuery, matchesSearchAndCategory } from '../utils/searchUtils';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPosts, FirestorePost } from '../services/firestoreService';
import { INITIAL_BLOG_POSTS, INITIAL_ADS, INITIAL_EVENTS } from '../data/mockFeedData';
import { fetchRealRssNews, RealNewsItem } from '../services/rssService';

type FeedItemKind = 
  | { type: 'firestore'; data: FirestorePost }
  | { type: 'news'; data: RealNewsItem }
  | { type: 'blog'; data: typeof INITIAL_BLOG_POSTS[0] }
  | { type: 'ad'; data: typeof INITIAL_ADS[0] }
  | { type: 'deal'; data: { id: string; title: string; discount: string; partner: string; date: string; description: string; code: string; link: string } }
  | { type: 'event'; data: typeof INITIAL_EVENTS[0] };

const DEALS_DATA = [
  {
    id: 'deal-1',
    title: 'Hervis Slovenija: 30% spomladanski popust na vso tekaško obutev (Nike, Salomon, Asics)',
    discount: '-30%',
    partner: 'Gregor H. • Preverjen partner',
    date: 'Veljavno do 31. marca 2026',
    description: 'Za vse registrirane člane portala je na voljo posebna ugodnost ob začetku tekaške sezone. Koda velja v spletni trgovini ter v vseh poslovalnicah po Sloveniji ob predložitvi kupona.',
    code: 'TEK30',
    link: 'https://www.hervis.si'
  },
  {
    id: 'deal-2',
    title: 'Big Bang: Super vikend popustov -20% na vse OLED televizorje in soundbar zvočnike',
    discount: '-20%',
    partner: 'Big Bang d.o.o.',
    date: 'Veljavno do nedelje',
    description: 'Dodatni popust na že znižane modele priznanih znamk LG, Samsung in Sony ob plačilu s kartico ali spletnim nakupom.',
    code: 'OLED20',
    link: 'https://www.bigbang.si'
  },
  {
    id: 'deal-3',
    title: 'Spar Slovenija: Kupon za 25% popust na en izdelek po vaši izbiri',
    discount: '-25%',
    partner: 'Spar Partner',
    date: 'Veljavno ta konec tedna',
    description: 'Izkoristite popust na najdražji izdelek v nakupovalnem vozičku ob predložitvi Spar plus kartice v vseh poslovalnicah Spar in Interspar.',
    code: 'SPAR25',
    link: 'https://www.spar.si'
  },
  {
    id: 'deal-4',
    title: 'Petrol e-Mobilnost: 15% popust na hitro polnjenje na avtocestnem križu',
    discount: '-15%',
    partner: 'Petrol Klub',
    date: 'Veljavno do preklica',
    description: 'Aktivirajte kodo v aplikaciji Petrol GO pred začetkom polnilne seje na katerikoli ultra-hitri polnilnici po Sloveniji.',
    code: 'EVPORTAL15',
    link: 'https://www.petrol.si'
  }
];

export function MainFeed({ searchQuery = '' }: { searchQuery?: string }) {
  const { currentUser } = useAuth();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<'post' | 'ad' | 'deal' | 'event'>('post');
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [realNews, setRealNews] = useState<RealNewsItem[]>([]);

  useEffect(() => {
    const unsub = subscribeToPosts((posts) => {
      setFirestorePosts(posts);
    });
    return () => unsub();
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

    // Interleave real news, blog, ad, deal, event, and firestore posts
    const maxLen = Math.max(
      realNews.length,
      INITIAL_BLOG_POSTS.length,
      INITIAL_ADS.length,
      INITIAL_EVENTS.length,
      DEALS_DATA.length
    );

    // Insert any initial firestore posts at the front
    firestorePosts.forEach(fp => {
      items.push({ type: 'firestore', data: fp });
    });

    for (let i = 0; i < maxLen; i++) {
      if (realNews[i]) items.push({ type: 'news', data: realNews[i] });
      if (INITIAL_BLOG_POSTS[i]) items.push({ type: 'blog', data: INITIAL_BLOG_POSTS[i] });
      if (INITIAL_ADS[i]) items.push({ type: 'ad', data: INITIAL_ADS[i] });
      if (DEALS_DATA[i % DEALS_DATA.length] && i % 2 === 0) {
        items.push({ type: 'deal', data: DEALS_DATA[i % DEALS_DATA.length] });
      }
      if (INITIAL_EVENTS[i]) items.push({ type: 'event', data: INITIAL_EVENTS[i] });
    }

    return items;
  }, [firestorePosts, realNews]);

  // Filter based on search query and active tab
  const filteredItems = useMemo(() => {
    return masterFeedItems.filter(item => {
      // 1. Filter by category tab
      if (filterType === 'news' && item.type !== 'news') return false;
      if (filterType === 'ad' && item.type !== 'ad') return false;
      if (filterType === 'deal' && item.type !== 'deal') return false;
      if (filterType === 'event' && item.type !== 'event') return false;
      if (filterType === 'blog' && item.type !== 'blog') return false;

      // 2. Filter by search query
      if (!searchQuery.trim()) return true;

      let textToMatch = '';
      let cat = 'all';

      if (item.type === 'firestore') {
        textToMatch = `${item.data.title} ${item.data.content} ${item.data.authorName} ${item.data.category || ''}`;
        cat = item.data.category || 'all';
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
        cat = 'ads';
      } else if (item.type === 'event') {
        textToMatch = `${item.data.title} ${item.data.description} ${item.data.categoryName} ${item.data.location} ${item.data.organizer}`;
        cat = 'events';
      }

      return matchesSearchAndCategory(textToMatch, cat, searchQuery);
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
  const firstName = currentUser ? currentUser.name.split(' ')[0] : 'Luka';

  return (
    <main className="lg:col-span-6 flex flex-col gap-space-md">
      {/* Hitro ustvarjanje objave (Composer Widget) */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img alt={`Avatar ${firstName}`} className="w-10 h-10 rounded-full object-cover ring-1 ring-black/5" src={userAvatar} />
          <div 
            onClick={() => openCompose('post')}
            className="flex-1 bg-surface-container-low hover:bg-surface-container rounded-xl px-4 py-2.5 text-outline text-body-md font-body-md cursor-pointer transition-colors flex items-center justify-between"
          >
            <span>Kaj bi želeli deliti danes, {firstName}?</span>
            <Edit2 className="w-[1em] h-[1em] text-outline text-lg" />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <button 
            onClick={() => openCompose('ad')}
            className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold transition-colors cursor-pointer" type="button"
          >
            <Store className="w-[1em] h-[1em] text-primary text-base" />
            <span>Oglas</span>
          </button>
          <button 
            onClick={() => openCompose('deal')}
            className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold transition-colors cursor-pointer" type="button"
          >
            <Percent className="w-[1em] h-[1em] text-secondary text-base" />
            <span>Popust</span>
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
            <span>Članek</span>
          </button>
        </div>
      </div>
      
      {/* Filter vrstica za vrsto vsebine & sortiranje */}
      <div className="bg-surface-container-lowest rounded-2xl p-2 shadow-sm border border-surface-container/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button 
            onClick={() => { setFilterType('all'); setPage(1); }} 
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap shadow-sm transition-colors cursor-pointer ${filterType === 'all' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
          >
            Vse objave
          </button>
          <button 
            onClick={() => { setFilterType('news'); setPage(1); }} 
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${filterType === 'news' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
          >
            <Rss className={`w-[1em] h-[1em] text-xs ${filterType === 'news' ? 'text-on-primary' : 'text-primary'}`} /> Novice RSS
          </button>
          <button 
            onClick={() => { setFilterType('ad'); setPage(1); }} 
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${filterType === 'ad' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
          >
            <ShoppingBag className={`w-[1em] h-[1em] text-xs ${filterType === 'ad' ? 'text-on-primary' : 'text-outline'}`} /> Oglasi
          </button>
          <button 
            onClick={() => { setFilterType('deal'); setPage(1); }} 
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${filterType === 'deal' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
          >
            <Flame className={`w-[1em] h-[1em] text-xs ${filterType === 'deal' ? 'text-on-primary' : 'text-secondary'}`} /> Popusti
          </button>
          <button 
            onClick={() => { setFilterType('event'); setPage(1); }} 
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${filterType === 'event' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
          >
            <CalendarDays className={`w-[1em] h-[1em] text-xs ${filterType === 'event' ? 'text-on-primary' : 'text-tertiary-container'}`} /> Dogodki
          </button>
          <button 
            onClick={() => { setFilterType('blog'); setPage(1); }} 
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${filterType === 'blog' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`}
          >
            <FileText className={`w-[1em] h-[1em] text-xs ${filterType === 'blog' ? 'text-on-primary' : 'text-primary'}`} /> Blog
          </button>
        </div>
        
        <div className="flex items-center gap-1.5 pl-2 sm:pl-0 sm:border-l sm:border-surface-container">
          <ArrowUpDown className="w-[1em] h-[1em] text-outline text-base" />
          <select className="bg-transparent font-label-md text-xs text-on-surface focus:outline-none cursor-pointer">
            <option>Najnovejše</option>
            <option>Priljubljeno</option>
            <option>Največ komentarjev</option>
          </select>
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
                  key={`blog-${blog.id}-${idx}`}
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
                  key={`ad-${ad.id}-${idx}`}
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
                  key={`deal-${deal.id}-${idx}`}
                  id={deal.id}
                  title={deal.title}
                  discount={deal.discount}
                  author={deal.partner}
                  date={deal.date}
                  description={deal.description}
                  code={deal.code}
                  link={deal.link}
                />
              );
            }
            if (item.type === 'event') {
              const ev = item.data;
              return (
                <EventPost
                  key={`event-${ev.id}-${idx}`}
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
    </main>
  );
}
