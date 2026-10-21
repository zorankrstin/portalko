import React, { useState, useEffect } from 'react';
import { RssPost } from './posts/RssPost';
import { parseRssDate } from '../utils/dateUtils';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { fetchRealRssNews, getCachedRssNews, RealNewsItem } from '../services/rssService';

export function RssFeedViewer({ searchQuery = '' }: { searchQuery?: string }) {
  const [items, setItems] = useState<RealNewsItem[]>(() => getCachedRssNews());
  const [loading, setLoading] = useState(() => getCachedRssNews().length === 0);
  const [error, setError] = useState('');

  const fetchFeeds = async () => {
    try {
      if (items.length === 0) setLoading(true);
      setError('');
      
      const allNews = await fetchRealRssNews();
      if (allNews && allNews.length > 0) {
        setItems(allNews);
      }
    } catch (err) {
      console.error(err);
      if (items.length === 0) {
        setError('Napaka pri nalaganju RSS virov.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();

    const handleUpdate = () => {
      fetchFeeds();
    };

    window.addEventListener('rss_feeds_updated', handleUpdate);
    return () => window.removeEventListener('rss_feeds_updated', handleUpdate);
  }, []);

  if (loading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-outline">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p>Nalaganje novic...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-error">
        <p>{error}</p>
      </div>
    );
  }

  const filteredItems = items.filter(item => {
    const itemText = [item.title, item.description, item.sourceName].filter(Boolean).join(' ');
    return matchesSearchAndCategory(itemText, 'news', searchQuery);
  });

  if (items.length === 0) {
    return null; // Don't show anything if no active feeds or no items
  }

  if (searchQuery && filteredItems.length === 0) {
    return null; // Don't show anything if search filters everything out
  }

  return (
    <div className="flex flex-col gap-space-md">
      {filteredItems.map((item, idx) => (
        <RssPost 
          key={`rss-viewer-${item.id}-${idx}`}
          id={item.id}
          title={item.title}
          link={item.link}
          description={item.description}
          pubDate={item.pubDate}
          sourceName={item.sourceName}
          thumbnail={item.thumbnail}
        />
      ))}
    </div>
  );
}
