/**
 * Sitemap generator utility for Portalko (portalko.net)
 * Produces standard XML sitemaps (with Google Image Sitemap extensions) containing
 * all core pages, feeds, categories, subcategories, tags, and live Firestore posts, ads,
 * events, and directory listings.
 */

import { DEFAULT_CATEGORIES } from '../services/categoryService';
import { slugify, SECTION_TO_SLUG, buildPostUrl, buildTagUrl } from './urlUtils';

export const SITE_URL = 'https://portalko.net';

export interface SitemapImageEntry {
  loc: string;
  title?: string;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: SitemapImageEntry[];
}

const NON_LIVE_STATUSES = new Set([
  'rejected',
  'archived',
  'osnutek',
  'draft',
  'pending',
  'sold',
  'closed',
  'expired',
  'deleted',
]);

/**
 * Safely converts Firestore Timestamps, numbers, or date strings to YYYY-MM-DD.
 */
export function toSitemapDateString(value?: unknown, fallbackToday?: string): string {
  const today = fallbackToday || new Date().toISOString().split('T')[0];
  if (!value) return today;

  try {
    let dateObj: Date | null = null;

    if (value instanceof Date) {
      dateObj = value;
    } else if (typeof value === 'object' && value !== null) {
      const anyVal = value as any;
      if (typeof anyVal.toDate === 'function') {
        dateObj = anyVal.toDate();
      } else if (typeof anyVal.seconds === 'number') {
        dateObj = new Date(anyVal.seconds * 1000);
      } else if (typeof anyVal._seconds === 'number') {
        dateObj = new Date(anyVal._seconds * 1000);
      }
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      dateObj = new Date(value > 1e12 ? value : value * 1000);
    } else if (typeof value === 'string' && value.trim()) {
      const parsed = Date.parse(value.trim());
      if (!Number.isNaN(parsed)) {
        dateObj = new Date(parsed);
      }
    }

    if (dateObj && !Number.isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  } catch {
    // Fall back to today
  }

  return today;
}

/**
 * Returns true if a Firestore document represents live, publicly indexable content.
 */
export function isLiveSitemapDoc(docData: any): boolean {
  if (!docData || typeof docData !== 'object') return false;
  if (docData.published === false || docData.isPublished === false) return false;
  if (docData.deleted === true || docData.isDeleted === true) return false;

  const status = typeof docData.status === 'string' ? docData.status.trim().toLowerCase() : '';
  if (status && NON_LIVE_STATUSES.has(status)) {
    return false;
  }

  return true;
}

function isValidHttpImageUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  return (trimmed.startsWith('https://') || trimmed.startsWith('http://')) && trimmed.length <= 2048;
}

export function extractSitemapImages(docData: any, title: string): SitemapImageEntry[] {
  if (!docData || typeof docData !== 'object') return [];

  const candidates: string[] = [];
  const primaryFields = [
    docData.imageUrl,
    docData.featuredImage,
    docData.coverImage,
    docData.heroImage,
    docData.photoUrl,
    docData.bannerUrl,
    docData.thumbnailUrl,
    docData.image,
  ];
  for (const c of primaryFields) {
    if (isValidHttpImageUrl(c)) candidates.push(c.trim());
  }

  if (Array.isArray(docData.images)) {
    for (const img of docData.images) {
      if (isValidHttpImageUrl(img)) candidates.push(img.trim());
    }
  }

  if (Array.isArray(docData.imageUrls)) {
    for (const img of docData.imageUrls) {
      if (isValidHttpImageUrl(img)) candidates.push(img.trim());
    }
  }

  if (Array.isArray(docData.attachments)) {
    for (const att of docData.attachments) {
      if (att && isValidHttpImageUrl(att.url)) {
        const ct = String(att.contentType || '').toLowerCase();
        if (!ct || ct.startsWith('image/')) {
          candidates.push(att.url.trim());
        }
      }
    }
  }

  const unique: SitemapImageEntry[] = [];
  const seen = new Set<string>();
  for (const loc of candidates) {
    if (!seen.has(loc)) {
      seen.add(loc);
      unique.push({ loc, title });
      if (unique.length >= 3) break;
    }
  }
  return unique;
}

export function generateXmlFromEntries(entries: SitemapEntry[]): string {
  const xmlRows = entries.map(e => {
    let row = `  <url>\n    <loc>${escapeXml(e.loc)}</loc>`;
    if (e.lastmod) {
      row += `\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>`;
    }
    if (e.changefreq) {
      row += `\n    <changefreq>${e.changefreq}</changefreq>`;
    }
    if (e.priority !== undefined) {
      row += `\n    <priority>${e.priority.toFixed(1)}</priority>`;
    }
    if (Array.isArray(e.images) && e.images.length > 0) {
      for (const img of e.images) {
        if (!isValidHttpImageUrl(img.loc)) continue;
        row += `\n    <image:image>\n      <image:loc>${escapeXml(img.loc)}</image:loc>`;
        if (img.title) {
          row += `\n      <image:title>${escapeXml(img.title)}</image:title>`;
        }
        row += `\n    </image:image>`;
      }
    }
    row += `\n  </url>`;
    return row;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${xmlRows.join('\n')}
</urlset>`;
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Builds the static base entries for Portalko:
 * Homepage, main feeds, categories, subcategories, and policy pages.
 */
export function getBaseSitemapEntries(): SitemapEntry[] {
  const today = new Date().toISOString().split('T')[0];
  const entries: SitemapEntry[] = [];
  const seenLocs = new Set<string>();

  const addEntry = (loc: string, priority: number, changefreq: SitemapEntry['changefreq']) => {
    const fullLoc = loc.startsWith('http') ? loc : `${SITE_URL}${loc.startsWith('/') ? '' : '/'}${loc}`;
    if (!seenLocs.has(fullLoc)) {
      seenLocs.add(fullLoc);
      entries.push({
        loc: fullLoc,
        lastmod: today,
        changefreq,
        priority,
      });
    }
  };

  // 1. Homepage
  addEntry('/', 1.0, 'daily');

  // 2. Primary Feeds
  addEntry('/novice', 0.9, 'hourly');
  addEntry('/mali-oglasi', 0.9, 'hourly');
  addEntry('/dogodki', 0.9, 'hourly');
  addEntry('/akcije', 0.9, 'hourly');
  addEntry('/blog', 0.8, 'daily');
  addEntry('/imenik', 0.8, 'daily');

  // 3. News Categories
  const newsCategories = [
    'slovenija', 'svet', 'gospodarstvo', 'sport',
    'kultura', 'tehnologija', 'zanimivosti', 'zdravje', 'okolje', 'lokalno'
  ];
  for (const cat of newsCategories) {
    addEntry(`/novice/${cat}`, 0.7, 'daily');
  }

  // 4. Default Categories & Subcategories across Mali Oglasi, Dogodki, Blog, Akcije
  for (const cat of DEFAULT_CATEGORIES) {
    const sectionSlug = SECTION_TO_SLUG[cat.section] || cat.section;
    const catSlug = slugify(cat.name);
    if (!catSlug) continue;
    addEntry(`/${sectionSlug}/${catSlug}`, 0.8, 'daily');

    if (Array.isArray(cat.subcategories)) {
      for (const sub of cat.subcategories) {
        const subSlug = slugify(sub.name);
        if (!subSlug) continue;
        addEntry(`/${sectionSlug}/${catSlug}/${subSlug}`, 0.7, 'daily');
      }
    }
  }

  // 5. Informational & Legal Pages
  addEntry('/o-nas', 0.5, 'monthly');
  addEntry('/pogoji-uporabe', 0.5, 'monthly');
  addEntry('/zasebnost', 0.5, 'monthly');
  addEntry('/kontakt', 0.5, 'monthly');
  addEntry('/pravila-objavljanja', 0.5, 'monthly');

  return entries;
}

/**
 * Builds sitemap entries for custom/live Firestore category documents.
 */
export function formatCategoryDocToSitemapEntries(catData: any): SitemapEntry[] {
  if (!catData || !catData.name || !catData.section) return [];
  const sectionSlug = SECTION_TO_SLUG[catData.section] || slugify(catData.section);
  const catSlug = slugify(catData.name);
  if (!sectionSlug || !catSlug) return [];

  const lastmod = toSitemapDateString(catData.updatedAt || catData.createdAt);
  const results: SitemapEntry[] = [
    {
      loc: `${SITE_URL}/${sectionSlug}/${catSlug}`,
      lastmod,
      changefreq: 'daily',
      priority: 0.8,
    },
  ];

  if (Array.isArray(catData.subcategories)) {
    for (const sub of catData.subcategories) {
      const subSlug = slugify(sub?.name);
      if (!subSlug) continue;
      results.push({
        loc: `${SITE_URL}/${sectionSlug}/${catSlug}/${subSlug}`,
        lastmod,
        changefreq: 'daily',
        priority: 0.7,
      });
    }
  }

  return results;
}

/**
 * Builds sitemap entries for live Firestore documents (events, ads, posts).
 */
export function formatFirestoreDocToSitemapEntry(
  docData: any,
  docId: string,
  type: 'event' | 'ad' | 'deal' | 'blog' | 'news' | 'post'
): SitemapEntry | null {
  if (!isLiveSitemapDoc(docData) || !docData.title) {
    return null;
  }

  const catLower = String(docData.category || '').toLowerCase();
  const catNameLower = String(docData.categoryName || '').toLowerCase();
  const effectiveType =
    type === 'deal' ||
    catLower === 'deal' ||
    catLower.startsWith('deal') ||
    catNameLower.includes('ugodnost') ||
    catNameLower.includes('akcij') ||
    catNameLower.includes('popust') ||
    catNameLower.includes('trgovin') ||
    Boolean(docData.discount) ||
    Boolean(docData.promoCode)
      ? 'deal'
      : type;

  const cleanPath = buildPostUrl({
    type: effectiveType,
    id: docId,
    title: docData.title,
    category: docData.category,
    categoryName: docData.categoryName,
    subcategory: docData.subcategory,
    subcategoryName: docData.subcategoryName,
  });

  const lastmod = toSitemapDateString(docData.updatedAt || docData.createdAt);
  const ageDays = Math.max(0, (Date.now() - Date.parse(lastmod)) / (1000 * 60 * 60 * 24));
  const isFresh = Number.isFinite(ageDays) && ageDays <= 7;
  const images = extractSitemapImages(docData, String(docData.title));

  return {
    loc: `${SITE_URL}${cleanPath}`,
    lastmod,
    changefreq: isFresh ? 'daily' : 'weekly',
    priority: isFresh ? 0.9 : 0.8,
    ...(images.length > 0 ? { images } : {}),
  };
}

/**
 * Builds a sitemap entry for a live Imenik (directory) business/site entry.
 */
export function formatDirectoryDocToSitemapEntry(
  docData: any,
  docId: string
): SitemapEntry | null {
  if (!isLiveSitemapDoc(docData)) return null;
  if (docData.isSuggestion === true && docData.status !== 'published') return null;

  const title = String(docData.name || docData.title || '').trim();
  if (!title) return null;

  const slug = slugify(docData.slug || title) || docId;
  const lastmod = toSitemapDateString(docData.updatedAt || docData.createdAt);
  const images = extractSitemapImages(docData, title);

  return {
    loc: `${SITE_URL}/imenik/${slug}`,
    lastmod,
    changefreq: 'weekly',
    priority: 0.7,
    ...(images.length > 0 ? { images } : {}),
  };
}

/**
 * Builds a sitemap entry for a tag archive page (/oznaka/:tagSlug).
 */
export function formatTagToSitemapEntry(tag: string, lastmod?: string): SitemapEntry | null {
  const clean = String(tag || '').replace(/^#+/, '').trim();
  if (clean.length < 2 || clean.length > 48) return null;
  const tagPath = buildTagUrl(clean);
  if (!tagPath || tagPath === '/oznaka') return null;

  return {
    loc: `${SITE_URL}${tagPath}`,
    lastmod: lastmod || new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.6,
  };
}
