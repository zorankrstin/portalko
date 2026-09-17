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
  { id: 'rtvslo', url: 'https://www.rtvslo.si/feeds/00.xml', name: 'RTV Slovenija', active: true },
  { id: '24ur', url: 'https://www.24ur.com/rss', name: '24ur.com', active: true },
  { id: 'delo', url: 'https://www.delo.si/rss', name: 'Delo.si', active: true },
  { id: 'n1info', url: 'https://n1info.si/feed/', name: 'N1 Slovenija', active: true }
];

const STORAGE_KEY = 'admin_rss_feeds';
const CACHE_KEY = 'cached_real_rss_news_v2';
const CACHE_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes cache for real-time freshness

/**
 * Get all configured RSS feeds from admin storage, or default to preset sources
 */
export function getAdminRssFeeds(): RssFeedConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading admin_rss_feeds:', e);
  }
  return DEFAULT_RSS_FEEDS;
}

/**
 * Save RSS feeds to storage and notify listeners
 */
export function saveAdminRssFeeds(feeds: RssFeedConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
    window.dispatchEvent(new Event('rss_feeds_updated'));
  } catch (e) {
    console.error('Error saving admin_rss_feeds:', e);
  }
}

/**
 * Strip HTML tags and clean up text
 */
function cleanHtmlText(html: string): string {
  if (!html) return '';
  // Strip tags
  let text = html.replace(/<\/?[^>]+(>|$)/g, ' ');
  // Decode common HTML entities
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
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

/**
 * Extract image URL from item fields, enclosures, or HTML description
 */
function extractThumbnail(item: any, rawHtml: string = ''): string {
  if (item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http')) {
    return item.thumbnail;
  }
  if (item.enclosure && item.enclosure.link && typeof item.enclosure.link === 'string' && item.enclosure.link.startsWith('http')) {
    return item.enclosure.link;
  }
  // Try extracting from description/content HTML (e.g. 24ur or N1 embed img tags)
  const combinedHtml = `${rawHtml} ${item.description || ''} ${item.content || ''}`;
  const imgMatch = combinedHtml.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  return '';
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
 * Parse an individual feed using rss2json
 */
async function fetchFeedViaRss2Json(feed: RssFeedConfig): Promise<RealNewsItem[]> {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from rss2json`);
  }
  const data = await response.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) {
    throw new Error(data.message || 'Invalid feed structure');
  }

  const items: RealNewsItem[] = [];
  for (let idx = 0; idx < data.items.length; idx++) {
    const item = data.items[idx];
    const link = item.link || item.guid;
    if (!isValidArticleLink(link)) continue;
    if (!item.title || !item.title.trim()) continue;

    const thumbnail = extractThumbnail(item, item.description);
    const cleanDesc = cleanHtmlText(item.description || item.content || '');

    // Category detection
    let category = 'Slovenija';
    if (Array.isArray(item.categories) && item.categories.length > 0 && typeof item.categories[0] === 'string') {
      category = item.categories[0];
    } else if (feed.name.toLowerCase().includes('šport') || (item.title && item.title.toLowerCase().includes('šport'))) {
      category = 'Šport';
    }

    items.push({
      id: `rss-${feed.id}-${idx}-${encodeURIComponent(link.slice(-25))}`,
      title: cleanHtmlText(item.title),
      link: link.trim(),
      description: cleanDesc,
      pubDate: item.pubDate || new Date().toISOString(),
      sourceName: feed.name,
      thumbnail: thumbnail || undefined,
      category,
      feedId: feed.id
    });
  }

  return items;
}

/**
 * Fallback parser using allorigins proxy and native DOMParser
 */
async function fetchFeedViaCorsProxy(feed: RssFeedConfig): Promise<RealNewsItem[]> {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`;
  const response = await fetch(proxyUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from proxy`);
  }
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');

  // Check for parse error
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

    // Enclosure
    const enclosureLink = node.querySelector('enclosure')?.getAttribute('url') || '';
    let thumbnail = enclosureLink;
    if (!thumbnail) {
      const match = description.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
      if (match) thumbnail = match[1];
    }

    if (title && isValidArticleLink(link)) {
      items.push({
        id: `rss-${feed.id}-proxy-${idx}`,
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
 * Fallback parser using codetabs proxy
 */
async function fetchFeedViaCodetabsProxy(feed: RssFeedConfig): Promise<RealNewsItem[]> {
  const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feed.url)}`;
  const response = await fetch(proxyUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from codetabs proxy`);
  }
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
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
    const enclosureLink = node.querySelector('enclosure')?.getAttribute('url') || '';
    let thumbnail = enclosureLink;
    if (!thumbnail) {
      const match = description.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
      if (match) thumbnail = match[1];
    }

    if (title && isValidArticleLink(link)) {
      items.push({
        id: `rss-${feed.id}-codetabs-${idx}`,
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
 * Fetch a single feed with multiple fallbacks
 */
export async function fetchSingleFeed(feed: RssFeedConfig): Promise<RealNewsItem[]> {
  try {
    return await fetchFeedViaRss2Json(feed);
  } catch (err1) {
    try {
      return await fetchFeedViaCorsProxy(feed);
    } catch (err2) {
      try {
        return await fetchFeedViaCodetabsProxy(feed);
      } catch (err3) {
        console.warn(`All online proxy methods failed for ${feed.name}. Gracefully skipping.`);
        return [];
      }
    }
  }
}

/**
 * Validate an RSS feed URL and test if news can be properly fetched
 */
export async function validateRssFeedUrl(url: string, name?: string): Promise<{ success: boolean; message: string; count: number; sampleTitle?: string }> {
  try {
    const testConfig: RssFeedConfig = {
      id: 'test',
      url: url.trim(),
      name: name || 'Test',
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
        message: 'Iz tega vira ni bilo mogoče pridobiti nobenih novic. Preverite veljavnost RSS povezave.',
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

/**
 * Main function: Fetch REAL news strictly from active news sources listed in admin panel.
 * Deduplicates and sorts newest first. Caches locally for fast retrieval.
 */
export async function fetchRealRssNews(forceRefresh: boolean = false): Promise<RealNewsItem[]> {
  // Check cached data if not forcing refresh
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp, items } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY_MS && Array.isArray(items) && items.length > 0) {
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

  // Fetch all active feeds in parallel
  const results = await Promise.allSettled(activeFeeds.map(feed => fetchSingleFeed(feed)));

  let combined: RealNewsItem[] = [];
  results.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      combined.push(...res.value);
    }
  });

  // Strict deduplication by normalized article link and title
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const uniqueItems: RealNewsItem[] = [];

  for (const item of combined) {
    // Only allow items that link to an actual article
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

  // Save to cache
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        items: uniqueItems
      })
    );
  } catch (e) {
    // ignore quota errors
  }

  return uniqueItems;
}
