import { useState } from 'react';
import { useBookmarks, SavedItemData } from '../contexts/BookmarkContext';
import { BlogPost } from './posts/BlogPost';
import { AdPost } from './posts/AdPost';
import { DealPost } from './posts/DealPost';
import { EventPost } from './posts/EventPost';
import { NewsPost } from './posts/NewsPost';
import { RssPost } from './posts/RssPost';
import { Bookmark, ShoppingBag, Newspaper, Calendar, FileText, Percent, Inbox } from 'lucide-react';
import { matchesSearchAndCategory, parseSearchQuery } from '../utils/searchUtils';

export function SavedPostsTab({ searchQuery = '' }: { searchQuery?: string }) {
  const { savedIds, savedItems, getItemData } = useBookmarks();
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  const parsedSearch = parseSearchQuery(searchQuery);

  // Collect all saved items with fallback data
  const allSavedItems: SavedItemData[] = savedIds.map(id => {
    const data = getItemData(id);
    if (data) return data;
    const stored = savedItems[id];
    if (stored) return stored;
    return {
      id,
      category: id.startsWith('rss') ? 'news' : id.startsWith('oglas') || id.startsWith('ad') ? 'ads' : id.startsWith('dogodek') || id.startsWith('event') ? 'events' : 'blog',
      title: `Objava #${id}`,
    };
  });

  // Calculate category counts
  const countCategory = (cat: string) => {
    return allSavedItems.filter(item => {
      const itemCat = item.category || 'blog';
      if (cat === 'all') return true;
      if (cat === 'news') return itemCat === 'news' || item.type === 'news';
      if (cat === 'ads') return itemCat === 'ads' || item.type === 'ad';
      if (cat === 'events') return itemCat === 'events' || item.type === 'event';
      if (cat === 'blog') return itemCat === 'blog' || item.type === 'blog';
      if (cat === 'deals') return itemCat === 'deals' || item.type === 'deal';
      return false;
    }).length;
  };

  const newsCount = countCategory('news');
  const adsCount = countCategory('ads');
  const eventsCount = countCategory('events');
  const blogCount = countCategory('blog');
  const dealsCount = countCategory('deals');

  // Filter items by search query and category
  const filteredItems = allSavedItems.filter(item => {
    const itemCat = (item.category || item.type || 'blog').toString().toLowerCase();

    // 1. Tab filter check
    if (selectedCategoryTab !== 'all') {
      const matchesTab = 
        (selectedCategoryTab === 'news' && (itemCat.includes('news') || itemCat.includes('novic'))) ||
        (selectedCategoryTab === 'ads' && (itemCat.includes('ad') || itemCat.includes('oglas'))) ||
        (selectedCategoryTab === 'events' && (itemCat.includes('event') || itemCat.includes('dogod'))) ||
        (selectedCategoryTab === 'blog' && (itemCat.includes('blog') || itemCat.includes('post'))) ||
        (selectedCategoryTab === 'deals' && (itemCat.includes('deal') || itemCat.includes('popust')));
      if (!matchesTab) return false;
    }

    // 2. Search query check
    const fullText = [
      item.title,
      item.description,
      item.author,
      item.organizer,
      item.sourceName,
      item.location,
      item.price,
      item.date,
    ].filter(Boolean).join(' ');

    return matchesSearchAndCategory(fullText, itemCat, searchQuery);
  });

  if (savedIds.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm border border-surface-container/50 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 bg-surface-container-low text-outline rounded-full flex items-center justify-center">
          <Bookmark className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-headline-sm text-lg font-bold text-on-surface">Nimate še shranjenih objav</h3>
          <p className="font-body-md text-on-surface-variant max-w-sm">
            Kliknite na ikono zaznamka ob poljubni objavi, novici, malem oglasu ali dogodku, da si jo shranite za kasnejši ogled.
          </p>
        </div>
      </div>
    );
  }

  const renderSavedItem = (item: SavedItemData) => {
    const id = item.id;
    const itemCat = (item.category || item.type || '').toString().toLowerCase();

    // News (RSS or NewsPost)
    if (itemCat.includes('news') || itemCat.includes('novic') || id.startsWith('rss')) {
      if (item.sourceName || item.pubDate || item.link || id.startsWith('rss')) {
        return <RssPost key={id} id={id} {...item} />;
      }
      return <NewsPost key={id} id={id} {...item} />;
    }

    // Mali Oglasi (AdPost)
    if (itemCat.includes('ad') || itemCat.includes('oglas') || id.startsWith('oglas') || id.startsWith('ad') || id.startsWith('inline-ad')) {
      return <AdPost key={id} id={id} {...item} />;
    }

    // Dogodki (EventPost)
    if (itemCat.includes('event') || itemCat.includes('dogod') || id.startsWith('dogodek') || id.startsWith('event')) {
      return <EventPost key={id} id={id} {...item} />;
    }

    // Ugodnosti / Popusti (DealPost)
    if (itemCat.includes('deal') || itemCat.includes('popust') || id.startsWith('deal')) {
      return <DealPost key={id} id={id} {...item} />;
    }

    // Blog & Default
    return <BlogPost key={id} id={id} {...item} />;
  };

  return (
    <div className="flex flex-col gap-space-md">
      {/* Title & total count */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h1 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Shranjene objave ({savedIds.length})
          </h1>
          <p className="font-body-sm text-xs text-outline">
            Vse vaše zaznamovane novice, oglasi, dogodki in blog zapisi na enem mestu.
          </p>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-surface-container-low">
        <button
          onClick={() => setSelectedCategoryTab('all')}
          className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
            selectedCategoryTab === 'all'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <span>Vse</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            selectedCategoryTab === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
          }`}>
            {savedIds.length}
          </span>
        </button>

        {adsCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('ads')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'ads'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Mali oglasi</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'ads' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {adsCount}
            </span>
          </button>
        )}

        {newsCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('news')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'news'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Novice</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'news' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {newsCount}
            </span>
          </button>
        )}

        {eventsCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('events')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'events'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Dogodki</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'events' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {eventsCount}
            </span>
          </button>
        )}

        {blogCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('blog')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'blog'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Blog</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'blog' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {blogCount}
            </span>
          </button>
        )}

        {dealsCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('deals')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'deals'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Popusti</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'deals' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {dealsCount}
            </span>
          </button>
        )}
      </div>

      {/* Item List */}
      {filteredItems.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-surface-container-low/40 rounded-2xl border border-dashed border-surface-container">
          <Inbox className="w-10 h-10 text-outline" />
          <p className="font-body-md text-on-surface-variant">
            Ni najdenih shranjenih objav za izbrane filtre.
          </p>
          {(selectedCategoryTab !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategoryTab('all');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high font-label-md text-xs font-semibold text-on-surface transition-colors"
            >
              Prikaži vse shranjene objave
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-space-md">
          {filteredItems.map(item => renderSavedItem(item))}
        </div>
      )}
    </div>
  );
}
