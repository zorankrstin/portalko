/**
 * Sitemap generator utility for Portalko (portalko.net)
 * Produces standard XML sitemaps containing all core pages,
 * feeds, categories, subcategories, and published posts from Firestore.
 */

import { DEFAULT_CATEGORIES } from '../services/categoryService';
import { slugify, SECTION_TO_SLUG, buildPostUrl } from './urlUtils';

export const SITE_URL = 'https://portalko.net';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function generateXmlFromEntries(entries: SitemapEntry[]): string {
  const xmlRows = entries.map(e => {
    let row = `  <url>\n    <loc>${escapeXml(e.loc)}</loc>`;
    if (e.lastmod) {
      row += `\n    <lastmod>${e.lastmod}</lastmod>`;
    }
    if (e.changefreq) {
      row += `\n    <changefreq>${e.changefreq}</changefreq>`;
    }
    if (e.priority !== undefined) {
      row += `\n    <priority>${e.priority.toFixed(1)}</priority>`;
    }
    row += `\n  </url>`;
    return row;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${xmlRows.join('\n')}
</urlset>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
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
    addEntry(`/${sectionSlug}/${catSlug}`, 0.8, 'daily');

    if (Array.isArray(cat.subcategories)) {
      for (const sub of cat.subcategories) {
        const subSlug = slugify(sub.name);
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
 * Builds sitemap entries for Firestore documents (events, ads, posts).
 */
export function formatFirestoreDocToSitemapEntry(
  docData: any,
  docId: string,
  type: 'event' | 'ad' | 'deal' | 'blog' | 'news' | 'post'
): SitemapEntry | null {
  if (!docData || !docData.title || docData.status === 'rejected' || docData.status === 'archived') {
    return null;
  }

  const catLower = (docData.category || '').toLowerCase();
  const catNameLower = (docData.categoryName || '').toLowerCase();
  const effectiveType = (type === 'deal' || catLower === 'deal' || catLower.startsWith('deal') || catNameLower.includes('ugodnost') || catNameLower.includes('akcij') || catNameLower.includes('popust') || catNameLower.includes('trgovin') || Boolean(docData.discount) || Boolean(docData.promoCode)) ? 'deal' : type;

  const cleanPath = buildPostUrl({
    type: effectiveType,
    id: docId,
    title: docData.title,
    category: docData.category,
    categoryName: docData.categoryName,
    subcategory: docData.subcategory,
    subcategoryName: docData.subcategoryName,
  });

  let lastmod = new Date().toISOString().split('T')[0];
  if (docData.updatedAt) {
    lastmod = new Date(docData.updatedAt).toISOString().split('T')[0];
  } else if (docData.createdAt) {
    lastmod = new Date(docData.createdAt).toISOString().split('T')[0];
  }

  return {
    loc: `${SITE_URL}${cleanPath}`,
    lastmod,
    changefreq: 'weekly',
    priority: 0.8,
  };
}
