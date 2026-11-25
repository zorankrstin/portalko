import crypto from 'crypto';
import {
  SitemapEntry,
  formatCategoryDocToSitemapEntries,
  formatDirectoryDocToSitemapEntry,
  formatFirestoreDocToSitemapEntry,
  formatTagToSitemapEntry,
  generateXmlFromEntries,
  getBaseSitemapEntries,
  isLiveSitemapDoc,
  toSitemapDateString,
} from '../utils/sitemapGenerator';

export type SitemapCollectionName =
  | 'posts'
  | 'ads'
  | 'events'
  | 'categories'
  | 'directory_entries';

export interface CrawledFirestoreDoc {
  id: string;
  data: Record<string, any>;
}

export interface SitemapCrawlStats {
  totalUrls: number;
  baseUrls: number;
  postsCount: number;
  adsCount: number;
  eventsCount: number;
  directoryCount: number;
  categoriesCount: number;
  tagsCount: number;
  crawledAt: string;
  durationMs: number;
}

export interface GeneratedSitemapSnapshot {
  xml: string;
  etag: string;
  lastModified: string;
  stats: SitemapCrawlStats;
}

export interface SitemapCrawlerDeps {
  fetchCollectionDocs: (colName: SitemapCollectionName) => Promise<CrawledFirestoreDoc[]>;
  persistSitemapXml?: (xml: string, stats: SitemapCrawlStats) => Promise<void> | void;
  crawlIntervalMs?: number;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

function classifyPostType(data: Record<string, any>): 'deal' | 'news' | 'blog' {
  const cat = String(data.category || '').toLowerCase();
  const catName = String(data.categoryName || '').toLowerCase();
  const isDeal =
    data.type === 'deal' ||
    cat === 'deal' ||
    cat.startsWith('deal') ||
    /ugodnost|akcij|popust|trgovin|hrana/.test(catName) ||
    Boolean(data.discount) ||
    Boolean(data.promoCode);
  if (isDeal) return 'deal';
  if (data.type === 'news') return 'news';
  return 'blog';
}

function computeNewestTimestamp(docs: CrawledFirestoreDoc[]): number {
  let newestMs = 0;
  for (const d of docs) {
    const iso = toSitemapDateString(d.data?.updatedAt || d.data?.createdAt);
    const ms = Date.parse(iso);
    if (Number.isFinite(ms) && ms > newestMs) {
      newestMs = ms;
    }
  }
  return newestMs;
}

/**
 * Crawls all live Firestore content collections (posts, ads, events, categories, directory_entries),
 * compiles deduplicated SEO sitemap entries with lastmod & image tags, and renders sitemap.xml.
 */
export async function buildDynamicSitemapFromFirestore(
  deps: Pick<SitemapCrawlerDeps, 'fetchCollectionDocs' | 'persistSitemapXml' | 'logger'>
): Promise<GeneratedSitemapSnapshot> {
  const startedAt = Date.now();
  const log = deps.logger || console;

  const entries: SitemapEntry[] = getBaseSitemapEntries();
  const seenLocs = new Set<string>(entries.map((e) => e.loc));
  const baseUrls = entries.length;

  const addUniqueEntry = (entry: SitemapEntry | null): boolean => {
    if (!entry || seenLocs.has(entry.loc)) return false;
    seenLocs.add(entry.loc);
    entries.push(entry);
    return true;
  };

  const [postsResult, adsResult, eventsResult, categoriesResult, directoryResult] =
    await Promise.allSettled([
      deps.fetchCollectionDocs('posts'),
      deps.fetchCollectionDocs('ads'),
      deps.fetchCollectionDocs('events'),
      deps.fetchCollectionDocs('categories'),
      deps.fetchCollectionDocs('directory_entries'),
    ]);

  const postsDocs = postsResult.status === 'fulfilled' ? postsResult.value : [];
  const adsDocs = adsResult.status === 'fulfilled' ? adsResult.value : [];
  const eventsDocs = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
  const categoryDocs = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const directoryDocs = directoryResult.status === 'fulfilled' ? directoryResult.value : [];

  let categoriesCount = 0;
  for (const docItem of categoryDocs) {
    const catEntries = formatCategoryDocToSitemapEntries(docItem.data);
    for (const ce of catEntries) {
      if (addUniqueEntry(ce)) {
        categoriesCount++;
      }
    }
  }

  const discoveredTags = new Map<string, string>();
  const collectTags = (data: Record<string, any>) => {
    if (!isLiveSitemapDoc(data) || !Array.isArray(data.tags)) return;
    const itemDate = toSitemapDateString(data.updatedAt || data.createdAt);
    for (const rawTag of data.tags) {
      if (typeof rawTag !== 'string') continue;
      const clean = rawTag.replace(/^#+/, '').trim();
      if (!clean) continue;
      const prev = discoveredTags.get(clean.toLowerCase());
      if (!prev || itemDate > prev) {
        discoveredTags.set(clean, itemDate);
      }
    }
  };

  let eventsCount = 0;
  for (const docItem of eventsDocs) {
    const entry = formatFirestoreDocToSitemapEntry(docItem.data, docItem.id, 'event');
    if (addUniqueEntry(entry)) {
      eventsCount++;
      collectTags(docItem.data);
    }
  }

  let adsCount = 0;
  for (const docItem of adsDocs) {
    const entry = formatFirestoreDocToSitemapEntry(docItem.data, docItem.id, 'ad');
    if (addUniqueEntry(entry)) {
      adsCount++;
      collectTags(docItem.data);
    }
  }

  let postsCount = 0;
  for (const docItem of postsDocs) {
    const postType = classifyPostType(docItem.data || {});
    const entry = formatFirestoreDocToSitemapEntry(docItem.data, docItem.id, postType);
    if (addUniqueEntry(entry)) {
      postsCount++;
      collectTags(docItem.data);
    }
  }

  let directoryCount = 0;
  for (const docItem of directoryDocs) {
    const entry = formatDirectoryDocToSitemapEntry(docItem.data, docItem.id);
    if (addUniqueEntry(entry)) {
      directoryCount++;
    }
  }

  let tagsCount = 0;
  for (const [tag, lastmod] of discoveredTags.entries()) {
    const tagEntry = formatTagToSitemapEntry(tag, lastmod);
    if (addUniqueEntry(tagEntry)) {
      tagsCount++;
    }
  }

  const xml = generateXmlFromEntries(entries);
  const etag = `"${crypto.createHash('sha1').update(xml).digest('hex')}"`;
  const newestMs = Math.max(
    computeNewestTimestamp(postsDocs),
    computeNewestTimestamp(adsDocs),
    computeNewestTimestamp(eventsDocs),
    computeNewestTimestamp(directoryDocs)
  );
  const lastModified = new Date(newestMs > 0 ? newestMs : Date.now()).toUTCString();

  const stats: SitemapCrawlStats = {
    totalUrls: entries.length,
    baseUrls,
    postsCount,
    adsCount,
    eventsCount,
    directoryCount,
    categoriesCount,
    tagsCount,
    crawledAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };

  if (deps.persistSitemapXml) {
    try {
      await deps.persistSitemapXml(xml, stats);
    } catch (err: any) {
      log.warn('[Sitemap Crawler] Failed persisting sitemap.xml to disk:', err?.message || err);
    }
  }

  return {
    xml,
    etag,
    lastModified,
    stats,
  };
}

/**
 * Manages periodic background Firestore crawling, debounced real-time invalidation,
 * deduplicated in-flight refreshes, and cached HTTP serving of sitemap.xml.
 */
export function createPeriodicSitemapManager(deps: SitemapCrawlerDeps) {
  const intervalMs =
    typeof deps.crawlIntervalMs === 'number' && deps.crawlIntervalMs >= 60_000
      ? deps.crawlIntervalMs
      : 15 * 60 * 1000;
  const log = deps.logger || console;

  let currentSnapshot: GeneratedSitemapSnapshot | null = null;
  let lastCrawlAtMs = 0;
  let inFlightPromise: Promise<GeneratedSitemapSnapshot> | null = null;
  let intervalTimer: ReturnType<typeof setInterval> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const runCrawl = async (reason: string): Promise<GeneratedSitemapSnapshot> => {
    if (inFlightPromise) {
      return inFlightPromise;
    }

    inFlightPromise = buildDynamicSitemapFromFirestore(deps)
      .then((snapshot) => {
        currentSnapshot = snapshot;
        lastCrawlAtMs = Date.now();
        log.info(
          `[Sitemap Crawler] Updated (${reason}): ${snapshot.stats.totalUrls} URLs ` +
            `(posts=${snapshot.stats.postsCount}, ads=${snapshot.stats.adsCount}, ` +
            `events=${snapshot.stats.eventsCount}, directory=${snapshot.stats.directoryCount}, ` +
            `tags=${snapshot.stats.tagsCount}) in ${snapshot.stats.durationMs}ms`
        );
        return snapshot;
      })
      .finally(() => {
        inFlightPromise = null;
      });

    return inFlightPromise;
  };

  return {
    async getSitemap(): Promise<GeneratedSitemapSnapshot> {
      const now = Date.now();
      if (currentSnapshot && now - lastCrawlAtMs < intervalMs) {
        return currentSnapshot;
      }
      return runCrawl(currentSnapshot ? 'ttl-expired' : 'on-demand');
    },

    async refreshNow(reason = 'manual'): Promise<GeneratedSitemapSnapshot> {
      return runCrawl(reason);
    },

    scheduleDebouncedRefresh(delayMs = 2500, reason = 'firestore-change'): void {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void runCrawl(reason).catch((err) => {
          log.warn('[Sitemap Crawler] Debounced refresh warning:', err?.message || err);
        });
      }, delayMs);
      if (typeof (debounceTimer as any).unref === 'function') {
        (debounceTimer as any).unref();
      }
    },

    start(): void {
      if (intervalTimer) return;

      // Initial crawl right after boot
      void runCrawl('startup').catch((err) => {
        log.warn('[Sitemap Crawler] Initial crawl warning:', err?.message || err);
      });

      intervalTimer = setInterval(() => {
        void runCrawl('scheduled').catch((err) => {
          log.warn('[Sitemap Crawler] Periodic crawl warning:', err?.message || err);
        });
      }, intervalMs);

      if (typeof (intervalTimer as any).unref === 'function') {
        (intervalTimer as any).unref();
      }
    },

    stop(): void {
      if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    },

    getStatus() {
      return {
        active: Boolean(intervalTimer),
        intervalMs,
        lastCrawlAt: lastCrawlAtMs ? new Date(lastCrawlAtMs).toISOString() : null,
        stats: currentSnapshot?.stats || null,
      };
    },
  };
}
