import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  SITE_URL,
} from "./src/utils/sitemapGenerator";
import {
  createPeriodicSitemapManager,
  CrawledFirestoreDoc,
  SitemapCollectionName,
} from "./src/services/sitemapCrawlerService";
import {
  formatFirestoreDocToRssItem,
  generateSiteRssXml,
  SiteRssFeedType,
  SiteRssItem,
} from "./src/utils/rssFeedGenerator";
import {
  OgCollectionName as ServiceOgCollectionName,
  ResolvedOgMetadata,
  isSocialPreviewCrawler,
  extractFirstDataImageUri,
  resolveBestOgImageUrl,
  resolveOgMetadataFromLookup,
  injectOgTagsIntoSpaHtml,
  buildPreRenderedCrawlerHtml,
} from "./src/services/ogMetaGeneratorService";
import { isMaliciousSecurityPath, verifyIncomingRequestSecurity } from "./src/utils/securityGuard";
import { fetchExternalEmbedMetadata } from "./src/services/externalEmbedFetcher";

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

// Shared Firebase / Firestore singleton for server-side sitemap & dynamic RSS feed
let cachedServerFirestoreDb: any = null;

async function getServerFirestoreDb(): Promise<any | null> {
  if (cachedServerFirestoreDb) return cachedServerFirestoreDb;
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) return null;

  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const { initializeApp, getApps, getApp } = await import("firebase/app");
  const { getFirestore } = await import("firebase/firestore");
  const app = getApps().length > 0 ? getApp() : initializeApp(cfg);
  cachedServerFirestoreDb = getFirestore(app, cfg.firestoreDatabaseId);
  return cachedServerFirestoreDb;
}

// Real-time published posts cache & generated RSS XML cache for external news aggregators
type OgCollectionName = "posts" | "ads" | "events" | "directory";
interface CachedServerDoc {
  id: string;
  data: any;
}

let realtimeSitePostDocs: CachedServerDoc[] = [];
let hasRealtimePostsSnapshot = false;
let isRealtimePostsListenerActive = false;

const collectionDocsCache: Record<Exclude<OgCollectionName, "posts">, {
  docs: CachedServerDoc[];
  hasSnapshot: boolean;
  listenerActive: boolean;
}> = {
  ads: { docs: [], hasSnapshot: false, listenerActive: false },
  events: { docs: [], hasSnapshot: false, listenerActive: false },
  directory: { docs: [], hasSnapshot: false, listenerActive: false },
};

let realtimePortalFallbackImage = "";
let isPortalSettingsListenerActive = false;

const cachedSiteRssXmlMap = new Map<string, { xml: string; etag: string; lastModified: string }>();

function persistSitemapXmlToDisk(xml: string): void {
  const targetDirs = [path.join(process.cwd(), "public")];
  const distDir = path.join(process.cwd(), "dist");
  if (fs.existsSync(distDir)) {
    targetDirs.push(distDir);
  }
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, "sitemap.xml");
    const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (existing !== xml) {
      fs.writeFileSync(filePath, xml, "utf8");
    }
  }
}

async function fetchLiveFirestoreCollectionForSitemap(
  colName: SitemapCollectionName
): Promise<CrawledFirestoreDoc[]> {
  try {
    const db = await getServerFirestoreDb();
    if (db) {
      const { collection, getDocs } = await import("firebase/firestore");
      const docs = await withServerTimeout(
        getDocs(collection(db, colName)).then((snap) =>
          snap.docs.map((d) => ({ id: d.id, data: d.data() }))
        ),
        5000,
        [] as CrawledFirestoreDoc[]
      );
      if (docs.length > 0) {
        return docs;
      }
    }
  } catch {
    // Fall back to cached snapshots below
  }

  if (colName === "posts") return realtimeSitePostDocs;
  if (colName === "ads") return collectionDocsCache.ads.docs;
  if (colName === "events") return collectionDocsCache.events.docs;
  if (colName === "directory_entries") return collectionDocsCache.directory.docs;
  return [];
}

const sitemapCrawlIntervalMs = Number(process.env.SITEMAP_CRAWL_INTERVAL_MS) || 15 * 60 * 1000;
const periodicSitemapManager = createPeriodicSitemapManager({
  fetchCollectionDocs: fetchLiveFirestoreCollectionForSitemap,
  persistSitemapXml: persistSitemapXmlToDisk,
  crawlIntervalMs: sitemapCrawlIntervalMs,
});

function invalidateSiteFeedCaches() {
  cachedSiteRssXmlMap.clear();
  periodicSitemapManager.scheduleDebouncedRefresh(2500, "content-invalidation");
}

async function withServerTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function startSiteRssRealtimeSync(): Promise<void> {
  try {
    const db = await getServerFirestoreDb();
    if (!db) return;

    const { collection, doc: fsDoc, onSnapshot } = await import("firebase/firestore");

    if (!isRealtimePostsListenerActive) {
      isRealtimePostsListenerActive = true;
      onSnapshot(
        collection(db, "posts"),
        (snapshot) => {
          realtimeSitePostDocs = snapshot.docs.map((d) => ({
            id: d.id,
            data: d.data(),
          }));
          hasRealtimePostsSnapshot = true;
          invalidateSiteFeedCaches();
        },
        (err) => {
          isRealtimePostsListenerActive = false;
          console.warn("[Site RSS] Firestore realtime listener notice:", err?.message || err);
        }
      );
    }

    for (const colName of ["ads", "events", "directory"] as const) {
      const slot = collectionDocsCache[colName];
      const firestoreCollection = colName === "directory" ? "directory_entries" : colName;
      if (!slot.listenerActive) {
        slot.listenerActive = true;
        onSnapshot(
          collection(db, firestoreCollection),
          (snapshot) => {
            slot.docs = snapshot.docs.map((d) => ({
              id: d.id,
              data: d.data(),
            }));
            slot.hasSnapshot = true;
            periodicSitemapManager.scheduleDebouncedRefresh(2500, `firestore-${firestoreCollection}`);
          },
          () => {
            slot.listenerActive = false;
          }
        );
      }
    }

    if (!isPortalSettingsListenerActive) {
      isPortalSettingsListenerActive = true;
      onSnapshot(
        fsDoc(db, "settings", "portal"),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data() as any;
            if (d?.useFallbackForMissingImages && typeof d?.fallbackImageUrl === "string") {
              realtimePortalFallbackImage = d.fallbackImageUrl.trim();
            } else {
              realtimePortalFallbackImage = "";
            }
          }
        },
        () => {
          isPortalSettingsListenerActive = false;
        }
      );
    }
  } catch (err: any) {
    isRealtimePostsListenerActive = false;
    console.warn("[Site RSS] Could not initialize realtime posts listener:", err?.message || err);
  }
}

async function getServerCollectionDocs(colName: OgCollectionName): Promise<CachedServerDoc[]> {
  if (colName === "posts") {
    if (hasRealtimePostsSnapshot) return realtimeSitePostDocs;
    return withServerTimeout(getPublishedSitePostsDocs(), 2500, realtimeSitePostDocs);
  }

  const slot = collectionDocsCache[colName];
  if (slot.hasSnapshot) return slot.docs;

  try {
    const db = await getServerFirestoreDb();
    if (!db) return slot.docs;
    const { collection, getDocs } = await import("firebase/firestore");
    const docs = await withServerTimeout(
      getDocs(collection(db, colName)).then((snap) =>
        snap.docs.map((d) => ({ id: d.id, data: d.data() }))
      ),
      2500,
      slot.docs
    );
    if (docs.length > 0) {
      slot.docs = docs;
      slot.hasSnapshot = true;
    }
    return docs;
  } catch {
    return slot.docs;
  }
}

async function rehydrateServerDocIfSharded(colName: OgCollectionName, docId: string, data: any): Promise<any> {
  if (!data || !data.hasChunkedContent || colName === "directory") return data;
  try {
    const db = await getServerFirestoreDb();
    if (!db) return data;
    const { collection, getDocs } = await import("firebase/firestore");
    const chunkSnap = await withServerTimeout(
      getDocs(collection(db, colName, docId, "chunks")),
      1500,
      null as any
    );
    if (!chunkSnap || chunkSnap.empty) return data;

    const pieces = chunkSnap.docs
      .map((d: any) => d.data())
      .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
      .map((c: any) => String(c.data || ""))
      .join("");
    if (!pieces) return data;

    const parsedOverflow = JSON.parse(pieces);
    return { ...data, ...parsedOverflow };
  } catch {
    return data;
  }
}

async function getPublishedSitePostsDocs(): Promise<Array<{ id: string; data: any }>> {
  if (hasRealtimePostsSnapshot) {
    return realtimeSitePostDocs;
  }

  try {
    const db = await getServerFirestoreDb();
    if (!db) return [];
    const { collection, getDocs } = await import("firebase/firestore");
    const snap = await getDocs(collection(db, "posts"));
    const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    realtimeSitePostDocs = docs;
    hasRealtimePostsSnapshot = true;
    return docs;
  } catch (err: any) {
    console.warn("[Site RSS] Error reading posts from Firestore:", err?.message || err);
    return realtimeSitePostDocs;
  }
}

async function getOrGenerateSiteRssXml(options: {
  feedType: SiteRssFeedType;
  selfUrl: string;
  categoryFilter?: string;
  maxItems?: number;
}): Promise<{ xml: string; etag: string; lastModified: string }> {
  const cacheKey = `${options.feedType}|${options.selfUrl}|${options.categoryFilter || ""}|${options.maxItems || 60}`;
  const cached = cachedSiteRssXmlMap.get(cacheKey);
  if (cached) {
    return cached;
  }

  const docs = await getPublishedSitePostsDocs();
  const items: SiteRssItem[] = [];

  for (const entry of docs) {
    const formatted = formatFirestoreDocToRssItem(entry.data, entry.id, options.feedType);
    if (!formatted) continue;

    if (options.categoryFilter) {
      const targetCat = options.categoryFilter.toLowerCase().trim();
      const matchesCat = (formatted.categories || [formatted.category]).some(
        (c) => c.toLowerCase().includes(targetCat)
      );
      if (!matchesCat) continue;
    }

    items.push(formatted);
  }

  const xml = generateSiteRssXml(items, {
    feedType: options.feedType,
    selfUrl: options.selfUrl,
    maxItems: options.maxItems || 60,
  });

  const etag = `"${crypto.createHash("sha1").update(xml).digest("hex")}"`;
  const newestMs = items.reduce((max, it) => (it.timestampMs > max ? it.timestampMs : max), 0);
  const lastModified = new Date(newestMs > 0 ? newestMs : Date.now()).toUTCString();

  const result = { xml, etag, lastModified };
  cachedSiteRssXmlMap.set(cacheKey, result);
  return result;
}

// Dynamic sitemap generation is handled by periodicSitemapManager (sitemapCrawlerService)

function resolveRequestOrigin(req: express.Request): string {
  const xfHost = (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim();
  const host = xfHost || req.get("host") || "";
  if (!host) return SITE_URL;
  const xfProto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim();
  const proto =
    xfProto ||
    req.protocol ||
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

async function resolveOgMetadataForTargetUrl(
  rawUrl: string,
  origin: string
): Promise<ResolvedOgMetadata> {
  return resolveOgMetadataFromLookup(rawUrl, origin, {
    siteUrl: SITE_URL,
    portalFallbackImage: realtimePortalFallbackImage,
    getCollectionDocs: (colName) => getServerCollectionDocs(colName as OgCollectionName),
    rehydrateShardedDoc: (colName, docId, data) =>
      rehydrateServerDocIfSharded(colName as OgCollectionName, docId, data),
    resolveExternalEmbedImage: async (extUrl: string) => {
      const fetched = await withServerTimeout(
        fetchExternalEmbedMetadata(extUrl).catch(() => null),
        8000,
        null
      );
      return fetched?.imageUrl || null;
    },
  });
}

/**
 * Injects Google Analytics tag and dynamic Firestore-resolved SEO / OpenGraph / Twitter metadata
 * into the full SPA HTML document.
 */
async function preparePageHtml(rawHtml: string, req: express.Request): Promise<string> {
  const origin = resolveRequestOrigin(req);
  const rawUrl = req.originalUrl || req.url || "/";
  const meta = await resolveOgMetadataForTargetUrl(rawUrl, origin);
  return injectOgTagsIntoSpaHtml(rawHtml, meta, GA_TAG_HTML);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  const PUBLIC_SYNDICATION_PATHS = new Set([
    "/rss.xml",
    "/feed.xml",
    "/rss",
    "/feed",
    "/blog/rss.xml",
    "/blog/feed",
    "/novice/rss.xml",
    "/novice/feed",
    "/api/rss/site.xml",
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/robots.txt",
  ]);

  // 1. ENTRY-LEVEL SECURITY MIDDLEWARE: Reject known malicious scanner paths & bot User-Agents before any route handling
  // Allow external RSS news aggregators, feed readers & search crawlers on public syndication endpoints (/rss.xml, /sitemap.xml, etc.)
  app.use((req, res, next) => {
    const cleanReqPath = (req.path || "").toLowerCase().replace(/\/+$/, "") || "/";
    if (
      PUBLIC_SYNDICATION_PATHS.has(cleanReqPath) ||
      cleanReqPath.startsWith("/api/og-image/") ||
      cleanReqPath.startsWith("/api/meta/") ||
      cleanReqPath.startsWith("/api/sitemap/")
    ) {
      if (isMaliciousSecurityPath(req.path, req.originalUrl || req.url)) {
        return res.status(404).type("text/plain").send("Not Found");
      }
      return next();
    }

    const userAgent = req.headers["user-agent"] || "";
    const check = verifyIncomingRequestSecurity(req.path, req.originalUrl || req.url, userAgent);
    if (!check.allowed) {
      const status = check.status || 403;
      return res.status(status).type("text/plain").send(status === 404 ? "Not Found" : "Forbidden: Non-human automated client rejected");
    }
    next();
  });

  app.use(express.json());

  // Hidden meta-tag generator & pre-render endpoints (JSON inspection + pre-rendered HTML proxy)
  app.get("/api/meta/og", async (req, res) => {
    try {
      const origin = resolveRequestOrigin(req);
      const targetParam = String(req.query.url || req.query.path || "/").trim();
      const meta = await resolveOgMetadataForTargetUrl(targetParam, origin);
      return res.status(200).json({ ok: true, meta });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || "Meta resolution error" });
    }
  });

  app.get("/api/meta/prerender", async (req, res) => {
    try {
      const origin = resolveRequestOrigin(req);
      const targetParam = String(req.query.url || req.query.path || "/").trim();
      const meta = await resolveOgMetadataForTargetUrl(targetParam, origin);
      const html = buildPreRenderedCrawlerHtml(meta, origin);
      return res
        .status(200)
        .set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "Vary": "User-Agent",
          "X-OG-Prerender": "1",
        })
        .send(html);
    } catch (err: any) {
      return res.status(500).type("text/plain").send(err?.message || "Prerender failed");
    }
  });

  // Dynamic binary OpenGraph image endpoint for posts whose cover/inline image is stored as a base64 data URI
  app.get("/api/og-image/:collectionName/:docId", async (req, res) => {
    try {
      const colRaw = String(req.params.collectionName || "").trim();
      const docId = decodeURIComponent(String(req.params.docId || "")).trim();
      const allowedCols: ServiceOgCollectionName[] = ["posts", "ads", "events", "directory"];
      if (!allowedCols.includes(colRaw as ServiceOgCollectionName) || !docId) {
        return res.status(404).end();
      }
      const colName = colRaw as OgCollectionName;
      const docs = await getServerCollectionDocs(colName);
      const matched = docs.find((d) => d.id === docId);

      let data = matched?.data;
      if (!data) {
        const db = await getServerFirestoreDb();
        if (db) {
          const { doc: fsDoc, getDoc } = await import("firebase/firestore");
          const snap = await withServerTimeout(getDoc(fsDoc(db, colName, docId)), 2000, null as any);
          if (snap?.exists?.()) {
            data = snap.data();
          }
        }
      }

      if (data?.hasChunkedContent && !extractFirstDataImageUri(data)) {
        data = await rehydrateServerDocIfSharded(colName, docId, data);
      }

      const dataUri = data ? extractFirstDataImageUri(data) : null;
      if (dataUri) {
        const match = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
        if (match) {
          const mimeType = match[1];
          const buffer = Buffer.from(match[2], "base64");
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.setHeader("Access-Control-Allow-Origin", "*");
          return res.status(200).send(buffer);
        }
      }

      const origin = resolveRequestOrigin(req);
      const fallbackUrl = data ? resolveBestOgImageUrl(colName, docId, data, origin) : null;
      if (fallbackUrl && !fallbackUrl.includes("/api/og-image/")) {
        return res.redirect(302, fallbackUrl);
      }

      const faviconPath = path.join(process.cwd(), "public", "favicon.png");
      if (fs.existsSync(faviconPath)) {
        return res.sendFile(faviconPath);
      }
      return res.status(404).end();
    } catch {
      return res.status(404).end();
    }
  });

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

  // External URL metadata / embed fetcher for Mali oglasi & Akcije
  const handleExternalEmbedFetch = async (req: express.Request, res: express.Response) => {
    try {
      const targetUrl = String(
        req.method === "POST" ? req.body?.url || req.query?.url || "" : req.query?.url || ""
      ).trim();

      if (!targetUrl) {
        return res.status(400).json({ ok: false, error: "Vnesite spletni naslov (URL)." });
      }

      const meta = await fetchExternalEmbedMetadata(targetUrl);
      return res.status(200).json({ ok: true, meta });
    } catch (err: any) {
      return res.status(400).json({
        ok: false,
        error: err?.message || "Vsebine s te spletne strani ni bilo mogoče prebrati.",
      });
    }
  };

  app.get("/api/embed/fetch-url", handleExternalEmbedFetch);
  app.post("/api/embed/fetch-url", handleExternalEmbedFetch);

  // Safe image proxy for external embed thumbnails that block browser hotlinking / Referer / CORS
  app.get("/api/embed/image-proxy", async (req, res) => {
    try {
      const rawImgUrl = String(req.query.url || "").trim();
      if (!rawImgUrl) {
        return res.status(400).end();
      }
      const { assertSafePublicUrl } = await import("./src/services/externalEmbedFetcher");
      const safeUrl = await assertSafePublicUrl(rawImgUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const upstream = await fetch(safeUrl.toString(), {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "sl-SI,sl;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });

        if (!upstream.ok) {
          return res.status(upstream.status).end();
        }
        const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
        if (!contentType.startsWith("image/")) {
          return res.status(415).end();
        }

        const arrBuf = await upstream.arrayBuffer();
        if (arrBuf.byteLength === 0 || arrBuf.byteLength > 8 * 1024 * 1024) {
          return res.status(413).end();
        }

        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(200).send(Buffer.from(arrBuf));
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      return res.status(404).end();
    }
  });

  // Dynamic Site XML RSS 2.0 Feed endpoints for external news aggregators & feed readers
  const handleSiteRssFeedRequest = async (req: express.Request, res: express.Response) => {
    try {
      const pathLower = (req.path || "").toLowerCase();
      const queryType = String(req.query.type || "").toLowerCase().trim();
      let feedType: SiteRssFeedType = "all";
      if (pathLower.startsWith("/blog") || queryType === "blog") {
        feedType = "blog";
      } else if (pathLower.startsWith("/novice") || queryType === "news") {
        feedType = "news";
      }

      const categoryFilter = typeof req.query.category === "string" ? req.query.category.trim() : undefined;
      const parsedLimit = Number(req.query.limit);
      const maxItems = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(100, Math.floor(parsedLimit)) : 60;

      const host = req.get("host");
      const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() || req.protocol || "https";
      const selfUrl = host ? `${proto}://${host}${req.originalUrl}` : `${SITE_URL}${req.path}`;

      const { xml, etag, lastModified } = await getOrGenerateSiteRssXml({
        feedType,
        selfUrl,
        categoryFilter,
        maxItems,
      });

      res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
      res.setHeader("ETag", etag);
      res.setHeader("Last-Modified", lastModified);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("X-Content-Type-Options", "nosniff");

      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }

      return res.status(200).send(xml);
    } catch (err: any) {
      console.error("[Site RSS] Error generating RSS XML feed:", err);
      const fallbackXml = generateSiteRssXml([], {
        feedType: "all",
        selfUrl: `${SITE_URL}/rss.xml`,
      });
      res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).send(fallbackXml);
    }
  };

  app.get(
    [
      "/rss.xml",
      "/feed.xml",
      "/rss",
      "/feed",
      "/blog/rss.xml",
      "/blog/feed",
      "/novice/rss.xml",
      "/novice/feed",
      "/api/rss/site.xml",
    ],
    handleSiteRssFeedRequest
  );

  // Explicit cache invalidation hook (called when posts/ads/events are published/updated)
  app.post("/api/rss/invalidate", (req, res) => {
    invalidateSiteFeedCaches();
    res.json({ success: true });
  });

  // Dynamic sitemap refresh & status endpoints
  app.post("/api/sitemap/refresh", async (req, res) => {
    try {
      const snapshot = await periodicSitemapManager.refreshNow("api-refresh");
      return res.json({ success: true, stats: snapshot.stats });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Sitemap refresh failed" });
    }
  });

  app.get("/api/sitemap/status", (req, res) => {
    return res.json({ ok: true, ...periodicSitemapManager.getStatus() });
  });

  // Sitemap endpoint (periodic Firestore crawler + ETag/Last-Modified caching)
  app.get(["/sitemap.xml", "/sitemap_index.xml"], async (req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=900, must-revalidate");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const { xml, etag, lastModified, stats } = await periodicSitemapManager.getSitemap();
      res.setHeader("ETag", etag);
      res.setHeader("Last-Modified", lastModified);
      res.setHeader("X-Sitemap-Urls", String(stats.totalUrls));

      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }
      return res.status(200).send(xml);
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
  const perFeedFallbackCache = new Map<string, ServerNewsItem[]>();
  const inFlightRssFetches = new Map<string, Promise<ServerNewsItem[]>>();
  let emergencyRssFallbackItems: ServerNewsItem[] = [];
  const articleThumbnailCache = new Map<string, string>();

  async function fetchArticleOgImage(url: string, timeoutMs = 2500): Promise<string | null> {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return null;
    const cached = articleThumbnailCache.get(url);
    if (cached) return cached;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
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
    } finally {
      clearTimeout(timer);
    }
    return null;
  }

  async function enrichMaribor24Thumbnails(items: ServerNewsItem[], maxSync = 12): Promise<void> {
    const missing = items.filter(it => !it.thumbnail && it.link && (it.feedId === 'maribor24' || it.link.includes('maribor24.si')));
    if (missing.length === 0) return;

    const syncSlice = missing.slice(0, maxSync);
    const BATCH_SIZE = 4;
    for (let i = 0; i < syncSlice.length; i += BATCH_SIZE) {
      const batch = syncSlice.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (item) => {
          const ogImg = await fetchArticleOgImage(item.link, 2500);
          if (ogImg) item.thumbnail = ogImg;
        })
      );
    }

    // Background-warm remaining items without blocking the HTTP response
    const remainingSlice = missing.slice(maxSync, 35);
    if (remainingSlice.length > 0) {
      void (async () => {
        for (let i = 0; i < remainingSlice.length; i += BATCH_SIZE) {
          const batch = remainingSlice.slice(i, i + BATCH_SIZE);
          await Promise.allSettled(
            batch.map(async (item) => {
              const ogImg = await fetchArticleOgImage(item.link, 2500);
              if (ogImg) item.thumbnail = ogImg;
            })
          );
        }
      })();
    }
  }

  async function fetchRssFeedOnce(feed: ServerRssFeedConfig, timeoutMs: number): Promise<ServerNewsItem[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(feed.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*;q=0.9',
          'Accept-Language': 'sl,en;q=0.9',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      return parseServerRssXml(xml, feed.name, feed.id);
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchRssFeedFromSource(feed: ServerRssFeedConfig, timeoutMs = 12000): Promise<ServerNewsItem[]> {
    const feedCacheKey = feed.id || feed.url;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const attemptTimeout = attempt === 1 ? timeoutMs : Math.max(timeoutMs, 15000);
        const parsed = await fetchRssFeedOnce(feed, attemptTimeout);

        if (parsed.length > 0) {
          if (feed.id === 'maribor24' || parsed.some(it => !it.thumbnail && it.link.includes('maribor24.si'))) {
            await enrichMaribor24Thumbnails(parsed);
          }
          perFeedFallbackCache.set(feedCacheKey, parsed);
          return parsed;
        }
      } catch (err: any) {
        const isLastAttempt = attempt === maxAttempts;
        if (!isLastAttempt) {
          await new Promise(resolve => setTimeout(resolve, 350));
          continue;
        }
        const cachedFeedItems = perFeedFallbackCache.get(feedCacheKey);
        if (cachedFeedItems && cachedFeedItems.length > 0) {
          console.info(`[RSS Server] Using cached items for ${feed.name} after transient fetch issue: ${err?.message || 'Unknown error'}`);
          return cachedFeedItems;
        }
        console.warn(`[RSS Server] Could not refresh ${feed.name} (${feed.url}): ${err?.message || 'Unknown error'}`);
      }
    }

    return perFeedFallbackCache.get(feedCacheKey) || [];
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
      let fetchPromise = inFlightRssFetches.get(cacheKey);
      if (!fetchPromise) {
        fetchPromise = (async () => {
          const feedPromises = requestedFeeds.map(feed => fetchRssFeedFromSource(feed, 12000));
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
              timestamp: Date.now(),
              items: uniqueItems
            });
            emergencyRssFallbackItems = uniqueItems;
            return uniqueItems;
          }
          return [];
        })().finally(() => {
          inFlightRssFetches.delete(cacheKey);
        });
        inFlightRssFetches.set(cacheKey, fetchPromise);
      }

      const uniqueItems = await fetchPromise;
      if (uniqueItems.length > 0) {
        return res.json({
          success: true,
          count: uniqueItems.length,
          items: uniqueItems,
          cached: false,
          fetchedAt: new Date().toISOString()
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

  // Background pre-warming and automatic periodic cache refresher
  async function warmServerRssCache(): Promise<void> {
    const defaultKey = DEFAULT_SERVER_FEEDS.map(f => f.id || f.name).sort().join(",");
    if (inFlightRssFetches.has(defaultKey)) {
      await inFlightRssFetches.get(defaultKey);
      return;
    }

    const warmPromise = (async () => {
      try {
        const feedPromises = DEFAULT_SERVER_FEEDS.map(feed => fetchRssFeedFromSource(feed, 12000));
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

          serverRssCaches.set(defaultKey, {
            timestamp: Date.now(),
            items: uniqueItems
          });
          emergencyRssFallbackItems = uniqueItems;
          return uniqueItems;
        }
      } catch (err: any) {
        console.warn("[RSS Server] Error warming RSS cache:", err.message);
      }
      return [];
    })().finally(() => {
      inFlightRssFetches.delete(defaultKey);
    });

    inFlightRssFetches.set(defaultKey, warmPromise);
    await warmPromise;
  }

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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const upstream = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*;q=0.8"
        },
        redirect: "follow"
      });

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
    } finally {
      clearTimeout(timer);
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

  interface ServerEmailConfig {
    resendApiKey: string;
    resendSenderEmail: string;
    resendSenderName: string;
    brevoApiKey: string;
    brevoSenderEmail: string;
    brevoSenderName: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
  }

  let serverEmailConfigCache: ServerEmailConfig | null = null;
  let serverEmailConfigCacheTime = 0;

  async function getServerEmailConfig(): Promise<ServerEmailConfig> {
    const now = Date.now();
    if (serverEmailConfigCache && now - serverEmailConfigCacheTime < 60000) {
      return serverEmailConfigCache;
    }

    let resendApiKey = (process.env.RESEND_API_KEY || "").trim();
    let brevoApiKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || "").trim();
    let smtpHost = (process.env.SMTP_HOST || "").trim();
    let smtpPort = Number(process.env.SMTP_PORT || 587);
    let smtpUser = (process.env.SMTP_USER || "").trim();
    let smtpPass = (process.env.SMTP_PASS || "").trim();
    let senderEmail = (process.env.NOREPLY_EMAIL || process.env.RESEND_SENDER_EMAIL || "noreply@portalko.net").trim();
    let senderName = (process.env.NOREPLY_NAME || process.env.RESEND_SENDER_NAME || "Portalko.net").trim();

    if (!resendApiKey) {
      try {
        const firestoreUrl = "https://firestore.googleapis.com/v1/projects/thinking-asset-2lcf1/databases/ai-studio-portalko-7159d16f-86b5-4482-beb4-819bb59cd9dd/documents/settings/email_config";
        const resp = await fetch(firestoreUrl, { signal: AbortSignal.timeout(4000) });
        if (resp.ok) {
          const json = await resp.json();
          const fields = json.fields || {};
          if (fields.resendApiKey?.stringValue) {
            resendApiKey = fields.resendApiKey.stringValue.trim();
          }
          if (fields.brevoApiKey?.stringValue && !brevoApiKey) {
            brevoApiKey = fields.brevoApiKey.stringValue.trim();
          }
          if (fields.resendSenderEmail?.stringValue) {
            senderEmail = fields.resendSenderEmail.stringValue.trim();
          }
          if (fields.resendSenderName?.stringValue) {
            senderName = fields.resendSenderName.stringValue.trim();
          }
        }
      } catch (e: any) {
        console.warn("[SERVER EMAIL CONFIG FIRESTORE NOTE]:", e.message);
      }
    }

    serverEmailConfigCache = {
      resendApiKey,
      resendSenderEmail: senderEmail,
      resendSenderName: senderName,
      brevoApiKey,
      brevoSenderEmail: senderEmail,
      brevoSenderName: senderName,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
    };
    serverEmailConfigCacheTime = now;
    return serverEmailConfigCache;
  }

  // Noreply Email Verification Dispatch Endpoint (supports both routes)
  app.post(["/api/auth/send-verification-email", "/api/send-verification-email"], async (req, res) => {
    try {
      const { name, email, token, confirmationUrl } = req.body;
      if (!email || !token || !confirmationUrl) {
        return res.status(400).json({ error: "Manjkajo obvezni podatki (email, token ali confirmationUrl)." });
      }

      const safeName = (name || "").trim() || "Uporabnik";
      const config = await getServerEmailConfig();
      const noreplyFrom = `"${config.resendSenderName}" <${config.resendSenderEmail}>`;

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

      const plainText = `Pozdravljeni, ${safeName}!\n\nHvala za registracijo na Portalko.net.\nZa dokončanje registracije in potrditev vašega računa kliknite na povezavo:\n${confirmationUrl}\n\nPovezava je veljavna 24 ur.\nTo sporočilo je bilo samodejno poslano iz naslova ${config.resendSenderEmail}.`;

      // 1. PRIMARY: Resend API (https://resend.com - modern REST API HTTPS, reliable inbox delivery)
      const resendKey = config.resendApiKey;
      const resendFrom = noreplyFrom;

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
  app.get("/api/admin/email-delivery-logs", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const config = await getServerEmailConfig();
    const configured = {
      resend: Boolean(config.resendApiKey),
      resendSender: config.resendSenderEmail,
      brevo: Boolean(config.brevoApiKey),
      sendgrid: Boolean(process.env.SENDGRID_API_KEY),
      smtp: Boolean(config.smtpHost),
      activeProvider: (config.resendApiKey ? "Resend API" :
                       config.brevoApiKey ? "Brevo API" :
                       process.env.SENDGRID_API_KEY ? "SendGrid API" :
                       config.smtpHost ? "SMTP" : "Ni nastavljen (Simulacija / Ročna aktivacija)")
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
      const config = await getServerEmailConfig();
      const resendKey = config.resendApiKey;
      const resendSenderEmail = config.resendSenderEmail;
      const resendSenderName = config.resendSenderName;
      const resendFrom = `"${resendSenderName}" <${resendSenderEmail}>`;

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
        hint: "Brezplačni ključ lahko pridobite na https://resend.com/api-keys in ga vnesete v nastavitve ali .env datoteko pod RESEND_API_KEY.",
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
      const config = await getServerEmailConfig();
      const noreplyFrom = `"${config.resendSenderName}" <${config.resendSenderEmail}>`;

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
      const resendKey = config.resendApiKey;
      const resendFrom = noreplyFrom;

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
      const brevoKey = config.brevoApiKey;
      const brevoSenderEmail = config.brevoSenderEmail;
      const brevoSenderName = config.brevoSenderName;

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

  // Approximate IP geolocation fallback for local weather widget (when browser GPS is denied/unavailable)
  app.get("/api/weather/ip-location", async (req, res) => {
    try {
      const forwarded = req.headers["x-forwarded-for"];
      const rawIp = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : req.socket.remoteAddress || "";
      const cleanIp = rawIp.replace(/^::ffff:/, "").trim();

      const isPrivateOrLocal =
        !cleanIp ||
        cleanIp === "127.0.0.1" ||
        cleanIp === "::1" ||
        cleanIp.startsWith("10.") ||
        cleanIp.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(cleanIp);

      if (isPrivateOrLocal) {
        return res.json({ ok: false, reason: "local_network" });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const geoRes = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!geoRes.ok) {
        return res.json({ ok: false });
      }
      const data: any = await geoRes.json();
      if (data && data.success !== false && typeof data.latitude === "number" && typeof data.longitude === "number") {
        return res.json({
          ok: true,
          lat: data.latitude,
          lon: data.longitude,
          city: data.city || "",
          region: data.region || "",
          countryCode: data.country_code || "",
          source: "ip",
        });
      }
      return res.json({ ok: false });
    } catch {
      return res.json({ ok: false });
    }
  });

  // AI-powered suggested tagging & auto-categorization for Imenik directory entries
  app.post("/api/directory/ai-suggest", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY ni nastavljen na strežniku." });
      }

      const { name, url, description, categories } = req.body || {};
      if (!description && !name) {
        return res.status(400).json({ error: "Vnesite naziv ali opis za AI analizo." });
      }

      const catList: Array<{ id: string; name: string; description?: string }> = Array.isArray(categories)
        ? categories
        : [];
      if (catList.length === 0) {
        return res.status(400).json({ error: "Seznam kategorij imenika je prazen." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const categoriesContext = catList
        .map((c) => `- id: "${c.id}", naziv: "${c.name}"${c.description ? ` (${c.description})` : ""}`)
        .join("\n");

      const prompt = `Si urednik slovenskega spletnega imenika blagovnih znamk in podjetij (Imenik).
Na podlagi opisa spletne strani izberi najustreznejšo kategorijo iz spodnjega seznama ter predlagaj 3 do 5 kratkih slovenskih ključnih oznak (brez znaka #, male črke, 1–2 besedi na oznako).

Vnos:
- Naziv: ${String(name || "").slice(0, 120)}
- URL: ${String(url || "").slice(0, 200)}
- Opis: ${String(description || "").slice(0, 1000)}

Razpoložljive kategorije:
${categoriesContext}

Vrni strogo JSON z natančnim ID-jem izbrane kategorije iz zgornjega seznama.`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedCategoryId: {
                type: Type.STRING,
                description: "Exact id of the best matching category from the provided list",
              },
              suggestedTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 to 5 concise lowercase Slovenian tags without #",
              },
              reason: {
                type: Type.STRING,
                description: "Short one-sentence explanation in Slovenian",
              },
            },
            required: ["suggestedCategoryId", "suggestedTags", "reason"],
          },
        },
      });

      const rawText = response.text || "{}";
      const parsed = JSON.parse(rawText);
      const matchedCat =
        catList.find((c) => c.id === parsed.suggestedCategoryId) || catList[0];

      const cleanTags: string[] = Array.isArray(parsed.suggestedTags)
        ? parsed.suggestedTags
            .map((t: unknown) => String(t).replace(/^#/, "").trim().toLowerCase())
            .filter((t: string) => t.length >= 2 && t.length <= 28)
            .slice(0, 5)
        : [];

      return res.json({
        ok: true,
        suggestedCategoryId: matchedCat.id,
        suggestedCategoryName: matchedCat.name,
        suggestedTags: cleanTags,
        reason: typeof parsed.reason === "string" ? parsed.reason : "",
      });
    } catch (err: any) {
      console.error("AI directory suggest error:", err);
      return res.status(500).json({
        error: err?.message || "Napaka pri AI predlogu kategorije in oznak.",
      });
    }
  });

  // Security filter: drop vulnerability probes & scanner targets with 404
  app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    if (
      p.includes("__vite_rsc_findsourcemapurl") ||
      p.includes(".env") ||
      p.includes("/wp-") ||
      p.includes("/xmlrpc") ||
      p.includes("/.git") ||
      p.includes("phpmyadmin") ||
      p.endsWith(".php") ||
      p.endsWith(".sql") ||
      p.endsWith(".bak") ||
      p.endsWith(".config") ||
      p.endsWith(".ini")
    ) {
      return res.status(404).type("text/plain").send("Not Found");
    }
    next();
  });

  // Hidden server-side pre-render proxy middleware for social media crawlers (Facebook, X, WhatsApp, LinkedIn, etc.)
  // Intercepts page requests before Vite or static SPA handlers so scrapers receive clean, head-first OG HTML immediately.
  app.get("*", async (req, res, next) => {
    const pathname = req.path || "/";
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/@") ||
      pathname.startsWith("/src") ||
      /\.(js|css|png|jpe?g|gif|svg|ico|json|woff2?|ttf|eot|webp|avif|map|xml|txt)$/i.test(pathname)
    ) {
      return next();
    }

    const ua = req.headers["user-agent"] || "";
    const forcePrerender = req.query._prerender === "1";
    if (!forcePrerender && !isSocialPreviewCrawler(ua)) {
      return next();
    }

    try {
      const origin = resolveRequestOrigin(req);
      const meta = await resolveOgMetadataForTargetUrl(req.originalUrl || req.url || "/", origin);
      const crawlerHtml = buildPreRenderedCrawlerHtml(meta, origin);
      return res
        .status(200)
        .set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "Vary": "User-Agent",
          "X-OG-Prerender": "1",
        })
        .send(crawlerHtml);
    } catch {
      return next();
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
        const html = await preparePageHtml(template, req);
        res
          .status(200)
          .set({
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Vary": "User-Agent",
          })
          .send(html);
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

    // Serve static assets from dist (disable default index.html auto-serve on '/' so dynamic OG tags apply to root too)
    app.use(express.static(resolvedDistPath, { index: false }));

    // Fallback for all SPA page routes - handles browser refreshes & social link previews in production
    app.get("*", async (req, res) => {
      // Don't intercept API requests
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint ni bil najden." });
      }

      // Check if dist/index.html exists
      if (fs.existsSync(distIndexPath)) {
        try {
          const template = fs.readFileSync(distIndexPath, "utf-8");
          const html = await preparePageHtml(template, req);
          return res
            .status(200)
            .set({
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "Vary": "User-Agent",
            })
            .send(html);
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
    setTimeout(() => {
      startSiteRssRealtimeSync().catch(() => {});
      warmServerRssCache().catch(() => {});
      periodicSitemapManager.start();
    }, 300);
  });
}

startServer();
