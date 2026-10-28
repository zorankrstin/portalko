import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { 
  getBaseSitemapEntries, 
  generateXmlFromEntries, 
  formatFirestoreDocToSitemapEntry, 
  SitemapEntry, 
  SITE_URL 
} from "./src/utils/sitemapGenerator";

dotenv.config();

const _currentFilename = typeof __filename !== "undefined" ? __filename : (typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : process.cwd());
const _currentDirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(_currentFilename);

const GA_TAG_HTML = `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-DYZSLZ29C4"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-DYZSLZ29C4');
    </script>`;

// Cached dynamic sitemap in memory (refreshed every 15 minutes)
let cachedSitemapXml: string | null = null;
let lastSitemapTime = 0;
const SITEMAP_CACHE_DURATION = 15 * 60 * 1000;

async function getOrGenerateSitemap(): Promise<string> {
  const now = Date.now();
  if (cachedSitemapXml && now - lastSitemapTime < SITEMAP_CACHE_DURATION) {
    return cachedSitemapXml;
  }

  const entries: SitemapEntry[] = getBaseSitemapEntries();
  const seenLocs = new Set<string>(entries.map(e => e.loc));

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const { initializeApp } = await import("firebase/app");
      const { getFirestore, collection, getDocs } = await import("firebase/firestore");
      const app = initializeApp(cfg);
      const db = getFirestore(app, cfg.firestoreDatabaseId);

      // Fetch Events
      try {
        const eventsSnap = await getDocs(collection(db, "events"));
        eventsSnap.forEach(docSnap => {
          const entry = formatFirestoreDocToSitemapEntry(docSnap.data(), docSnap.id, "event");
          if (entry && !seenLocs.has(entry.loc)) {
            seenLocs.add(entry.loc);
            entries.push(entry);
          }
        });
      } catch (e) {
        // Ignore firestore read errors
      }

      // Fetch Ads
      try {
        const adsSnap = await getDocs(collection(db, "ads"));
        adsSnap.forEach(docSnap => {
          const entry = formatFirestoreDocToSitemapEntry(docSnap.data(), docSnap.id, "ad");
          if (entry && !seenLocs.has(entry.loc)) {
            seenLocs.add(entry.loc);
            entries.push(entry);
          }
        });
      } catch (e) {
        // Ignore firestore read errors
      }

      // Fetch Posts (Deals, Blog, News)
      try {
        const postsSnap = await getDocs(collection(db, "posts"));
        postsSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (!data || !data.title) return;
          const isDeal = data.type === "deal" || 
                         data.category === "deal" || 
                         data.category?.startsWith("deal") || 
                         (data.categoryName && /ugodnost|akcij|popust|trgovin|hrana/i.test(data.categoryName)) || 
                         Boolean(data.discount) || 
                         Boolean(data.promoCode);
          const type = isDeal ? "deal" : data.type === "news" ? "news" : "blog";
          const entry = formatFirestoreDocToSitemapEntry(data, docSnap.id, type);
          if (entry && !seenLocs.has(entry.loc)) {
            seenLocs.add(entry.loc);
            entries.push(entry);
          }
        });
      } catch (e) {
        // Ignore firestore read errors
      }
    }
  } catch (err: any) {
    console.warn("Error augmenting dynamic sitemap from Firestore:", err.message);
  }

  const xml = generateXmlFromEntries(entries);
  cachedSitemapXml = xml;
  lastSitemapTime = now;
  return xml;
}

/**
 * Injects Google Analytics tag at the very beginning of <head>,
 * along with route-specific SEO titles and meta descriptions.
 */
function preparePageHtml(rawHtml: string, reqUrl: string): string {
  let html = rawHtml;

  // Determine metadata based on URL path
  const parsedUrl = new URL(reqUrl, "https://portalko.net");
  const pathname = parsedUrl.pathname.replace(/\/+$/, "") || "/";
  const segments = pathname.split("/").filter(Boolean);

  let title = "Portalko – Slovenski portal za novice, male oglase in dogodke";
  let description = "Portalko je osrednji slovenski spletni portal za novice, brezplačne male oglase, lokalne dogodke, ugodnosti in popuste ter skupnost po vsej Sloveniji.";
  let ogType = "website";
  const canonicalUrl = `https://portalko.net${pathname === "/" ? "" : pathname}`;

  if (pathname === "/novice") {
    title = "Aktualne novice v Sloveniji – RSS viri v živo | Portalko";
    description = "Zadnje novice iz osrednjih slovenskih medijev in RSS virov v živo. Preverite dogajanja v Sloveniji in po svetu.";
  } else if (pathname === "/mali-oglasi") {
    title = "Mali oglasi Slovenija – Brezplačni spletni oglasi | Portalko";
    description = "Brezplačni mali oglasi v Sloveniji. Rabljena in nova vozila, nepremičnine, elektronika, dom in storitve po slovenskih regijah.";
  } else if (pathname === "/dogodki") {
    title = "Dogodki in prireditve v Sloveniji – Koledar dogodkov | Portalko";
    description = "Koledar prireditev, koncertov, festivalov, športnih in kulturnih dogodkov po celotni Sloveniji.";
  } else if (pathname === "/akcije") {
    title = "Akcije, popusti in ugodnosti v Sloveniji | Portalko";
    description = "Preverjene akcije, promocijske kode, ugodnosti in popusti v slovenskih trgovinah ter na spletu.";
  } else if (pathname === "/blog") {
    title = "Blog & Zgodbe slovenske skupnosti | Portalko";
    description = "Avtorske zgodbe, potopisi, lokalni vodiči in razmišljanja članov slovenske spletne skupnosti Portalko.";
  } else if (pathname === "/shranjeno") {
    title = "Shranjene objave in zaznamki | Portalko";
    description = "Vaše shranjene novice, mali oglasi, dogodki in ugodnosti na enem mestu za hiter dostop.";
  } else if (pathname === "/o-nas") {
    title = "O portalu Portalko – Slovenski portal za novice, male oglase in dogodke | Portalko";
    description = "Spoznajte portal Portalko, osrednjo slovensko skupnost za novice, male oglase, lokalne prireditve in ugodnosti.";
  } else if (pathname === "/pogoji-uporabe") {
    title = "Pogoji uporabe portala | Portalko";
    description = "Pogoji uporabe in pravna pravila za uporabnike spletnega portala Portalko.";
  } else if (pathname === "/zasebnost") {
    title = "Politika zasebnosti | Portalko";
    description = "Informacije o varstvu osebnih podatkov in zasebnosti na portalu Portalko.";
  } else if (pathname === "/kontakt") {
    title = "Kontakt | Portalko";
    description = "Stopite v stik z uredništvom in podporo portala Portalko.";
  } else if (pathname === "/pravila-objavljanja") {
    title = "Pravila objavljanja vsebin | Portalko";
    description = "Smernice in pravila za varno objavljanje malih oglasov, dogodkov in prispevkov na portalu Portalko.";
  } else if (segments.length >= 2) {
    // Category or Post page (e.g. /dogodki/glasba-koncerti/... or /novice/slovenija)
    const section = segments[0];
    const lastSegment = segments[segments.length - 1];
    let humanTitle = lastSegment
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    if (lastSegment === "noc-carovnic-za-otroke-v-kranjski-gori") {
      humanTitle = "Noč čarovnic za otroke v Kranjski Gori";
    }

    if (segments.length >= 3 || (section !== "novice" && segments.length === 2 && !["slovenija", "svet", "gospodarstvo", "sport", "kultura", "tehnologija"].includes(segments[1]))) {
      // Looks like an individual post or deep subcategory
      title = `${humanTitle} | Portalko`;
      description = `Oglejte si podrobnosti objave ${humanTitle} na portalu Portalko.`;
      ogType = section === "dogodki" ? "event" : (section === "mali-oglasi" || section === "akcije") ? "product" : "article";
    } else {
      title = `${humanTitle} – ${section.charAt(0).toUpperCase() + section.slice(1)} | Portalko`;
    }
  }

  // Update Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
  
  // Update Meta Description
  html = html.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="description" content="${description}" />`);

  // Update Canonical
  html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

  // Update OpenGraph
  html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
  html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
  html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  html = html.replace(/<meta\s+property=["']og:type["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:type" content="${ogType}" />`);

  // Update Twitter Cards
  html = html.replace(/<meta\s+name=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
  html = html.replace(/<meta\s+name=["']twitter:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);
  html = html.replace(/<meta\s+name=["']twitter:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:url" content="${canonicalUrl}" />`);

  // Ensure Google Analytics is present in <head> if not already included
  if (!html.includes("G-DYZSLZ29C4")) {
    html = html.replace(/(<\/head>)/i, `${GA_TAG_HTML}\n$1`);
  }

  return html;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // CORS middleware for /api routes
  app.use("/api", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Sitemap endpoint (dynamic and real-time with Firestore entries)
  app.get("/sitemap.xml", async (req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    try {
      const xml = await getOrGenerateSitemap();
      return res.send(xml);
    } catch (err: any) {
      console.error("Error serving sitemap.xml:", err);
      const publicSitemap = path.join(process.cwd(), "public", "sitemap.xml");
      if (fs.existsSync(publicSitemap)) {
        return res.sendFile(publicSitemap);
      }
      return res.status(500).send("Error generating sitemap");
    }
  });

  // Robots.txt endpoint
  app.get("/robots.txt", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    const publicRobots = path.join(process.cwd(), "public", "robots.txt");
    if (fs.existsSync(publicRobots)) {
      return res.sendFile(publicRobots);
    }
    const defaultRobots = `# https://www.robotstxt.org/robotstxt.html\nUser-agent: *\nAllow: /\n\n# Sitemaps\nSitemap: ${SITE_URL}/sitemap.xml\n`;
    res.send(defaultRobots);
  });

  // Lazy-initialize Stripe client
  let stripeClient: any = null;
  async function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return null;
    }
    if (!stripeClient) {
      const Stripe = (await import("stripe")).default;
      stripeClient = new Stripe(key, { apiVersion: "2023-10-16" as any });
    }
    return stripeClient;
  }

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ==========================================
  // RESILIENT SERVER-SIDE RSS NEWS SYSTEM
  // Direct fetching, auto-redirect follow, in-memory caching & fallbacks
  // ==========================================
  interface ServerRssFeedConfig {
    id: string;
    url: string;
    name: string;
    active?: boolean;
  }

  interface ServerNewsItem {
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

  const DEFAULT_SERVER_FEEDS: ServerRssFeedConfig[] = [
    { id: 'rtvslo', url: 'https://img.rtvslo.si/feeds/00.xml', name: 'RTV Slovenija', active: true },
    { id: '24ur', url: 'https://www.24ur.com/rss', name: '24ur.com', active: true },
    { id: 'delo', url: 'https://www.delo.si/rss', name: 'Delo.si', active: true },
    { id: 'n1info', url: 'https://n1info.si/feed/', name: 'N1 Slovenija', active: true },
    { id: 'siol', url: 'https://siol.net/feeds/latest', name: 'Siol.net', active: true },
    { id: 'slovenskenovice', url: 'https://slovenskenovice.delo.si/rss', name: 'Slovenske novice', active: true },
    { id: 'maribor24', url: 'https://maribor24.si/feed/', name: 'Maribor24', active: true }
  ];

  function cleanServerHtmlText(raw: string): string {
    if (!raw) return '';
    let str = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
    str = str.replace(/<\/?[^>]+(>|$)/g, ' ');
    str = str
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
    return str;
  }

  function parseServerRssXml(xmlText: string, sourceName: string, feedId: string): ServerNewsItem[] {
    const items: ServerNewsItem[] = [];
    const itemMatches = xmlText.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) || [];

    for (let idx = 0; idx < itemMatches.length; idx++) {
      const raw = itemMatches[idx];

      // Title
      const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? cleanServerHtmlText(titleMatch[1]) : '';
      if (!title) continue;

      // Link
      let link = '';
      const linkMatch = raw.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      if (linkMatch && linkMatch[1] && linkMatch[1].trim()) {
        link = cleanServerHtmlText(linkMatch[1]);
      } else {
        const hrefMatch = raw.match(/<link[^>]+href=["']([^"']+)["']/i);
        if (hrefMatch) link = hrefMatch[1].trim();
      }
      if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) continue;

      // Description / Summary / Content
      const descMatch = raw.match(/<(description|summary|content:encoded|content)[^>]*>([\s\S]*?)<\/(description|summary|content:encoded|content)>/i);
      const rawDesc = descMatch ? descMatch[2] : '';
      const desc = cleanServerHtmlText(rawDesc);

      // PubDate
      const dateMatch = raw.match(/<(pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(pubDate|published|updated|dc:date)>/i);
      const pubDate = dateMatch ? cleanServerHtmlText(dateMatch[2]) : new Date().toISOString();

      // Category
      const catMatch = raw.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
      let category = catMatch ? cleanServerHtmlText(catMatch[1]) : 'Slovenija';
      if (!category || category === 'true') category = 'Slovenija';

      // Thumbnail
      let thumbnail = '';
      const encMatch = raw.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      if (encMatch && encMatch[1]) thumbnail = encMatch[1].trim();
      
      if (!thumbnail) {
        const mediaMatch = raw.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
        if (mediaMatch && mediaMatch[1]) thumbnail = mediaMatch[1].trim();
      }
      if (!thumbnail) {
        // Matches standard <img src="..."> as well as HTML entity encoded &lt;img src=&#34;...&#34; (used by 24ur, Delo, etc.)
        const imgMatch = raw.match(/(?:<|&lt;)img[^>]+src=(?:["']|&#34;|&quot;)(https?:\/\/[^"'\s&;]+)/i);
        if (imgMatch && imgMatch[1]) thumbnail = imgMatch[1].trim();
      }

      items.push({
        id: `rss-${feedId}-${idx}-${Buffer.from(link).toString('base64').slice(-16).replace(/[/+=]/g, '')}`,
        title,
        link,
        description: desc,
        pubDate,
        sourceName,
        thumbnail: thumbnail || undefined,
        category,
        feedId
      });
    }

    return items;
  }

  // Server-side RSS Cache keyed by requested feed configurations
  const serverRssCaches = new Map<string, { timestamp: number; items: ServerNewsItem[] }>();
  let emergencyRssFallbackItems: ServerNewsItem[] = [];
  const articleThumbnailCache = new Map<string, string>();

  async function fetchArticleOgImage(url: string, timeoutMs = 3000): Promise<string | null> {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return null;
    const cached = articleThumbnailCache.get(url);
    if (cached) return cached;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 PortalkoNews/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const html = await res.text();
      const match = html.match(/<meta[^>]+property=["\x27]og:image["\x27][^>]+content=["\x27]([^"\x27]+)["\x27]/i)
                 || html.match(/<meta[^>]+content=["\x27]([^"\x27]+)["\x27][^>]+property=["\x27]og:image["\x27]/i);
      if (match && match[1] && match[1].startsWith('http')) {
        const img = match[1].trim();
        articleThumbnailCache.set(url, img);
        return img;
      }
    } catch {
      // Ignore errors / timeouts
    }
    return null;
  }

  async function fetchRssFeedFromSource(feed: ServerRssFeedConfig, timeoutMs = 8000): Promise<ServerNewsItem[]> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(feed.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 PortalkoNews/2.0',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*;q=0.9',
          'Accept-Language': 'sl,en;q=0.9',
        },
        redirect: 'follow',
      });
      clearTimeout(timer);

      if (!response.ok) {
        console.warn(`[RSS Server] ${feed.name} returned HTTP ${response.status}`);
        return [];
      }

      const xml = await response.text();
      const parsed = parseServerRssXml(xml, feed.name, feed.id);

      // Sources like Maribor24 don't provide enclosures in their RSS feed.
      // Automatically enrich the newest items with their real featured og:image.
      if (feed.id === 'maribor24' || parsed.some(it => !it.thumbnail && it.link.includes('maribor24.si'))) {
        const enrichLimit = Math.min(parsed.length, 35);
        await Promise.allSettled(
          parsed.slice(0, enrichLimit).map(async (item) => {
            if (!item.thumbnail && item.link) {
              const ogImg = await fetchArticleOgImage(item.link);
              if (ogImg) {
                item.thumbnail = ogImg;
              }
            }
          })
        );
      }

      return parsed;
    } catch (err: any) {
      console.warn(`[RSS Server] Error fetching ${feed.name} (${feed.url}):`, err.message);
      return [];
    }
  }

  // Common handler for GET and POST /api/rss/news
  const handleRssNewsRequest = async (req: express.Request, res: express.Response) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");

    const force = req.query.force === "true" || req.body?.force === true;
    let requestedFeeds: ServerRssFeedConfig[] = DEFAULT_SERVER_FEEDS;

    if (req.body?.feeds && Array.isArray(req.body.feeds) && req.body.feeds.length > 0) {
      const validFeeds = req.body.feeds.filter((f: any) => f && f.url && f.active !== false);
      if (validFeeds.length > 0) {
        requestedFeeds = validFeeds;
      }
    }

    const now = Date.now();
    const CACHE_TTL_MS = 2.5 * 60 * 1000; // 2.5 minutes cache for real-time freshness
    const cacheKey = requestedFeeds.map(f => f.id || f.name).sort().join(",");
    const cached = serverRssCaches.get(cacheKey);

    // If cache for these exact requested feeds is fresh and not forcing refresh, return immediately
    if (!force && cached && cached.items.length > 0 && (now - cached.timestamp) < CACHE_TTL_MS) {
      return res.json({
        success: true,
        count: cached.items.length,
        items: cached.items,
        cached: true,
        fetchedAt: new Date(cached.timestamp).toISOString()
      });
    }

    try {
      const feedPromises = requestedFeeds.map(feed => fetchRssFeedFromSource(feed));
      const feedResults = await Promise.allSettled(feedPromises);

      const allItems: ServerNewsItem[] = [];
      feedResults.forEach(result => {
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
          allItems.push(...result.value);
        }
      });

      if (allItems.length > 0) {
        // Strict deduplication by normalized link & title
        const seenLinks = new Set<string>();
        const seenTitles = new Set<string>();
        const uniqueItems: ServerNewsItem[] = [];

        for (const item of allItems) {
          const normLink = item.link.toLowerCase().replace(/\/+$/, "");
          const normTitle = item.title.toLowerCase().trim();
          if (!seenLinks.has(normLink) && !seenTitles.has(normTitle)) {
            seenLinks.add(normLink);
            seenTitles.add(normTitle);
            uniqueItems.push(item);
          }
        }

        // Sort by pubDate descending
        uniqueItems.sort((a, b) => {
          const timeA = new Date(a.pubDate).getTime();
          const timeB = new Date(b.pubDate).getTime();
          if (isNaN(timeA) || isNaN(timeB)) return 0;
          return timeB - timeA;
        });

        // Update in-memory caches by cacheKey
        serverRssCaches.set(cacheKey, {
          timestamp: now,
          items: uniqueItems
        });
        emergencyRssFallbackItems = uniqueItems;

        return res.json({
          success: true,
          count: uniqueItems.length,
          items: uniqueItems,
          cached: false,
          fetchedAt: new Date(now).toISOString()
        });
      }

      // If upstream feeds returned empty or errored, return the emergency fallback items (NEVER return empty if we have good cached news!)
      if (emergencyRssFallbackItems.length > 0) {
        return res.json({
          success: true,
          count: emergencyRssFallbackItems.length,
          items: emergencyRssFallbackItems,
          cached: true,
          fallback: true,
          fetchedAt: new Date(now).toISOString()
        });
      }

      return res.json({
        success: true,
        count: 0,
        items: [],
        cached: false
      });
    } catch (err: any) {
      console.error("[RSS Server] Error in handleRssNewsRequest:", err);
      if (emergencyRssFallbackItems.length > 0) {
        return res.json({
          success: true,
          count: emergencyRssFallbackItems.length,
          items: emergencyRssFallbackItems,
          cached: true,
          fallback: true
        });
      }
      return res.status(500).json({ success: false, error: err.message, items: [] });
    }
  };

  app.get("/api/rss/news", handleRssNewsRequest);
  app.post("/api/rss/news", handleRssNewsRequest);

  // Background pre-warming and automatic periodic cache refresher for production
  async function warmServerRssCache(): Promise<void> {
    try {
      const feedPromises = DEFAULT_SERVER_FEEDS.map(feed => fetchRssFeedFromSource(feed, 6000));
      const feedResults = await Promise.allSettled(feedPromises);

      const allItems: ServerNewsItem[] = [];
      feedResults.forEach(result => {
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
          allItems.push(...result.value);
        }
      });

      if (allItems.length > 0) {
        const seenLinks = new Set<string>();
        const seenTitles = new Set<string>();
        const uniqueItems: ServerNewsItem[] = [];

        for (const item of allItems) {
          const normLink = item.link.toLowerCase().replace(/\/+$/, "");
          const normTitle = item.title.toLowerCase().trim();
          if (!seenLinks.has(normLink) && !seenTitles.has(normTitle)) {
            seenLinks.add(normLink);
            seenTitles.add(normTitle);
            uniqueItems.push(item);
          }
        }

        uniqueItems.sort((a, b) => {
          const timeA = new Date(a.pubDate).getTime();
          const timeB = new Date(b.pubDate).getTime();
          if (isNaN(timeA) || isNaN(timeB)) return 0;
          return timeB - timeA;
        });

        const defaultKey = DEFAULT_SERVER_FEEDS.map(f => f.id || f.name).sort().join(",");
        serverRssCaches.set(defaultKey, {
          timestamp: Date.now(),
          items: uniqueItems
        });
        emergencyRssFallbackItems = uniqueItems;
      }
    } catch (err: any) {
      console.warn("[RSS Server] Error warming RSS cache:", err.message);
    }
  }

  // Pre-warm on startup so first production request gets instant response
  warmServerRssCache().catch(() => {});
  // Periodically refresh RSS cache in background every 2.5 minutes
  setInterval(() => {
    warmServerRssCache().catch(() => {});
  }, 2.5 * 60 * 1000);

  // General-purpose XML RSS Proxy with CORS & redirect support
  app.get("/api/rss/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      return res.status(400).send("Parameter 'url' is required and must start with http:// or https://");
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const upstream = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 PortalkoNews/2.0",
          "Accept": "application/rss+xml, application/xml, text/xml, */*;q=0.8"
        },
        redirect: "follow"
      });
      clearTimeout(timer);

      if (!upstream.ok) {
        return res.status(upstream.status).send(`Upstream returned HTTP ${upstream.status}`);
      }

      const xml = await upstream.text();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=180");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(xml);
    } catch (err: any) {
      console.warn("[RSS Proxy] Error proxying:", targetUrl, err.message);
      return res.status(502).send("Could not reach upstream RSS feed: " + err.message);
    }
  });

  // Extract article featured image endpoint (for sources like Maribor24)
  app.get(["/api/rss/image", "/api/rss/article-image"], async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      return res.status(400).json({ error: "Parameter 'url' is required and must start with http:// or https://" });
    }
    const img = await fetchArticleOgImage(targetUrl);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.json({ url: targetUrl, image: img });
  });

  // Background proactive warmup of RSS feeds
  setTimeout(() => {
    handleRssNewsRequest({ query: {}, body: {} } as any, {
      setHeader: () => {},
      json: () => {}
    } as any).catch(() => {});
  }, 1000);

  // Stripe config status check
  app.get("/api/stripe/config", (req, res) => {
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "";
    const hasSecretKey = Boolean(process.env.STRIPE_SECRET_KEY);
    res.json({
      configured: hasSecretKey,
      publishableKey,
    });
  });

  // Create Stripe Checkout Session or Payment Intent for post promotion
  app.post("/api/stripe/create-payment-intent", async (req, res) => {
    try {
      const {
        amountEur,
        itemId,
        itemType,
        itemTitle,
        planId,
        badgeType,
        targetSection,
        userEmail,
        userId,
      } = req.body;

      if (!amountEur || amountEur <= 0) {
        return res.status(400).json({ error: "Neveljaven znesek plačila." });
      }

      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        const simulatedPaymentIntentId = `pi_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        return res.json({
          simulated: true,
          clientSecret: `${simulatedPaymentIntentId}_secret_simulated`,
          paymentIntentId: simulatedPaymentIntentId,
          amountEur,
          currency: "eur",
          message: "Stripe testna simulacija (STRIPE_SECRET_KEY ni nastavljen v .env).",
        });
      }

      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(key, { apiVersion: "2023-10-16" as any });
      const amountCents = Math.round(Number(amountEur) * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "eur",
        automatic_payment_methods: { enabled: true },
        description: `Izpostavitev (${badgeType || "PROMO"}) za: ${itemTitle || itemId}`,
        receipt_email: userEmail || undefined,
        metadata: {
          itemId: String(itemId || ""),
          itemType: String(itemType || ""),
          itemTitle: String((itemTitle || "").substring(0, 100)),
          planId: String(planId || ""),
          badgeType: String(badgeType || "PROMO"),
          targetSection: String(targetSection || "all"),
          userId: String(userId || ""),
        },
      });

      res.json({
        simulated: false,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amountEur,
        currency: "eur",
      });
    } catch (err: any) {
      console.error("Stripe error creating payment intent:", err);
      res.status(500).json({
        error: err.message || "Prišlo je do napake pri vzpostavitvi Stripe plačila.",
      });
    }
  });

  // Verify payment status
  app.post("/api/stripe/verify-payment", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Manjka paymentIntentId." });
      }

      if (paymentIntentId.startsWith("pi_sim_")) {
        return res.json({
          status: "succeeded",
          paid: true,
          simulated: true,
        });
      }

      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        return res.status(500).json({ error: "STRIPE_SECRET_KEY ni nastavljen." });
      }

      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(key, { apiVersion: "2023-10-16" as any });
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const isPaid = paymentIntent.status === "succeeded";

      res.json({
        status: paymentIntent.status,
        paid: isPaid,
        amountReceived: paymentIntent.amount_received ? paymentIntent.amount_received / 100 : 0,
        currency: paymentIntent.currency,
      });
    } catch (err: any) {
      console.error("Stripe verification error:", err);
      res.status(500).json({
        error: err.message || "Napaka pri preverjanju plačila.",
      });
    }
  });

  interface ServerEmailDeliveryRecord {
    id: string;
    recipientEmail: string;
    recipientName: string;
    subject: string;
    type: 'registration_confirmation' | 'password_reset';
    status: 'poslana' | 'dostavljena' | 'zavrnjena';
    provider: string;
    messageId?: string;
    errorReason?: string;
    sentAt: string;
    confirmationUrl?: string;
    token?: string;
  }

  const serverEmailDeliveryLogs: ServerEmailDeliveryRecord[] = [];

  function recordServerEmailLog(entry: ServerEmailDeliveryRecord) {
    serverEmailDeliveryLogs.unshift(entry);
    if (serverEmailDeliveryLogs.length > 50) {
      serverEmailDeliveryLogs.pop();
    }
  }

  // Noreply Email Verification Dispatch Endpoint (supports both routes)
  app.post(["/api/auth/send-verification-email", "/api/send-verification-email"], async (req, res) => {
    try {
      const { name, email, token, confirmationUrl } = req.body;
      if (!email || !token || !confirmationUrl) {
        return res.status(400).json({ error: "Manjkajo obvezni podatki (email, token ali confirmationUrl)." });
      }

      const safeName = (name || "").trim() || "Uporabnik";
      const noreplyFrom = `"${process.env.NOREPLY_NAME || "Portalko.net"}" <${process.env.NOREPLY_EMAIL || "noreply@portalko.net"}>`;

      const emailHtml = `<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8">
  <title>Potrdite svoj račun na Portalko.net</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;text-align:center;color:#ffffff;">
        <h1 style="margin:0 0 4px 0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Portalko.net</h1>
        <p style="margin:0;font-size:13px;opacity:0.9;">Slovenski portal za novice, male oglase in dogodke</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#0f172a;">Pozdravljeni, ${safeName}!</h2>
        <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">
          Hvala za registracijo na portalu <strong>Portalko.net</strong>. Za dokončanje registracije in aktivacijo vašega uporabniškega računa potrdite svoj e-poštni naslov s klikom na spodnji gumb:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${confirmationUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;box-shadow:0 4px 12px rgba(124,58,237,0.3);">
            Potrdi moj račun
          </a>
        </div>
        <p style="margin:24px 0 8px 0;font-size:13px;color:#64748b;">
          Če gumb zgoraj ne deluje, kopirajte naslednjo povezavo neposredno v vaš spletni brskalnik:
        </p>
        <div style="background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;word-break:break-all;color:#64748b;">
          <a href="${confirmationUrl}" style="color:#7c3aed;text-decoration:underline;">${confirmationUrl}</a>
        </div>
        <p style="margin:24px 0 0 0;font-size:13px;color:#64748b;">
          Povezava je veljavna 24 ur. Po potrditvi se boste lahko takoj prijavili in v polnosti uporabljali vse funkcionalnosti portala.
        </p>
      </td>
    </tr>
    <tr>
      <td style="border-top:1px solid #f1f5f9;background-color:#fafafa;padding:20px 28px;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
        <span style="display:inline-block;background-color:#e2e8f0;color:#475569;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;margin-bottom:8px;">Samodejno sporočilo • Ne odgovarjajte</span>
        <p style="margin:4px 0;">
          To sporočilo je bilo samodejno poslano iz naslova <strong>noreply@portalko.net</strong>. Če se niste registrirali na Portalko.net, lahko to sporočilo mirno prezrete.
        </p>
        <p style="margin:8px 0 0 0;">
          &copy; ${new Date().getFullYear()} Portalko.net. Vse pravice pridržane.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const plainText = `Pozdravljeni, ${safeName}!\n\nHvala za registracijo na Portalko.net.\nZa dokončanje registracije in potrditev vašega računa kliknite na povezavo:\n${confirmationUrl}\n\nPovezava je veljavna 24 ur.\nTo sporočilo je bilo samodejno poslano iz naslova ${process.env.NOREPLY_EMAIL || "noreply@portalko.net"}.`;

      // 1. PRIMARY: Resend API (https://resend.com - modern REST API HTTPS, reliable inbox delivery)
      const resendKey = (process.env.RESEND_API_KEY || "").trim();
      const resendSenderEmail = (process.env.RESEND_SENDER_EMAIL || process.env.NOREPLY_EMAIL || "noreply@portalko.net").trim();
      const resendSenderName = (process.env.RESEND_SENDER_NAME || process.env.NOREPLY_NAME || "Portalko.net").trim();
      const resendFrom = resendSenderEmail.includes("@") && !resendSenderEmail.endsWith("resend.dev")
        ? `${resendSenderName} <${resendSenderEmail}>`
        : (resendSenderEmail || "Portalko.net <onboarding@resend.dev>");

      if (resendKey) {
        try {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: resendFrom,
              to: [email.trim()],
              subject: "Potrdite svoj račun na Portalko.net",
              html: emailHtml,
              text: plainText,
            }),
          });

          if (resendResponse.ok) {
            const resendData = await resendResponse.json().catch(() => ({}));
            const msgId = resendData.id || `resend_${Date.now()}`;
            console.log(`[NOREPLY EMAIL RESEND SENT] Confirmation sent to ${email}, id: ${msgId}`);
            recordServerEmailLog({
              id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              recipientEmail: email,
              recipientName: safeName,
              subject: "Potrdite svoj račun na Portalko.net",
              type: "registration_confirmation",
              status: "dostavljena",
              provider: "resend",
              messageId: msgId,
              sentAt: new Date().toISOString(),
              confirmationUrl,
              token,
            });
            return res.json({
              success: true,
              sent: true,
              provider: "resend",
              messageId: msgId,
              confirmationUrl,
              message: "Potrditveno sporočilo iz noreply@portalko.net je bilo uspešno poslano prek Resend API.",
            });
          } else {
            let resendError = "";
            try {
              const errJson = await resendResponse.json();
              resendError = errJson.message || errJson.error || JSON.stringify(errJson);
            } catch {
              resendError = await resendResponse.text();
            }
            console.warn(`[NOREPLY EMAIL RESEND FAILED ${resendResponse.status}]:`, resendError);
            recordServerEmailLog({
              id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              recipientEmail: email,
              recipientName: safeName,
              subject: "Potrdite svoj račun na Portalko.net",
              type: "registration_confirmation",
              status: "zavrnjena",
              provider: "resend",
              errorReason: `Resend API klic zavrnjen (HTTP ${resendResponse.status}): ${resendError}`,
              sentAt: new Date().toISOString(),
              confirmationUrl,
              token,
            });
          }
        } catch (resendErr: any) {
          console.warn("[NOREPLY EMAIL RESEND EXCEPTION]:", resendErr.message);
          recordServerEmailLog({
            id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            recipientEmail: email,
            recipientName: safeName,
            subject: "Potrdite svoj račun na Portalko.net",
            type: "registration_confirmation",
            status: "zavrnjena",
            provider: "resend",
            errorReason: `Napaka pri povezavi z Resend API: ${resendErr.message}`,
            sentAt: new Date().toISOString(),
            confirmationUrl,
            token,
          });
        }
      }

      // 2. Fallback: Brevo API (https://api.brevo.com/v3/smtp/email)
      const brevoKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || "").trim();
      const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.NOREPLY_EMAIL || "noreply@portalko.net").trim();
      const brevoSenderName = (process.env.BREVO_SENDER_NAME || process.env.NOREPLY_NAME || "Portalko.net").trim();

      if (brevoKey) {
        try {
          const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoKey,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              sender: { name: brevoSenderName, email: brevoSenderEmail },
              to: [{ email: email.trim(), name: safeName }],
              subject: "Potrdite svoj račun na Portalko.net",
              htmlContent: emailHtml,
              textContent: plainText,
            }),
          });

          if (brevoResponse.ok) {
            const brevoData = await brevoResponse.json().catch(() => ({}));
            const msgId = brevoData.messageId || `brevo_${Date.now()}`;
            console.log(`[NOREPLY EMAIL BREVO SENT] Confirmation sent to ${email}, id: ${msgId}`);
            recordServerEmailLog({
              id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              recipientEmail: email,
              recipientName: safeName,
              subject: "Potrdite svoj račun na Portalko.net",
              type: "registration_confirmation",
              status: "dostavljena",
              provider: "brevo",
              messageId: msgId,
              sentAt: new Date().toISOString(),
              confirmationUrl,
              token,
            });
            return res.json({
              success: true,
              sent: true,
              provider: "brevo",
              messageId: msgId,
              confirmationUrl,
              message: "Potrditveno sporočilo iz noreply@portalko.net je bilo uspešno poslano prek Brevo API.",
            });
          } else {
            let brevoError = "";
            try {
              const errJson = await brevoResponse.json();
              brevoError = errJson.message || errJson.code || JSON.stringify(errJson);
            } catch {
              brevoError = await brevoResponse.text();
            }
            console.warn(`[NOREPLY EMAIL BREVO FAILED ${brevoResponse.status}]:`, brevoError);
            recordServerEmailLog({
              id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              recipientEmail: email,
              recipientName: safeName,
              subject: "Potrdite svoj račun na Portalko.net",
              type: "registration_confirmation",
              status: "zavrnjena",
              provider: "brevo",
              errorReason: `Brevo API klic zavrnjen (HTTP ${brevoResponse.status}): ${brevoError}`,
              sentAt: new Date().toISOString(),
              confirmationUrl,
              token,
            });
          }
        } catch (brevoErr: any) {
          console.warn("[NOREPLY EMAIL BREVO EXCEPTION]:", brevoErr.message);
          recordServerEmailLog({
            id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            recipientEmail: email,
            recipientName: safeName,
            subject: "Potrdite svoj račun na Portalko.net",
            type: "registration_confirmation",
            status: "zavrnjena",
            provider: "brevo",
            errorReason: `Napaka pri povezavi z Brevo API: ${brevoErr.message}`,
            sentAt: new Date().toISOString(),
            confirmationUrl,
            token,
          });
        }
      }

      // 3. Check if SendGrid API is configured
      if (process.env.SENDGRID_API_KEY) {
        try {
          const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email }] }],
              from: { email: process.env.NOREPLY_EMAIL || "noreply@portalko.net", name: process.env.NOREPLY_NAME || "Portalko.net" },
              subject: "Potrdite svoj račun na Portalko.net",
              content: [
                { type: "text/plain", value: plainText },
                { type: "text/html", value: emailHtml },
              ],
            }),
          });

          if (sgResponse.ok) {
            console.log(`[NOREPLY EMAIL SENDGRID SENT] Confirmation sent to ${email}`);
            recordServerEmailLog({
              id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              recipientEmail: email,
              recipientName: safeName,
              subject: "Potrdite svoj račun na Portalko.net",
              type: "registration_confirmation",
              status: "dostavljena",
              provider: "sendgrid",
              sentAt: new Date().toISOString(),
              confirmationUrl,
              token,
            });
            return res.json({
              success: true,
              sent: true,
              provider: "sendgrid",
              confirmationUrl,
              message: "Potrditveno sporočilo iz noreply@portalko.net je bilo uspešno poslano.",
            });
          }
        } catch (sgErr: any) {
          console.warn("[NOREPLY EMAIL SENDGRID EXCEPTION]:", sgErr.message);
        }
      }

      // 4. Check if SMTP is configured
      if (process.env.SMTP_HOST) {
        try {
          const { default: nodemailer } = await import("nodemailer");
          const port = Number(process.env.SMTP_PORT || 587);
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465,
            auth: process.env.SMTP_USER ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            } : undefined,
            tls: {
              rejectUnauthorized: false,
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000,
          });

          const info = await transporter.sendMail({
            from: noreplyFrom,
            to: email,
            subject: "Potrdite svoj račun na Portalko.net",
            html: emailHtml,
            text: plainText,
          });

          console.log(`[NOREPLY EMAIL SENT] Confirmation sent to ${email}, messageId: ${info.messageId}`);
          recordServerEmailLog({
            id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            recipientEmail: email,
            recipientName: safeName,
            subject: "Potrdite svoj račun na Portalko.net",
            type: "registration_confirmation",
            status: "dostavljena",
            provider: "smtp",
            messageId: info.messageId,
            sentAt: new Date().toISOString(),
            confirmationUrl,
            token,
          });
          return res.json({
            success: true,
            sent: true,
            provider: "smtp",
            messageId: info.messageId,
            confirmationUrl,
            message: "Potrditveno sporočilo iz noreply@portalko.net je bilo uspešno poslano.",
          });
        } catch (mailErr: any) {
          console.log("[NOREPLY EMAIL SMTP NOTICE - SMTP unavailable, falling back to simulated dispatch]:", mailErr.message);
          recordServerEmailLog({
            id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            recipientEmail: email,
            recipientName: safeName,
            subject: "Potrdite svoj račun na Portalko.net",
            type: "registration_confirmation",
            status: "zavrnjena",
            provider: "smtp",
            errorReason: `SMTP strežnik je zavrnil povezavo ali pa je potekla časovna omejitev (${mailErr.message || 'Napaka'}).`,
            sentAt: new Date().toISOString(),
            confirmationUrl,
            token,
          });
        }
      }

      // If SMTP is not configured or in dev/preview environment
      console.log(`[NOREPLY EMAIL READY] From: ${noreplyFrom} To: ${email} Confirmation link: ${confirmationUrl}`);
      recordServerEmailLog({
        id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recipientEmail: email,
        recipientName: safeName,
        subject: "Potrdite svoj račun na Portalko.net",
        type: "registration_confirmation",
        status: "zavrnjena",
        provider: "brez_ponudnika",
        errorReason: "V strežniškem okolju ni nastavljen RESEND_API_KEY, BREVO_API_KEY ali SMTP_HOST. Pošta ni mogla biti oddana v poštni predal.",
        sentAt: new Date().toISOString(),
        confirmationUrl,
        token,
      });

      return res.json({
        success: true,
        sent: false,
        simulated: true,
        smtpBlocked: true,
        messageId: `sim_${Date.now()}`,
        confirmationUrl,
        message: "Potrditveno sporočilo je pripravljeno. Za samodejno dostavo v poštni predal konfigurirajte RESEND_API_KEY.",
      });
    } catch (err: any) {
      console.error("Napaka pri pošiljanju potrditvene e-pošte:", err);
      res.status(500).json({ error: err.message || "Napaka pri obdelavi potrditvenega sporočila." });
    }
  });

  // Admin endpoint: Get delivery status of confirmation emails
  app.get("/api/admin/email-delivery-logs", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const configured = {
      resend: Boolean(process.env.RESEND_API_KEY),
      resendSender: (process.env.RESEND_SENDER_EMAIL || process.env.NOREPLY_EMAIL || "noreply@portalko.net").trim(),
      brevo: Boolean(process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY),
      sendgrid: Boolean(process.env.SENDGRID_API_KEY),
      smtp: Boolean(process.env.SMTP_HOST),
      activeProvider: (process.env.RESEND_API_KEY ? "Resend API" :
                       (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY) ? "Brevo API" :
                       process.env.SENDGRID_API_KEY ? "SendGrid API" :
                       process.env.SMTP_HOST ? "SMTP" : "Ni nastavljen (Simulacija / Ročna aktivacija)")
    };

    return res.json({
      success: true,
      count: serverEmailDeliveryLogs.length,
      logs: serverEmailDeliveryLogs.slice(0, limit),
      configured,
    });
  });

  // Admin endpoint: Test Resend API dispatch
  app.post(["/api/admin/test-resend", "/api/admin/test-brevo", "/api/admin/test-email"], async (req, res) => {
    try {
      const { testEmail } = req.body || {};
      const targetEmail = (testEmail || "zoran.krstin@gmail.com").trim();
      const resendKey = (process.env.RESEND_API_KEY || "").trim();

      const resendSenderEmail = (process.env.RESEND_SENDER_EMAIL || process.env.NOREPLY_EMAIL || "noreply@portalko.net").trim();
      const resendSenderName = (process.env.RESEND_SENDER_NAME || process.env.NOREPLY_NAME || "Portalko.net").trim();
      const resendFrom = resendSenderEmail.includes("@") && !resendSenderEmail.endsWith("resend.dev")
        ? `${resendSenderName} <${resendSenderEmail}>`
        : (resendSenderEmail || "Portalko.net <onboarding@resend.dev>");

      const testConfirmationUrl = `https://portalko.net/?verify-email=test_resend_${Date.now()}&email=${encodeURIComponent(targetEmail)}`;

      if (resendKey) {
        const testHtml = `<!DOCTYPE html>
<html lang="sl">
<head><meta charset="UTF-8"><title>Resend Testno Sporočilo</title></head>
<body style="font-family:sans-serif;padding:24px;background:#f8fafc;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
    <h2 style="color:#0ea5e9;margin-top:0;">Resend API Testno sporočilo – Portalko.net</h2>
    <p>To je potrditev, da je <strong>Resend API</strong> uspešno povezan in pripravljen za pošiljanje potrditvenih e-pošt ob registracijah uporabnikov.</p>
    <div style="background:#f1f5f9;padding:12px;border-radius:8px;font-size:13px;margin:20px 0;">
      <strong>Pošiljatelj:</strong> ${resendFrom}<br/>
      <strong>Prejemnik:</strong> ${targetEmail}<br/>
      <strong>Čas:</strong> ${new Date().toLocaleString("sl-SI")}
    </div>
    <p style="text-align:center;"><a href="${testConfirmationUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Preizkus potrditvene povezave</a></p>
  </div>
</body>
</html>`;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [targetEmail],
            subject: "Resend API Preizkus – Potrditvena e-pošta Portalko.net",
            html: testHtml,
            text: `Resend API Preizkus za Portalko.net. Povezava: ${testConfirmationUrl}`,
          }),
        });

        if (resendResponse.ok) {
          const resendData = await resendResponse.json().catch(() => ({}));
          const msgId = resendData.id || `resend_test_${Date.now()}`;
          recordServerEmailLog({
            id: `eml_${Date.now()}_test`,
            recipientEmail: targetEmail,
            recipientName: "Administrator (Test Resend)",
            subject: "Resend API Preizkus – Potrditvena e-pošta Portalko.net",
            type: "registration_confirmation",
            status: "dostavljena",
            provider: "resend",
            messageId: msgId,
            sentAt: new Date().toISOString(),
            confirmationUrl: testConfirmationUrl,
          });

          return res.json({
            success: true,
            message: `Testno e-poštno sporočilo je bilo uspešno poslano prek Resend API na ${targetEmail}!`,
            messageId: msgId,
            provider: "resend",
            sender: resendFrom,
          });
        } else {
          let resendError = "";
          try {
            const errJson = await resendResponse.json();
            resendError = errJson.message || errJson.error || JSON.stringify(errJson);
          } catch {
            resendError = await resendResponse.text();
          }

          recordServerEmailLog({
            id: `eml_${Date.now()}_test_err`,
            recipientEmail: targetEmail,
            recipientName: "Administrator (Test Resend)",
            subject: "Resend API Preizkus – Napaka",
            type: "registration_confirmation",
            status: "zavrnjena",
            provider: "resend",
            errorReason: `Resend API (HTTP ${resendResponse.status}): ${resendError}`,
            sentAt: new Date().toISOString(),
            confirmationUrl: testConfirmationUrl,
          });

          let hint = "Preverite, ali je vaš RESEND_API_KEY pravilen in ali je vaša domena potrjena na https://resend.com/domains.";
          if (resendError.includes("validation_error") || resendError.includes("domain") || resendError.includes("from")) {
            hint = "Če domena portalko.net še ni potrjena v Resend, lahko za testiranje uporabite pošiljatelja 'onboarding@resend.dev' v .env datoteki (RESEND_SENDER_EMAIL=\"onboarding@resend.dev\").";
          }

          return res.status(400).json({
            success: false,
            error: `Resend API klic ni uspel (HTTP ${resendResponse.status}): ${resendError}`,
            code: resendResponse.status,
            hint,
          });
        }
      }

      // Check Brevo fallback
      const brevoKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || "").trim();
      if (brevoKey) {
        const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.NOREPLY_EMAIL || "noreply@portalko.net").trim();
        const brevoSenderName = (process.env.BREVO_SENDER_NAME || process.env.NOREPLY_NAME || "Portalko.net").trim();

        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: brevoSenderName, email: brevoSenderEmail },
            to: [{ email: targetEmail, name: "Administrator" }],
            subject: "Brevo API Preizkus – Potrditvena e-pošta Portalko.net",
            htmlContent: `<p>Brevo testno sporočilo</p>`,
            textContent: `Brevo test`,
          }),
        });

        if (brevoResponse.ok) {
          const brevoData = await brevoResponse.json().catch(() => ({}));
          return res.json({
            success: true,
            message: `Testno e-poštno sporočilo je bilo poslano prek Brevo API fallbacka na ${targetEmail}!`,
            messageId: brevoData.messageId,
            provider: "brevo",
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: "RESEND_API_KEY ni nastavljen v okoljskih spremenljivkah (.env). Za pošiljanje prek Resend API dodajte RESEND_API_KEY.",
        configured: false,
        hint: "Brezplačni ključ lahko pridobite na https://resend.com/api-keys in ga vnesete v .env datoteko pod RESEND_API_KEY=re_...",
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Izjema pri pošiljanju testne e-pošte: ${err.message}`,
      });
    }
  });

  // Noreply Password Reset Email Dispatch Endpoint
  app.post(["/api/auth/send-password-reset-email", "/api/send-password-reset-email"], async (req, res) => {
    try {
      const { name, email, token, resetUrl } = req.body;
      if (!email || !token || !resetUrl) {
        return res.status(400).json({ error: "Manjkajo obvezni podatki (email, token ali resetUrl)." });
      }

      const safeName = (name || "").trim() || "Uporabnik";
      const noreplyFrom = `"${process.env.NOREPLY_NAME || "Portalko.net"}" <${process.env.NOREPLY_EMAIL || "noreply@portalko.net"}>`;

      const emailHtml = `<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8">
  <title>Ponastavitev vašega gesla na Portalko.net</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;text-align:center;color:#ffffff;">
        <h1 style="margin:0 0 4px 0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Portalko.net</h1>
        <p style="margin:0;font-size:13px;opacity:0.9;">Slovenski portal za novice, male oglase in dogodke</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#0f172a;">Pozdravljeni, ${safeName}!</h2>
        <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">
          Prejeli smo zahtevek za ponastavitev gesla vašega uporabniškega računa na portalu <strong>Portalko.net</strong>. Za nastavitev novega gesla kliknite na spodnji gumb:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;box-shadow:0 4px 12px rgba(124,58,237,0.3);">
            Ponastavi moje geslo
          </a>
        </div>
        <p style="margin:24px 0 8px 0;font-size:13px;color:#64748b;">
          Če gumb zgoraj ne deluje, kopirajte naslednjo povezavo neposredno v vaš spletni brskalnik:
        </p>
        <div style="background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;word-break:break-all;color:#64748b;">
          <a href="${resetUrl}" style="color:#7c3aed;text-decoration:underline;">${resetUrl}</a>
        </div>
        <p style="margin:24px 0 0 0;font-size:13px;color:#64748b;">
          Povezava je veljavna 24 ur. Če tega zahtevka niste oddali vi, lahko to sporočilo mirno prezrete &ndash; vaše geslo ostaja nespremenjeno.
        </p>
      </td>
    </tr>
    <tr>
      <td style="border-top:1px solid #f1f5f9;background-color:#fafafa;padding:20px 28px;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
        <span style="display:inline-block;background-color:#e2e8f0;color:#475569;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;margin-bottom:8px;">Samodejno sporočilo • Ne odgovarjajte</span>
        <p style="margin:4px 0;">
          To sporočilo je bilo samodejno poslano iz naslova <strong>noreply@portalko.net</strong>.
        </p>
        <p style="margin:8px 0 0 0;">
          &copy; ${new Date().getFullYear()} Portalko.net. Vse pravice pridržane.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const plainText = `Pozdravljeni, ${safeName}!\n\nPrejeli smo zahtevek za ponastavitev gesla na Portalko.net.\nZa nastavitev novega gesla kliknite na povezavo:\n${resetUrl}\n\nPovezava je veljavna 24 ur.\nČe zahtevka niste oddali vi, lahko to sporočilo prezrete.`;

      // 1. PRIMARY: Resend API
      const resendKey = (process.env.RESEND_API_KEY || "").trim();
      const resendSenderEmail = (process.env.RESEND_SENDER_EMAIL || process.env.NOREPLY_EMAIL || "noreply@portalko.net").trim();
      const resendSenderName = (process.env.RESEND_SENDER_NAME || process.env.NOREPLY_NAME || "Portalko.net").trim();
      const resendFrom = resendSenderEmail.includes("@") && !resendSenderEmail.endsWith("resend.dev")
        ? `${resendSenderName} <${resendSenderEmail}>`
        : (resendSenderEmail || "Portalko.net <onboarding@resend.dev>");

      if (resendKey) {
        try {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: resendFrom,
              to: [email.trim()],
              subject: "Ponastavitev vašega gesla na Portalko.net",
              html: emailHtml,
              text: plainText,
            }),
          });
          if (resendResponse.ok) {
            const resendData = await resendResponse.json().catch(() => ({}));
            return res.json({
              success: true,
              sent: true,
              provider: "resend",
              messageId: resendData.id,
              resetUrl,
              message: "Navodila za ponastavitev gesla so bila uspešno poslana na vaš e-poštni naslov prek Resend API.",
            });
          }
        } catch (resendErr: any) {
          console.warn("[PASSWORD RESET RESEND EXCEPTION]:", resendErr.message);
        }
      }

      // 2. Fallback: Brevo API
      const brevoKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || "").trim();
      const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.NOREPLY_EMAIL || "noreply@portalko.net").trim();
      const brevoSenderName = (process.env.BREVO_SENDER_NAME || process.env.NOREPLY_NAME || "Portalko.net").trim();

      if (brevoKey) {
        try {
          const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoKey,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              sender: { name: brevoSenderName, email: brevoSenderEmail },
              to: [{ email, name: safeName }],
              subject: "Ponastavitev vašega gesla na Portalko.net",
              htmlContent: emailHtml,
              textContent: plainText,
            }),
          });
          if (brevoResponse.ok) {
            const brevoData = await brevoResponse.json().catch(() => ({}));
            return res.json({
              success: true,
              sent: true,
              provider: "brevo",
              messageId: brevoData.messageId,
              resetUrl,
              message: "Navodila za ponastavitev gesla so bila uspešno poslana na vaš e-poštni naslov prek Brevo API.",
            });
          }
        } catch (brevoErr: any) {
          console.warn("[PASSWORD RESET BREVO ERROR]:", brevoErr.message);
        }
      }

      // 3. Nodemailer SMTP if configured
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        try {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 465),
            secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT || 465) === 465,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
            },
            tls: { rejectUnauthorized: false },
          });

          const info = await transporter.sendMail({
            from: noreplyFrom,
            to: email,
            subject: "Ponastavitev vašega gesla na Portalko.net",
            html: emailHtml,
            text: plainText,
          });

          return res.json({
            success: true,
            sent: true,
            provider: "smtp",
            messageId: info.messageId,
            resetUrl,
            message: "Navodila za ponastavitev gesla so bila uspešno poslana na vaš e-poštni naslov.",
          });
        } catch (mailErr: any) {
          console.log("[PASSWORD RESET SMTP NOTICE]:", mailErr.message);
        }
      }

      // Simulated fallback for local dev / unconfigured host
      console.log(`[PASSWORD RESET READY] To: ${email} Reset URL: ${resetUrl}`);
      return res.json({
        success: true,
        sent: false,
        simulated: true,
        smtpBlocked: true,
        messageId: `sim_reset_${Date.now()}`,
        resetUrl,
        message: "Povezava za ponastavitev gesla je pripravljena.",
      });
    } catch (err: any) {
      console.error("Napaka pri pošiljanju ponastavitve gesla:", err);
      res.status(500).json({ error: err.message || "Napaka pri obdelavi ponastavitve gesla." });
    }
  });

  // Page serving & Vite middleware
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    _currentFilename.endsWith("server.cjs") || 
    _currentFilename.includes("/dist/") ||
    !fs.existsSync(path.resolve(process.cwd(), "src", "main.tsx"));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "custom",
    });

    app.use(vite.middlewares);

    // Serve HTML with Google Analytics and SEO tags for all page routes
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      const pathname = req.path;

      // Skip API and Vite internal paths
      if (url.startsWith("/api") || url.startsWith("/@") || url.startsWith("/src")) {
        return next();
      }

      // Only skip actual static file assets with file extensions (e.g. .js, .css, .png, etc.)
      if (/\.(js|css|png|jpe?g|gif|svg|ico|json|woff2?|ttf|eot|webp|avif|map|xml|txt)$/i.test(pathname)) {
        return next();
      }

      try {
        const indexHtmlPath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(indexHtmlPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const html = preparePageHtml(template, url);
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Robust resolution of dist folder across different execution environments
    const candidateDirs = [
      path.join(process.cwd(), "dist"),
      _currentDirname,
      path.resolve(_currentDirname, "dist"),
      path.resolve(_currentDirname, ".."),
      process.cwd(),
    ];
    const resolvedDistPath = candidateDirs.find(d => fs.existsSync(path.join(d, "index.html"))) || path.join(process.cwd(), "dist");
    const distIndexPath = path.join(resolvedDistPath, "index.html");

    // Serve static assets from dist
    app.use(express.static(resolvedDistPath));

    // Fallback for all SPA page routes - handles browser refreshes in production
    app.get("*", (req, res) => {
      // Don't intercept API requests
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint ni bil najden." });
      }

      // Check if dist/index.html exists
      if (fs.existsSync(distIndexPath)) {
        try {
          const template = fs.readFileSync(distIndexPath, "utf-8");
          const html = preparePageHtml(template, req.originalUrl);
          return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
        } catch (err) {
          return res.sendFile(distIndexPath);
        }
      }

      // Fallback if index.html is located elsewhere
      const fallbackIndexPath = path.join(process.cwd(), "index.html");
      if (fs.existsSync(fallbackIndexPath)) {
        return res.sendFile(fallbackIndexPath);
      }

      return res.status(404).send("Page not found");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
