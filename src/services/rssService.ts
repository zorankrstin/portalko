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
  { id: 'n1info', url: 'https://n1info.si/feed/', name: 'N1 Slovenija', active: true }
];

export const INITIAL_BASELINE_NEWS: RealNewsItem[] = [
  {
    id: "rss-n1info-0-aXNuaS1rYW5kaWQv",
    title: "Rakovec ga je razrešil s funkcije podžupana, zdaj kandidira za županski stolček",
    link: "https://n1info.si/novice/slovenija/v-boj-za-zupanski-stolcek-v-kranju-se-podaja-tudi-edini-neodvisni-kandid/",
    description: "Janez Černe bo v Mestni občini Kranj, kjer je bil do poletja lani, ko ga je aktualni župan Matjaž Rakovec razrešil s položaja, tudi podžupan, na prihajajočih volitvah kandidiral kot neodvisni kandidat.",
    pubDate: "Wed, 21 Oct 2026 17:42:56 +0200",
    sourceName: "N1 Slovenija",
    thumbnail: "https://n1info.si/media/images/2026/10/21/1792596925_profimedia-1144061529.width-1200.jpg",
    category: "Slovenija",
    feedId: "n1info"
  },
  {
    id: "rss-rtvslo-0-cm92Lzc5NzY2NQ",
    title: "Ljubljanska veterinarska fakulteta ima novo stavbo, vredno 81 milijonov evrov",
    link: "https://www.rtvslo.si/slovenija/ljubljanska-veterinarska-fakulteta-ima-novo-stavbo-vredno-81-milijonov-evrov/797665",
    description: "V Ljubljani so slavnostno odprli novogradnjo veterinarske fakultete. Sogovorniki so poudarili, da nova fakulteta, vredna 81 milijonov evrov, predstavlja pomembno pridobitev za razvoj sodobne visokošolske ter raziskovalne infrastrukture.",
    pubDate: "Wed, 21 Oct 2026 17:41:42 +0200",
    sourceName: "RTV Slovenija",
    thumbnail: "https://img.rtvcdn.si/_up/upload/2026/10/21/67115326.jpg",
    category: "Slovenija",
    feedId: "rtvslo"
  },
  {
    id: "rss-delo-0-YWxjZS1uYXNpbGph",
    title: "Srbska policija pred volitvami prijela domnevne načrtovalce nasilja",
    link: "https://www.delo.si/novice/svet/srbska-policija-pred-volitvami-prijela-domnevne-nacrtovalce-nasilja",
    description: "Dva osumljenca naj bi imela hrvaško državljanstvo, Zagreb zanika vpletenost Hrvaške.",
    pubDate: "Wed, 21 Oct 2026 17:34:05 +0200",
    sourceName: "Delo.si",
    thumbnail: "https://www.delo.si/media/images/20261021/3754819.width-660.format-webp.webp",
    category: "Slovenija",
    feedId: "delo"
  },
  {
    id: "rss-rtvslo-1-ZXNlY2UvNzk3NjU5",
    title: "Pri Manchester Unitedu se bojijo, da bi Šeško lahko manjkal še štiri mesece",
    link: "https://www.rtvslo.si/sport/nogomet/pri-manchester-unitedu-se-bojijo-da-bi-sesko-lahko-manjkal-se-stiri-mesece/797659",
    description: "Pri Manchester Unitedu se bojijo, da bo Benjamin Šeško odsoten do novega leta, potem ko je pri okrevanju po poškodbi doživel nazadovanje.",
    pubDate: "Wed, 21 Oct 2026 17:32:25 +0200",
    sourceName: "RTV Slovenija",
    thumbnail: "https://img.rtvcdn.si/_up/upload/2026/09/17/67105010.jpg",
    category: "Šport",
    feedId: "rtvslo"
  },
  {
    id: "rss-24ur-2-YmUtbm9naS5odG1s",
    title: "Moški namerno trčil v poslanko, amputirali so ji obe nogi",
    link: "https://www.24ur.com/novice/tujina/moski-namerno-trcil-v-poslanko-amputirali-so-ji-obe-nogi.html",
    description: "Avstralska poslanka je v kritičnem stanju, potem ko jo je pred njeno pisarno zbil 43-letni voznik. Policija dogodek obravnava kot naklepno dejanje.",
    pubDate: "Wed, 21 Oct 2026 17:30:20 +0200",
    sourceName: "24ur.com",
    thumbnail: "https://images.24ur.com/media/images/213xX/Oct2026/77f7ccc39e9eb2d1f0a1_63667109.jpg?v=073b",
    category: "Tujina",
    feedId: "24ur"
  },
  {
    id: "rss-24ur-16-dGF2bm8uaHRtbA",
    title: "Lansko izplačilo božičnice neustavno, pravica ostaja",
    link: "https://www.24ur.com/novice/slovenija/lansko-izplacilo-bozicnice-neustavno.html",
    description: "Lansko izplačilo božičnice zaposlenim, ki niso javni uslužbenci, je zaradi retroaktivnega učinka neskladno z ustavo, meni ustavno sodišče, ki pa ukrepa kljub temu ni razveljavilo.",
    pubDate: "Wed, 21 Oct 2026 17:30:04 +0200",
    sourceName: "24ur.com",
    thumbnail: "https://images.24ur.com/media/images/213xX/Dec2025/354f9aaf2b1f8e3216af_63516278.jpg?v=8c88",
    category: "Slovenija",
    feedId: "24ur"
  },
  {
    id: "rss-rtvslo-2-a2FsY2kvNzk3NjY2",
    title: "V Klingenthal z vsemi najboljšimi skakalkami in skakalci",
    link: "https://www.rtvslo.si/sport/zimski-sporti/v-klingenthal-z-vsemi-najboljsimi-skakalkami-in-skakalci/797666",
    description: "Konec tedna bo Klingenthal tradicionalno gostil finale poletne velike nagrade v skokih. V Nemčiji bodo nastopili vsi najboljši slovenski skakalci in skakalke.",
    pubDate: "Wed, 21 Oct 2026 17:29:57 +0200",
    sourceName: "RTV Slovenija",
    thumbnail: "https://img.rtvcdn.si/_up/upload/2026/08/01/67065139.jpg",
    category: "Šport",
    feedId: "rtvslo"
  },
  {
    id: "rss-n1info-1-YS1uYS1nbGF2by8",
    title: "Zaradi napihnjenosti obiskala zdravnika, nato pa se ji je življenje obrnilo na glavo",
    link: "https://n1info.si/zdravje/zdravniki-so-menili-da-gre-za-okuzbo-secil-nato-pa-odkrili-redko-motnjo-ki-ji-je-zivljenje-obrnila-na-glavo/",
    description: "Tridesetletna Evan Francis je zaradi bolečin v hrbtu in napihnjenosti večkrat poiskala zdravniško pomoč, a so njene težave sprva pripisovali okužbi.",
    pubDate: "Wed, 21 Oct 2026 17:29:25 +0200",
    sourceName: "N1 Slovenija",
    thumbnail: "https://n1info.si/media/images/2026/10/21/1792575183_profimedia-1144563301.width-1200.jpg",
    category: "Zdravje",
    feedId: "n1info"
  }
];

const STORAGE_KEY = 'admin_rss_feeds';
const CACHE_KEY = 'cached_real_rss_news_v3';
const LAST_KNOWN_GOOD_KEY = 'last_known_good_rss_news';
const CACHE_EXPIRY_MS = 2.5 * 60 * 1000; // 2.5 minutes cache for real-time freshness

// In-memory cache for instantaneous synchronous retrieval
let inMemoryNewsCache: RealNewsItem[] | null = null;
let inMemoryCacheTime = 0;

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
 * Synchronous getter: Retrieves cached news immediately on component mount,
 * ensuring UI news cards NEVER flicker or render empty while fresh news loads.
 * Falls back to INITIAL_BASELINE_NEWS on brand new sessions.
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

  // Pre-seed baseline news so new users in production never see a blank screen
  if (!inMemoryNewsCache || inMemoryNewsCache.length === 0) {
    inMemoryNewsCache = INITIAL_BASELINE_NEWS;
  }
  return INITIAL_BASELINE_NEWS;
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
  // 1. First priority: Internal server-side proxy with strict 3.5s timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const proxyUrl = `/api/rss/proxy?url=${encodeURIComponent(feed.url)}`;
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

  // 3. Primary: High-speed server endpoint (/api/rss/news) with fast 5s timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    let res: Response | null = null;
    try {
      res = await fetch('/api/rss/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force: forceRefresh,
          feeds: activeFeeds
        }),
        signal: controller.signal
      });
    } catch (postErr) {
      // If POST was blocked or unsupported, fallback to GET
      res = await fetch(`/api/rss/news?force=${forceRefresh ? 'true' : 'false'}`, {
        method: 'GET',
        signal: controller.signal
      });
    }
    clearTimeout(timer);

    if (res && res.ok) {
      const contentType = res.headers.get('content-type') || '';
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
    console.warn('[RSS Service] /api/rss/news fetch error, attempting client-side fallback:', err);
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
