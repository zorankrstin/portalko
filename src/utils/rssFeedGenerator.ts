/**
 * Dynamic RSS 2.0 XML Feed Generator for Portalko (portalko.net)
 * Produces standards-compliant RSS 2.0 XML with Atom self-links, Dublin Core
 * authorship, Content:Encoded full HTML bodies, and Media RSS / Enclosure tags
 * for maximum compatibility with external news aggregators and feed readers.
 */

import { buildPostUrl } from './urlUtils';
import { SITE_URL } from './sitemapGenerator';

export type SiteRssFeedType = 'all' | 'blog' | 'news';

export interface SiteRssItem {
  id: string;
  title: string;
  link: string;
  guid: string;
  description: string;
  contentHtml?: string;
  pubDate: string;
  timestampMs: number;
  author: string;
  category: string;
  categories?: string[];
  imageUrl?: string;
  itemType: 'blog' | 'news';
}

export interface GenerateSiteRssOptions {
  feedType?: SiteRssFeedType;
  selfUrl?: string;
  channelTitle?: string;
  channelDescription?: string;
  channelLink?: string;
  lastBuildDate?: string;
  maxItems?: number;
}

/**
 * Strips illegal XML 1.0 control characters and escapes special XML entities.
 */
export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  const cleaned = unsafe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.replace(/[<>&'"]/g, (c) => {
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
 * Safely wraps HTML content inside a CDATA block, splitting any embedded `]]>` sequences
 * and stripping illegal XML control characters.
 */
function wrapCdata(content: string): string {
  const cleaned = (content || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return `<![CDATA[${cleaned.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

/**
 * Converts Firestore Timestamp, ISO string, or epoch number to a valid RFC 822 UTC date string.
 */
export function toRfc822Date(value: any): { rfc822: string; timestampMs: number } {
  let date: Date | null = null;

  if (value) {
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'object' && typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (typeof value === 'object' && typeof value.seconds === 'number') {
      date = new Date(value.seconds * 1000);
    } else if (typeof value === 'number' || typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    }
  }

  if (!date || isNaN(date.getTime())) {
    date = new Date();
  }

  return {
    rfc822: date.toUTCString(),
    timestampMs: date.getTime(),
  };
}

function stripHtmlToPlainText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateAtWordBoundary(text: string, maxLength = 360): string {
  if (!text || text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  const base = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${base.trim()}…`;
}

/**
 * Cleans HTML body for RSS `<content:encoded>`: removes scripts, inline base64 data URIs
 * (which break external RSS aggregators), and optionally prepends a cover image.
 */
function sanitizeHtmlForFeed(rawHtml: string, coverImageUrl?: string, title?: string): string {
  let html = (rawHtml || '').trim();
  // Strip script/style blocks and inline data:image payloads to keep feed XML lightweight & valid
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<img[^>]+src=["']data:[^"']*["'][^>]*>/gi, '')
    .trim();

  // If plain text without block tags, wrap paragraphs cleanly
  if (html && !/<(p|h[1-6]|div|ul|ol|blockquote|figure)\b/i.test(html)) {
    const paragraphs = html
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${escapeXml(p).replace(/\n/g, '<br />')}</p>`);
    html = paragraphs.join('\n');
  }

  if (coverImageUrl && !html.includes(coverImageUrl)) {
    const alt = escapeXml(title || 'Portalko');
    const safeImg = coverImageUrl.replace(/"/g, '%22').replace(/[\r\n<>]/g, '');
    html = `<figure><img src="${safeImg}" alt="${alt}" /></figure>\n${html}`;
  }

  return html;
}

function resolveHttpImageUrl(docData: any): string | undefined {
  const candidates: unknown[] = [
    docData?.imageUrl,
    ...(Array.isArray(docData?.images) ? docData.images : []),
    ...(Array.isArray(docData?.imageUrls) ? docData.imageUrls : []),
  ];

  for (const cand of candidates) {
    if (typeof cand === 'string') {
      const trimmed = cand.trim();
      if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function guessImageMimeType(url: string): string {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

/**
 * Determines whether a Firestore `posts` document is a published news item or blog post
 * (filtering out drafts, pending items, rejected/archived posts, and deals/classifieds).
 */
export function formatFirestoreDocToRssItem(
  docData: any,
  docId: string,
  feedFilter: SiteRssFeedType = 'all'
): SiteRssItem | null {
  if (!docData || !docData.title) return null;

  // Strictly include published posts only (exclude drafts 'osnutek', pending, rejected, archived)
  const status = typeof docData.status === 'string' ? docData.status.toLowerCase().trim() : '';
  if (status && status !== 'published' && status !== 'active') {
    return null;
  }

  const rawType = typeof docData.type === 'string' ? docData.type.toLowerCase().trim() : '';
  const catLower = (docData.category || '').toLowerCase();
  const catNameLower = (docData.categoryName || '').toLowerCase();

  const isDeal =
    rawType === 'deal' ||
    catLower === 'deal' ||
    catLower.startsWith('deal') ||
    /ugodnost|akcij|popust|trgovin|hrana/i.test(catNameLower) ||
    Boolean(docData.discount) ||
    Boolean(docData.promoCode);

  if (isDeal || rawType === 'ad' || rawType === 'event') {
    return null;
  }

  const itemType: 'blog' | 'news' = rawType === 'news' ? 'news' : 'blog';
  if (feedFilter === 'blog' && itemType !== 'blog') return null;
  if (feedFilter === 'news' && itemType !== 'news') return null;

  const cleanPath = buildPostUrl({
    type: itemType,
    id: docId,
    title: docData.title,
    category: docData.category,
    categoryName: docData.categoryName,
    subcategory: docData.subcategory,
    subcategoryName: docData.subcategoryName,
  });

  const link = `${SITE_URL}${cleanPath}`;
  const title = stripHtmlToPlainText(String(docData.title));
  if (!title) return null;

  const rawBody = String(docData.content || docData.description || docData.subtitle || '');
  const cleanSubtitle = typeof docData.subtitle === 'string' ? stripHtmlToPlainText(docData.subtitle) : '';
  const cleanBodyText = stripHtmlToPlainText(rawBody);
  const plainSummarySource = cleanSubtitle
    ? `${cleanSubtitle}${/[.!?…]$/.test(cleanSubtitle) ? '' : '.'}${cleanBodyText ? ` ${cleanBodyText}` : ''}`
    : cleanBodyText;
  const summary = truncateAtWordBoundary(plainSummarySource || title, 360);

  const imageUrl = resolveHttpImageUrl(docData);
  const contentHtml = sanitizeHtmlForFeed(rawBody || `<p>${escapeXml(summary)}</p>`, imageUrl, title);

  const dateSource = docData.publishedAt || docData.createdAt || docData.updatedAt;
  const { rfc822, timestampMs } = toRfc822Date(dateSource);

  const primaryCategory =
    String(docData.categoryName || docData.category || (itemType === 'news' ? 'Novice' : 'Blog')).trim() ||
    (itemType === 'news' ? 'Novice' : 'Blog');

  const categories = new Set<string>([primaryCategory]);
  if (docData.subcategoryName || docData.subcategory) {
    const sub = String(docData.subcategoryName || docData.subcategory).trim();
    if (sub) categories.add(sub);
  }
  if (Array.isArray(docData.tags)) {
    for (const t of docData.tags) {
      if (typeof t === 'string' && t.trim()) categories.add(t.trim());
    }
  }

  return {
    id: docId,
    title,
    link,
    guid: link,
    description: summary,
    contentHtml,
    pubDate: rfc822,
    timestampMs,
    author: String(docData.authorName || 'Portalko').trim() || 'Portalko',
    category: primaryCategory,
    categories: Array.from(categories),
    imageUrl,
    itemType,
  };
}

/**
 * Generates a full W3C-compliant RSS 2.0 XML document from normalized RSS items.
 */
export function generateSiteRssXml(
  rawItems: SiteRssItem[],
  options: GenerateSiteRssOptions = {}
): string {
  const {
    feedType = 'all',
    selfUrl = `${SITE_URL}/rss.xml`,
    maxItems = 60,
  } = options;

  const defaultTitle =
    feedType === 'blog'
      ? 'Portalko – Blog in zgodbe skupnosti'
      : feedType === 'news'
      ? 'Portalko – Aktualne novice'
      : 'Portalko – Novice in Blog';

  const defaultDesc =
    feedType === 'blog'
      ? 'Najnovejši avtorski blog zapisi, potopisi, vodiči in razmišljanja skupnosti na portalu Portalko.net.'
      : feedType === 'news'
      ? 'Sveže novice in aktualno dogajanje iz Slovenije in sveta na portalu Portalko.net.'
      : 'Samodejno posodobljen vir najnovejših novic in blog objav na slovenskem portalu Portalko.net.';

  const defaultLink =
    feedType === 'blog'
      ? `${SITE_URL}/blog`
      : feedType === 'news'
      ? `${SITE_URL}/novice`
      : SITE_URL;

  const channelTitle = options.channelTitle || defaultTitle;
  const channelDescription = options.channelDescription || defaultDesc;
  const channelLink = options.channelLink || defaultLink;

  // Sort newest-first and deduplicate by link/guid
  const seenGuids = new Set<string>();
  const sortedItems = [...rawItems]
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .filter((item) => {
      if (seenGuids.has(item.guid)) return false;
      seenGuids.add(item.guid);
      return true;
    })
    .slice(0, maxItems);

  const newestTimestamp = sortedItems.length > 0 ? sortedItems[0].timestampMs : Date.now();
  const buildDate = options.lastBuildDate || new Date(newestTimestamp).toUTCString();

  const itemsXml = sortedItems
    .map((item) => {
      const catTags = (item.categories && item.categories.length > 0 ? item.categories : [item.category])
        .map((cat) => `      <category>${escapeXml(cat)}</category>`)
        .join('\n');

      const mediaBlock = item.imageUrl
        ? `\n      <enclosure url="${escapeXml(item.imageUrl)}" length="0" type="${guessImageMimeType(item.imageUrl)}" />\n      <media:content url="${escapeXml(item.imageUrl)}" medium="image" />\n      <media:thumbnail url="${escapeXml(item.imageUrl)}" />`
        : '';

      const contentBlock = item.contentHtml
        ? `\n      <content:encoded>${wrapCdata(item.contentHtml)}</content:encoded>`
        : '';

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
      <dc:creator>${escapeXml(item.author)}</dc:creator>
${catTags}
      <description>${escapeXml(item.description)}</description>${contentBlock}${mediaBlock}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>sl-SI</language>
    <copyright>Copyright ${new Date().getFullYear()} Portalko.net</copyright>
    <ttl>15</ttl>
    <generator>Portalko Dynamic RSS Engine</generator>
    <lastBuildDate>${escapeXml(buildDate)}</lastBuildDate>
    <pubDate>${escapeXml(buildDate)}</pubDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
    <image>
      <url>${escapeXml(`${SITE_URL}/favicon.png`)}</url>
      <title>${escapeXml(channelTitle)}</title>
      <link>${escapeXml(channelLink)}</link>
    </image>
${itemsXml}
  </channel>
</rss>`;
}
