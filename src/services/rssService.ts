import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface RssFeedConfig {
  id: string;
  url: string;
  name: string;
  active: boolean;
}

export interface RealNewsItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
  thumbnail?: string;
  category?: string;
  feedId?: string;
}

export const DEFAULT_RSS_FEEDS: RssFeedConfig[] = [
  { id: 'rtvslo', url: 'https://img.rtvslo.si/feeds/00.xml', name: 'RTV Slovenija', active: true },
  { id: '24ur', url: 'https://www.24ur.com/rss', name: '24ur.com', active: true },
  { id: 'delo', url: 'https://www.delo.si/rss', name: 'Delo.si', active: true },
  { id: 'n1info', url: 'https://n1info.si/feed/', name: 'N1 Slovenija', active: true },
  { id: 'siol', url: 'https://siol.net/feeds/latest', name: 'Siol.net', active: true },
  { id: 'slovenskenovice', url: 'https://slovenskenovice.delo.si/rss', name: 'Slovenske novice', active: true },
  { id: 'maribor24', url: 'https://maribor24.si/feed/', name: 'Maribor24', active: true }
];

const STORAGE_KEY = 'admin_rss_feeds';
const CACHE_KEY = 'cached_real_rss_news_v4';
const LAST_KNOWN_GOOD_KEY = 'last_known_good_rss_news';
const CACHE_EXPIRY_MS = 2.5 * 60 * 1000; // 2.5 minutes cache for real-time freshness

// In-memory cache for instantaneous synchronous retrieval
let inMemoryNewsCache: RealNewsItem[] | null = null;
let inMemoryCacheTime = 0;
let inMemoryFeeds: RssFeedConfig[] | null = null;
let isFirestoreSynced = false;

/**
 * Initialize real-time synchronization of RSS feed configurations with Firestore.
 * This guarantees that sources added, edited or toggled in the Admin dashboard
 * are instantly available across all clients (both in development and in production).
 */
export function initAdminRssFeedsSync(): void {
  if (isFirestoreSynced || typeof window === 'undefined') return;
  isFirestoreSynced = true;

  try {
    const feedsRef = doc(db, 'settings', 'rss_feeds');
    onSnapshot(feedsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.feeds) && data.feeds.length > 0) {
          inMemoryFeeds = data.feeds;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.feeds));
          } catch {}
          window.dispatchEvent(new Event('rss_feeds_updated'));
        }
      }
    }, (err) => {
      console.warn('[RSS Service] Firestore sync listener warning:', err.message);
    });
  } catch (err) {
    console.warn('[RSS Service] Could not attach Firestore rss_feeds listener:', err);
  }
}

// Auto-initialize Firestore sync on client mount
if (typeof window !== 'undefined') {
  initAdminRssFeedsSync();
}

/**
 * Get all configured RSS feeds from Firestore / admin storage, or default to preset sources
 */
export function getAdminRssFeeds(): RssFeedConfig[] {
  if (inMemoryFeeds && inMemoryFeeds.length > 0) {
    return inMemoryFeeds;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryFeeds = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin_rss_feeds:', e);
  }
  return DEFAULT_RSS_FEEDS;
}

/**
 * Save RSS feeds to storage, sync with Firestore, and notify all active listeners
 */
export function saveAdminRssFeeds(feeds: RssFeedConfig[]): void {
  inMemoryFeeds = feeds;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
    window.dispatchEvent(new Event('rss_feeds_updated'));
  } catch (e) {
    console.error('Error saving admin_rss_feeds to localStorage:', e);
  }

  // Persist to Firestore settings collection so production mode loads all admin sources
  try {
    const feedsRef = doc(db, 'settings', 'rss_feeds');
    setDoc(feedsRef, {
      feeds,
      updatedAt: Date.now()
    }, { merge: true }).catch(err => {
      console.warn('[RSS Service] Error saving feeds to Firestore:', err);
    });
  } catch (err) {
    console.warn('[RSS Service] Failed to write feeds to Firestore:', err);
  }
}

/**
 * Synchronous getter: Retrieves cached news immediately on component mount,
 * ensuring UI news cards display immediately if previously fetched.
 */
export function getCachedRssNews(): RealNewsItem[] {
  if (inMemoryNewsCache && inMemoryNewsCache.length > 0) {
    return inMemoryNewsCache;
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        inMemoryNewsCache = parsed.items;
        inMemoryCacheTime = parsed.timestamp || Date.now();
        return parsed.items;
      }
    }

    const fallback = localStorage.getItem(LAST_KNOWN_GOOD_KEY);
    if (fallback) {
      const parsedFallback = JSON.parse(fallback);
      if (Array.isArray(parsedFallback) && parsedFallback.length > 0) {
        inMemoryNewsCache = parsedFallback;
        return parsedFallback;
      }
    }
  } catch (e) {
    // Ignore storage read errors
  }

  return [];
}

/**
 * Strip HTML tags and clean up text
 */
function cleanHtmlText(html: string): string {
  if (!html) return '';
  let text = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  text = text.replace(/<\/?[^>]+(>|$)/g, ' ');
  text = text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#38;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

/**
 * Validate that a URL is a valid web link
 */
function isValidArticleLink(url: any): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Extract image URL from enclosure, media tags, or description HTML
 */
function extractThumbnailFromXmlNode(node: Element): string {
  // Enclosure
  const enclosure = node.querySelector('enclosure');
  const encUrl = enclosure?.getAttribute('url');
  if (encUrl && isValidArticleLink(encUrl)) return encUrl.trim();

  // Media content / thumbnail
  const mediaContent = node.querySelector('content, thumbnail');
  const mediaUrl = mediaContent?.getAttribute('url');
  if (mediaUrl && isValidArticleLink(mediaUrl)) return mediaUrl.trim();

  // Search inside description or content
  const desc = node.querySelector('description, summary, content')?.textContent || '';
  const imgMatch = desc.match(/(?:<|&lt;)img[^>]+src=(?:["']|&#34;|&quot;)(https?:\/\/[^"'\s&;]+)/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1].trim();
  }

  return '';
}

/**
 * Parse XML string into RealNewsItem array using browser DOMParser
 */
function parseXmlDocument(xmlText: string, feed: RssFeedConfig): RealNewsItem[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const parseError = xml.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML parsing failed');
  }

  const items: RealNewsItem[] = [];
  const itemNodes = xml.querySelectorAll('item, entry');

  itemNodes.forEach((node, idx) => {
    const title = node.querySelector('title')?.textContent || '';
    let link = node.querySelector('link')?.textContent || node.querySelector('link')?.getAttribute('href') || '';
    const description = node.querySelector('description, summary, content')?.textContent || '';
    const pubDate = node.querySelector('pubDate, updated, published')?.textContent || '';
    const thumbnail = extractThumbnailFromXmlNode(node);

    if (title && isValidArticleLink(link)) {
      items.push({
        id: `rss-${feed.id}-${idx}`,
        title: cleanHtmlText(title),
        link: link.trim(),
        description: cleanHtmlText(description),
        pubDate: pubDate || new Date().toISOString(),
        sourceName: feed.name,
        thumbnail: thumbnail || undefined,
        category: 'Slovenija',
        feedId: feed.id
      });
    }
  });

  return items;
}

/**
 * Fetch a single feed with multiple fallback paths:
 * 1. Internal server proxy (/api/rss/proxy?url=...)
 * 2. External CORS proxy (allorigins)
 * 3. External CORS proxy (codetabs)
 */
export async function fetchSingleFeed(feed: RssFeedConfig): Promise<RealNewsItem[]> {
  // 1. First priority: Server-side proxy (Express /api/rss/proxy or Netlify function /.netlify/functions/rss-proxy)
  const proxyEndpoints = [
    `/api/rss/proxy?url=${encodeURIComponent(feed.url)}`,
    `/.netlify/functions/rss-proxy?url=${encodeURIComponent(feed.url)}`
  ];

  for (const proxyUrl of proxyEndpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(proxyUrl, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') || feed.url.includes('.html')) {
          const text = await response.text();
          if (text && (text.includes('<rss') || text.includes('<feed') || text.includes('<item') || text.includes('<entry'))) {
            const items = parseXmlDocument(text, feed);
            if (items.length > 0) return items;
          }
        }
      }
    } catch (e) {
      // Proceed to next proxy endpoint
    }
  }

  // 2. High-speed global CORS proxy: corsproxy.io
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(feed.url)}`;
    const response = await fetch(proxyUrl, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (response.ok) {
      const text = await response.text();
      if (text && (text.includes('<rss') || text.includes('<feed') || text.includes('<item') || text.includes('<entry'))) {
        const items = parseXmlDocument(text, feed);
        if (items.length > 0) return items;
      }
    }
  } catch (e) {
    // Proceed to fallbacks
  }

  // 3. Fallback: allorigins proxy
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(proxyUrl, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (response.ok) {
      const text = await response.text();
      if (text && (text.includes('<rss') || text.includes('<feed') || text.includes('<item') || text.includes('<entry'))) {
        const items = parseXmlDocument(text, feed);
        if (items.length > 0) return items;
      }
    }
  } catch (e) {
    // Proceed to codetabs
  }

  // 4. Fallback: codetabs proxy
  try {
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feed.url)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(proxyUrl, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (response.ok) {
      const text = await response.text();
      if (text && (text.includes('<rss') || text.includes('<feed') || text.includes('<item') || text.includes('<entry'))) {
        const items = parseXmlDocument(text, feed);
        if (items.length > 0) return items;
      }
    }
  } catch (e) {
    // Graceful skip
  }

  return [];
}

/**
 * Validate an RSS feed URL and test if news can be properly fetched
 */
export async function validateRssFeedUrl(url: string, name?: string): Promise<{ success: boolean; message: string; count: number; sampleTitle?: string }> {
  try {
    const testConfig: RssFeedConfig = {
      id: 'test',
      url: url.trim(),
      name: name || 'Test vir',
      active: true
    };
    const items = await fetchSingleFeed(testConfig);
    if (items.length > 0) {
      return {
        success: true,
        message: `Uspešno pridobljenih ${items.length} novic. Vir pravilno deluje!`,
        count: items.length,
        sampleTitle: items[0].title
      };
    } else {
      return {
        success: false,
        message: 'Iz tega vira ni bilo mogoče pridobiti nobenih novic. Preverite veljavnost povezave do RSS vira.',
        count: 0
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Napaka pri povezavi z RSS virom.',
      count: 0
    };
  }
}

export interface FetchRssNewsOptions {
  forceRefresh?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  onRetry?: (attempt: number, maxRetries: number) => void;
}

/**
 * Enhanced fetch function with automated retry mechanism and seamless fallback to cache.
 */
export async function fetchRealRssNewsWithRetry(
  options: FetchRssNewsOptions = {}
): Promise<{ items: RealNewsItem[]; isFromCache: boolean; retriesAttempted: number }> {
  const {
    forceRefresh = false,
    maxRetries = 1,
    retryDelayMs = 800,
    onRetry
  } = options;

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      if (attempt > 0 && onRetry) {
        onRetry(attempt, maxRetries);
      }
      
      const items = await fetchRealRssNews(attempt === 0 ? forceRefresh : true);
      if (items && items.length > 0) {
        return {
          items,
          isFromCache: false,
          retriesAttempted: attempt
        };
      }
    } catch (err) {
      console.warn(`[RSS Service] Fetch attempt ${attempt + 1}/${maxRetries + 1} failed:`, err);
    }

    attempt++;
    if (attempt <= maxRetries) {
      await new Promise(res => setTimeout(res, retryDelayMs * attempt));
    }
  }

  // If all retries failed or returned empty: Fallback directly to cached version
  console.info('[RSS Service] All fetch attempts completed. Falling back to cached news.');
  const cached = getCachedRssNews();
  return {
    items: cached,
    isFromCache: true,
    retriesAttempted: attempt - 1
  };
}

/**
 * Main function: Fetch REAL news strictly from active news sources.
 *
 * Architecture:
 * 1. Checks memory cache or localStorage (< 2.5 min) when !forceRefresh.
 * 2. Calls high-speed server-side endpoint `/api/rss/news` with active feeds.
 * 3. Falls back to individual feed proxies if server endpoint is unavailable.
 * 4. Critical stability safeguard: If upstream sources fail or return empty,
 *    NEVER return an empty list if previously fetched news items exist!
 *    Always fall back to last known good news items to guarantee cards remain visible.
 */
export async function fetchRealRssNews(forceRefresh: boolean = false): Promise<RealNewsItem[]> {
  const now = Date.now();

  // 1. Fast in-memory check
  if (!forceRefresh && inMemoryNewsCache && inMemoryNewsCache.length > 0 && (now - inMemoryCacheTime) < CACHE_EXPIRY_MS) {
    return inMemoryNewsCache;
  }

  // 2. Check localStorage cache
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp, items } = JSON.parse(cached);
        if (timestamp && (now - timestamp) < CACHE_EXPIRY_MS && Array.isArray(items) && items.length > 0) {
          inMemoryNewsCache = items;
          inMemoryCacheTime = timestamp;
          return items;
        }
      }
    } catch (e) {
      // cache read failed, continue
    }
  }

  const allFeeds = getAdminRssFeeds();
  const activeFeeds = allFeeds.filter(f => f.active);

  if (activeFeeds.length === 0) {
    return [];
  }

  // 3. Primary: High-speed server endpoint with automatic Netlify function fallback
  const endpointsToTry = [
    '/api/rss/news',
    '/.netlify/functions/rss-news'
  ];

  for (const endpoint of endpointsToTry) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      let res: Response | null = null;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            force: forceRefresh,
            feeds: activeFeeds
          }),
          signal: controller.signal
        });
      } catch (postErr) {
        // If POST failed or was refused, try GET fallback
        res = await fetch(`${endpoint}?force=${forceRefresh ? 'true' : 'false'}`, {
          method: 'GET',
          signal: controller.signal
        });
      }
      clearTimeout(timer);

      if (res && res.ok) {
        const contentType = res.headers.get('content-type') || '';
        // Ensure response is actually JSON, not an HTML SPA fallback page
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && Array.isArray(data.items) && data.items.length > 0) {
            // Save to in-memory & persistent cache
            inMemoryNewsCache = data.items;
            inMemoryCacheTime = now;

            try {
              localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({
                  timestamp: now,
                  items: data.items
                })
              );
              localStorage.setItem(LAST_KNOWN_GOOD_KEY, JSON.stringify(data.items));
            } catch (e) {
              // Ignore quota errors
            }

            return data.items;
          }
        }
      }
    } catch (err) {
      console.warn(`[RSS Service] ${endpoint} fetch error:`, err);
    }
  }

  // 4. Client-side fallback: Fetch active feeds in parallel via /api/rss/proxy
  try {
    const results = await Promise.allSettled(activeFeeds.map(feed => fetchSingleFeed(feed)));

    let combined: RealNewsItem[] = [];
    results.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        combined.push(...res.value);
      }
    });

    if (combined.length > 0) {
      // Strict deduplication by normalized article link and title
      const seenLinks = new Set<string>();
      const seenTitles = new Set<string>();
      const uniqueItems: RealNewsItem[] = [];

      for (const item of combined) {
        if (!isValidArticleLink(item.link)) continue;

        const normalizedLink = item.link.toLowerCase().replace(/\/$/, '');
        const normalizedTitle = item.title.toLowerCase().trim();

        if (!seenLinks.has(normalizedLink) && !seenTitles.has(normalizedTitle)) {
          seenLinks.add(normalizedLink);
          seenTitles.add(normalizedTitle);
          uniqueItems.push(item);
        }
      }

      // Sort by date descending (newest first)
      uniqueItems.sort((a, b) => {
        const timeA = new Date(a.pubDate).getTime();
        const timeB = new Date(b.pubDate).getTime();
        if (isNaN(timeA) || isNaN(timeB)) return 0;
        return timeB - timeA;
      });

      if (uniqueItems.length > 0) {
        inMemoryNewsCache = uniqueItems;
        inMemoryCacheTime = now;

        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              timestamp: now,
              items: uniqueItems
            })
          );
          localStorage.setItem(LAST_KNOWN_GOOD_KEY, JSON.stringify(uniqueItems));
        } catch (e) {
          // Ignore quota
        }

        return uniqueItems;
      }
    }
  } catch (err) {
    console.warn('[RSS Service] Fallback parallel fetch error:', err);
  }

  // 5. CRITICAL SAFEGUARD: If upstream sources are down or returned 0 items,
  // NEVER return an empty list if previous valid news items were stored!
  const lastKnown = getCachedRssNews();
  if (lastKnown.length > 0) {
    inMemoryNewsCache = lastKnown;
    return lastKnown;
  }

  return [];
}
