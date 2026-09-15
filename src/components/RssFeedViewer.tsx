import React, { useState, useEffect } from 'react';
import { RssPost } from './posts/RssPost';
import { RssFeedConfig } from './AdminDashboard';
import { parseRssDate } from '../utils/dateUtils';
import { matchesSearchAndCategory } from '../utils/searchUtils';

interface FeedItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  thumbnail: string;
  sourceName: string;
  id: string;
}

export function RssFeedViewer({ searchQuery = '' }: { searchQuery?: string }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      setError('');
      
      const saved = localStorage.getItem('admin_rss_feeds');
      let feeds: RssFeedConfig[] = [];
      if (saved) {
        feeds = JSON.parse(saved);
      } else {
        feeds = [
          { id: '1', url: 'https://www.rtvslo.si/feeds/00.xml', name: 'RTV Slovenija', active: true },
          { id: '2', url: 'https://www.24ur.com/rss', name: '24ur', active: true }
        ];
      }

      const activeFeeds = feeds.filter(f => f.active);
      if (activeFeeds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      let allItems: FeedItem[] = [];

      // Fetch all active feeds using rss2json proxy to avoid CORS
      for (const feed of activeFeeds) {
        try {
          const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
          if (!response.ok) continue;
          
          const data = await response.json();
          if (data.status === 'ok' && data.items) {
            const feedItems = data.items.slice(0, 5).map((item: any, idx: number) => ({
              guid: item.guid || `${feed.id}-${idx}`,
              title: item.title,
              link: item.link,
              description: item.description,
              pubDate: item.pubDate,
              thumbnail: item.thumbnail || item.enclosure?.link || '',
              sourceName: feed.name,
              id: `rss-${feed.id}-${idx}`
            }));
            allItems = [...allItems, ...feedItems];
          }
        } catch (err) {
          console.error('Failed to fetch feed', feed.name, err);
        }
      }

      // Sort by date descending
      allItems.sort((a, b) => {
        const timeA = parseRssDate(a.pubDate)?.getTime() ?? new Date(a.pubDate).getTime();
        const timeB = parseRssDate(b.pubDate)?.getTime() ?? new Date(b.pubDate).getTime();
        return timeB - timeA;
      });
      
      setItems(allItems);
    } catch (err) {
      console.error(err);
      setError('Napaka pri nalaganju RSS virov.');
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
      {filteredItems.map(item => (
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
      ))}
    </div>
  );
}
