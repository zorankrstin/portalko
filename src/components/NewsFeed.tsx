import { useState, useEffect } from 'react';
import { Rss, Search, ChevronDown, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';
import { RssPost } from './posts/RssPost';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { fetchRealRssNews, getAdminRssFeeds, RealNewsItem, RssFeedConfig } from '../services/rssService';

interface NewsFeedProps {
  onViewChange: (view: 'main') => void;
  searchQuery?: string;
}

export function NewsFeed({ onViewChange, searchQuery = '' }: NewsFeedProps) {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [rssItems, setRssItems] = useState<RealNewsItem[]>([]);
  const [activeFeeds, setActiveFeeds] = useState<RssFeedConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadFeeds = async (force: boolean = false) => {
    try {
      setIsRefreshing(true);
      const configuredFeeds = getAdminRssFeeds();
      setActiveFeeds(configuredFeeds.filter(f => f.active));

      const realNews = await fetchRealRssNews(force);
      setRssItems(realNews);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading real RSS news:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeeds(false);

    const handleUpdate = () => {
      loadFeeds(true);
    };

    window.addEventListener('rss_feeds_updated', handleUpdate);
    return () => window.removeEventListener('rss_feeds_updated', handleUpdate);
  }, []);

  // Filter items based on active search and selected category/source
  const filtered = rssItems.filter(item => {
    const textToMatch = `${item.title} ${item.description} ${item.sourceName} ${item.category || ''}`;
    const matchesSearch = matchesSearchAndCategory(textToMatch, 'news', searchQuery);
    
    if (!matchesSearch) return false;
    if (selectedCategory === 'all') return true;

    const catLower = selectedCategory.toLowerCase();
    const itemCat = (item.category || '').toLowerCase();
    const sourceLower = (item.sourceName || '').toLowerCase();

    return itemCat.includes(catLower) || sourceLower.includes(catLower);
  });

  const PAGE_SIZE = 10;
  const currentLimit = page * PAGE_SIZE;
  const visibleNews = filtered.slice(0, currentLimit);
  const hasMore = currentLimit < filtered.length;

  const handleLoadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoading(false);
    }, 400);
  };

  // Build dynamic categories list based on available sources and major topics
  const dynamicFilterPills = [
    { id: 'all', label: 'Vse novice' },
    ...activeFeeds.map(feed => ({ id: feed.name, label: feed.name })),
  ];

  return (
    <div className="flex flex-col gap-space-md">
      {/* Header section */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-2xl font-bold text-on-surface flex items-center gap-2.5">
                <Rss className="w-[1em] h-[1em] text-primary shrink-0" />
                <span>Novice</span>
              </h1>
              <span className="flex items-center gap-1 text-[11px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                V živo
              </span>
            </div>
          </div>
          <button 
            onClick={() => loadFeeds(true)}
            disabled={isRefreshing}
            className="flex-shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer border border-surface-container"
            title="Pridobi najnovejše objave iz vseh aktivnih RSS virov"
          >
            <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Prenašanje...' : 'Osveži vire'}</span>
          </button>
        </div>

        {/* Active Sources Badges */}
        <div className="pt-2 border-t border-surface-container-low/60 flex flex-wrap items-center gap-1.5 text-xs text-outline">
          <span className="font-semibold text-on-surface flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          </span>
          {activeFeeds.length === 0 ? (
            <span className="text-error font-medium">Ni aktivnih virov v nadzorni plošči</span>
          ) : (
            activeFeeds.map(feed => (
              <span key={feed.id} className="bg-surface-container px-2 py-0.5 rounded-md font-medium text-[11px] text-on-surface-variant">
                {feed.name}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Category & Source filters */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-1">
        {dynamicFilterPills.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors shadow-sm cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-lowest hover:bg-surface-container border border-surface-container text-on-surface-variant'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 10 Real News Cards initially */}
      <div className="flex flex-col gap-space-md">
        {!hasLoaded && isRefreshing ? (
          <div className="py-12 flex flex-col items-center justify-center text-outline bg-surface-container-lowest rounded-2xl border border-surface-container/50">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
            <p className="font-label-md text-sm">Prenašanje resničnih novic iz RSS virov...</p>
          </div>
        ) : visibleNews.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-surface-container/50 flex flex-col items-center gap-2">
            <Rss className="w-8 h-8 text-outline/50" />
            <p className="font-headline-sm text-base font-bold text-on-surface">Ni najdenih novic</p>
            <p className="font-body-sm text-xs text-outline max-w-sm">
              Za izbrane filtre ali iskalni niz trenutno ni zadetkov v prenesenih RSS novicah. Poskusite z drugim iskanjem ali osvežite vire.
            </p>
          </div>
        ) : (
          visibleNews.map((item) => (
            <RssPost
              key={item.id}
              id={item.id}
              title={item.title}
              link={item.link}
              description={item.description}
              pubDate={item.pubDate}
              sourceName={item.sourceName}
              thumbnail={item.thumbnail}
            />
          ))
        )}
      </div>

      {/* Load More Button */}
      {visibleNews.length > 0 && hasMore && (
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
            <span>{isLoading ? 'Nalaganje novic...' : 'Naloži še 10 novic'}</span>
          </button>
          <span className="font-body-sm text-xs text-outline">
            Prikazano {visibleNews.length} od {filtered.length} novic
          </span>
        </div>
      )}

      {visibleNews.length > 0 && !hasMore && (
        <div className="text-center py-4 font-body-sm text-xs text-outline border-t border-surface-container-low">
          Prikazane so vse pridobljene novice iz aktivnih virov ({filtered.length} novic).
        </div>
      )}
    </div>
  );
}
