import { slugify } from '../utils/urlUtils';

export type OgCollectionName = 'posts' | 'ads' | 'events' | 'directory';

export interface CachedOgDoc {
  id: string;
  data: Record<string, any>;
}

export interface ResolvedOgMetadata {
  title: string;
  description: string;
  ogType: 'website' | 'article';
  canonicalUrl: string;
  image: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  isFeaturedImage: boolean;
}

export interface OgLookupDeps {
  siteUrl: string;
  portalFallbackImage?: string;
  getCollectionDocs: (colName: OgCollectionName) => Promise<CachedOgDoc[]>;
  rehydrateShardedDoc?: (
    colName: OgCollectionName,
    docId: string,
    data: Record<string, any>
  ) => Promise<Record<string, any>>;
  resolveExternalEmbedImage?: (externalUrl: string) => Promise<string | null>;
}

const SOCIAL_PREVIEW_CRAWLER_REGEX =
  /(facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|twitterbot|linkedinbot|whatsapp|viber|telegrambot|discordbot|slackbot|pinterest|skypeuripreview|redditbot|snapchat|applebot)/i;

/**
 * Detects social media preview scrapers (Facebook, Meta, X, WhatsApp, LinkedIn, etc.)
 * that do not execute client-side JavaScript and require server pre-rendered OpenGraph HTML.
 */
export function isSocialPreviewCrawler(userAgent?: string | null): boolean {
  if (!userAgent || typeof userAgent !== 'string') return false;
  return SOCIAL_PREVIEW_CRAWLER_REGEX.test(userAgent);
}

export function escapeHtmlAttr(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function cleanServerHtmlText(raw: string, maxLen = 200): string {
  if (!raw) return '';
  const decoded = String(raw)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|td|th|blockquote|br)[^>]*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '...')
    .replace(/\s+/g, ' ')
    .trim();

  if (maxLen > 0 && decoded.length > maxLen) {
    const sliced = decoded.slice(0, maxLen - 3);
    const lastSpace = sliced.lastIndexOf(' ');
    return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}...`;
  }
  return decoded;
}

export function normalizeHttpOrOriginImageUrl(src: string, origin: string): string | null {
  const trimmed = (src || '').trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return null;
  }
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }
  return null;
}

export function extractFirstInlineImageSrc(htmlSources: Array<string | undefined>): string | null {
  for (const rawHtml of htmlSources) {
    if (!rawHtml || typeof rawHtml !== 'string') continue;
    const imgMatches = rawHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    for (const m of imgMatches) {
      const candidate = (m[1] || '').trim();
      if (candidate) return candidate;
    }
  }
  return null;
}

export function extractFirstYouTubeThumbnail(sources: Array<string | undefined>): string | null {
  const ytRegex =
    /(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  for (const src of sources) {
    if (!src || typeof src !== 'string') continue;
    const match = src.match(ytRegex);
    if (match && match[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return null;
}

export function extractFirstDataImageUri(data: Record<string, any> | null | undefined): string | null {
  if (!data) return null;
  const attachmentImage = Array.isArray(data.attachments)
    ? data.attachments.find((a: any) => typeof a?.url === 'string' && a.url.trim().startsWith('data:image/'))?.url
    : undefined;

  const coverCandidates = [
    data.imageUrl,
    data.featuredImage,
    data.coverImage,
    data.heroImage,
    data.photoUrl,
    data.bannerUrl,
    data.thumbnailUrl,
    data.logoUrl,
    data.image,
    data.thumbnail,
    attachmentImage,
    ...(Array.isArray(data.images) ? data.images : []),
    ...(Array.isArray(data.imageUrls) ? data.imageUrls : []),
  ];

  for (const c of coverCandidates) {
    if (typeof c === 'string' && c.trim().startsWith('data:image/')) {
      return c.trim();
    }
  }

  const inlineSrc = extractFirstInlineImageSrc([data.content, data.richContent, data.description]);
  if (inlineSrc && inlineSrc.startsWith('data:image/')) {
    return inlineSrc;
  }
  return null;
}

export function guessImageMimeTypeFromUrl(url: string): string | undefined {
  const lower = (url || '').split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return undefined;
}

export function resolveBestOgImageUrl(
  colName: OgCollectionName,
  docId: string,
  data: Record<string, any> | null | undefined,
  origin: string
): string | null {
  if (!data) return null;

  const attachmentImage = Array.isArray(data.attachments)
    ? data.attachments.find(
        (a: any) =>
          typeof a?.url === 'string' &&
          (String(a?.contentType || '').startsWith('image/') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(a.url))
      )?.url
    : undefined;

  const coverCandidates = [
    data.imageUrl,
    data.featuredImage,
    data.coverImage,
    data.heroImage,
    data.photoUrl,
    data.bannerUrl,
    data.thumbnailUrl,
    data.logoUrl,
    ...(Array.isArray(data.images) ? data.images : []),
    ...(Array.isArray(data.imageUrls) ? data.imageUrls : []),
    data.image,
    data.thumbnail,
    attachmentImage,
  ];

  let foundDataUri = false;
  for (const cand of coverCandidates) {
    if (typeof cand !== 'string' || !cand.trim()) continue;
    const trimmed = cand.trim();
    if (trimmed.startsWith('data:image/')) {
      foundDataUri = true;
      continue;
    }
    const normalized = normalizeHttpOrOriginImageUrl(trimmed, origin);
    if (normalized && !normalized.endsWith('/favicon.png')) {
      return normalized;
    }
  }

  // 2. First inline <img> inside HTML content / richContent / description
  const inlineSrc = extractFirstInlineImageSrc([data.content, data.richContent, data.description]);
  if (inlineSrc) {
    if (inlineSrc.startsWith('data:image/')) {
      foundDataUri = true;
    } else {
      const normalized = normalizeHttpOrOriginImageUrl(inlineSrc, origin);
      if (normalized && !normalized.endsWith('/favicon.png')) {
        return normalized;
      }
    }
  }

  // 3. YouTube embed / video link thumbnail
  const ytThumb = extractFirstYouTubeThumbnail([
    data.content,
    data.richContent,
    data.description,
    data.embedCode,
    data.videoUrl,
    data.url,
  ]);
  if (ytThumb) {
    return ytThumb;
  }

  // 4. Serve base64 data:image/... via binary /api/og-image proxy so Facebook accepts it
  if (foundDataUri) {
    return `${origin}/api/og-image/${colName}/${encodeURIComponent(docId)}`;
  }

  return null;
}

export function extractExternalUrlCandidateFromDoc(
  colName: OgCollectionName,
  data: Record<string, any> | null | undefined
): string | null {
  if (!data || (colName !== 'ads' && colName !== 'posts' && colName !== 'events')) return null;

  const isPublicNonPortalUrl = (raw?: string): string | null => {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!/^https?:\/\//i.test(trimmed)) return null;
    const lower = trimmed.toLowerCase();
    if (lower.includes('portalko.net')) return null;
    return trimmed;
  };

  const explicit = [data.externalUrl, data.dealLink, data.link, data.ticketUrl]
    .map((v) => isPublicNonPortalUrl(v))
    .find(Boolean);
  if (explicit) return explicit;

  const embedRaw = typeof data.embedCode === 'string' ? data.embedCode.trim() : '';
  if (!embedRaw) return null;

  if (!embedRaw.includes('<') && /^https?:\/\/[^\s]+$/i.test(embedRaw)) {
    return isPublicNonPortalUrl(embedRaw);
  }

  const igMatch = embedRaw.match(/data-instgrm-permalink=["']([^"']+)["']/i);
  if (igMatch?.[1]) {
    const valid = isPublicNonPortalUrl(igMatch[1]);
    if (valid) return valid;
  }

  const citeMatch = embedRaw.match(/\bcite=["']([^"']+)["']/i);
  if (citeMatch?.[1]) {
    const valid = isPublicNonPortalUrl(citeMatch[1]);
    if (valid) return valid;
  }

  const iframeSrcMatch = embedRaw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeSrcMatch?.[1]) {
    const fbHref = iframeSrcMatch[1].match(/[?&]href=([^&]+)/i);
    if (fbHref?.[1]) {
      try {
        const decoded = decodeURIComponent(fbHref[1]);
        const valid = isPublicNonPortalUrl(decoded);
        if (valid) return valid;
      } catch {
        // ignore decode error
      }
    }
    const valid = isPublicNonPortalUrl(iframeSrcMatch[1]);
    if (valid) return valid;
  }

  const hrefMatches = Array.from(embedRaw.matchAll(/<a[^>]+href=["']([^"']+)["']/gi));
  for (let i = hrefMatches.length - 1; i >= 0; i--) {
    const valid = isPublicNonPortalUrl(hrefMatches[i]?.[1]);
    if (valid) return valid;
  }

  return null;
}

export function findBestOgDocMatch(
  docs: CachedOgDoc[],
  rawTarget: string,
  targetSlug: string
): CachedOgDoc | null {
  if (!docs || docs.length === 0 || (!rawTarget && !targetSlug)) return null;

  const cleanTarget = rawTarget.trim();
  const cleanTargetLower = cleanTarget.toLowerCase();
  const strippedTargetId = cleanTargetLower.replace(/^(event|ad|deal|blog|post|dir)-/i, '');

  const isPublishedDoc = (d: CachedOgDoc) => {
    const st = typeof d.data?.status === 'string' ? d.data.status.toLowerCase().trim() : '';
    return !st || st === 'published' || st === 'active' || st === 'approved';
  };

  const scoreMatch = (d: CachedOgDoc): number => {
    const data = d.data || {};
    const docIdLower = d.id.toLowerCase();
    const docIdStripped = docIdLower.replace(/^(event|ad|deal|blog|post|dir)-/i, '');

    if (d.id === cleanTarget || docIdLower === cleanTargetLower || docIdStripped === strippedTargetId) {
      return isPublishedDoc(d) ? 100 : 50;
    }

    if (targetSlug) {
      const customSlug = slugify(data.slug);
      const titleSlug = slugify(data.title || data.name);
      if (customSlug && customSlug === targetSlug) {
        return isPublishedDoc(d) ? 95 : 45;
      }
      if (titleSlug && titleSlug === targetSlug) {
        return isPublishedDoc(d) ? 90 : 40;
      }
      // Partial slug tolerance for long slugs truncated by messengers
      if (titleSlug && targetSlug.length >= 12 && (titleSlug.startsWith(targetSlug) || targetSlug.startsWith(titleSlug))) {
        return isPublishedDoc(d) ? 75 : 35;
      }
    }

    return 0;
  };

  let bestDoc: CachedOgDoc | null = null;
  let bestScore = 0;

  for (const docItem of docs) {
    const score = scoreMatch(docItem);
    if (score > bestScore) {
      bestScore = score;
      bestDoc = docItem;
      if (score === 100) break;
    }
  }

  return bestDoc;
}

export async function resolveOgMetadataFromLookup(
  rawRequestUrl: string,
  origin: string,
  deps: OgLookupDeps
): Promise<ResolvedOgMetadata> {
  const defaultTitle = 'Portalko – Slovenski portal za novice, male oglase in dogodke';
  const defaultDesc =
    'Portalko je osrednji slovenski spletni portal za novice, brezplačne male oglase, lokalne dogodke, ugodnosti in popuste ter skupnost po vsej Sloveniji.';
  const portalFallback =
    (deps.portalFallbackImage && normalizeHttpOrOriginImageUrl(deps.portalFallbackImage, origin)) ||
    `${origin}/favicon.png`;

  const parsedUrl = new URL(rawRequestUrl || '/', origin);

  let effectivePath = parsedUrl.pathname || '/';
  let effectiveSearch = parsedUrl.searchParams;

  const spaRouteParam = parsedUrl.searchParams.get('spa_route');
  if (spaRouteParam) {
    try {
      const spaParsed = new URL(decodeURIComponent(spaRouteParam), origin);
      effectivePath = spaParsed.pathname || '/';
      effectiveSearch = spaParsed.searchParams;
    } catch {
      effectivePath = decodeURIComponent(spaRouteParam);
    }
  }

  if (effectivePath.startsWith('/amp/')) {
    effectivePath = effectivePath.replace(/^\/amp/, '') || '/';
  } else if (effectivePath === '/amp') {
    effectivePath = '/';
  }

  const pathname = effectivePath.replace(/\/+$/, '') || '/';
  const canonicalUrl = `${origin}${pathname === '/' ? '' : pathname}`;
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s).trim();
      } catch {
        return s.trim();
      }
    });

  // 1. Directory (?imenik=... or /imenik/:slug)
  const imenikParam = effectiveSearch.get('imenik')?.trim();
  if (imenikParam || (segments[0]?.toLowerCase() === 'imenik' && segments.length >= 2)) {
    const targetRaw = imenikParam || segments[segments.length - 1];
    const targetSlug = slugify(targetRaw);
    const dirDocs = await deps.getCollectionDocs('directory');
    const matched = findBestOgDocMatch(dirDocs, targetRaw, targetSlug);
    if (matched) {
      const d = matched.data || {};
      const loc = (d.location || '').trim();
      const seoTitle = d.seoTitle?.trim()
        ? cleanServerHtmlText(d.seoTitle, 120)
        : `${d.name || 'Imenik'}${loc ? ` (${loc})` : ''}${d.categoryName ? ` – ${d.categoryName}` : ''} | Imenik Portalko`;
      const plainSummary = cleanServerHtmlText(d.richContent || d.description || '', 165);
      const seoDesc = d.metaDescription?.trim()
        ? cleanServerHtmlText(d.metaDescription, 180)
        : plainSummary || `Preverite podjetje ${d.name || ''} v slovenskem spletnem imeniku Portalko.`;
      const featuredImg = resolveBestOgImageUrl('directory', matched.id, d, origin);
      const dirCanonical = imenikParam
        ? `${origin}/?imenik=${encodeURIComponent(d.slug || matched.id)}`
        : canonicalUrl;

      return {
        title: seoTitle,
        description: seoDesc,
        ogType: 'article',
        canonicalUrl: dirCanonical,
        image: featuredImg || portalFallback,
        imageAlt: d.name || seoTitle,
        imageWidth: featuredImg ? 1200 : undefined,
        imageHeight: featuredImg ? 630 : undefined,
        imageType: featuredImg ? guessImageMimeTypeFromUrl(featuredImg) : 'image/png',
        section: d.categoryName || 'Imenik',
        isFeaturedImage: Boolean(featuredImg),
      };
    }
  }

  // 2. Direct ID query lookup (?post=, ?id=) or /share/:type/:slug OR multi-segment content URLs
  const queryIdTarget = (effectiveSearch.get('post') || effectiveSearch.get('id') || '').trim();
  const isShareProxyPath = segments[0]?.toLowerCase() === 'share' && segments.length >= 2;
  const shouldLookupPost = Boolean(queryIdTarget) || isShareProxyPath || segments.length >= 2;

  if (shouldLookupPost) {
    const section = isShareProxyPath
      ? (segments[1] || '').toLowerCase()
      : (segments[0] || '').toLowerCase();
    const lastSegment = queryIdTarget || segments[segments.length - 1] || '';
    const lastSlug = slugify(lastSegment);

    const isKnownListingTwoSeg =
      !queryIdTarget &&
      !isShareProxyPath &&
      segments.length === 2 &&
      section === 'novice' &&
      ['slovenija', 'svet', 'gospodarstvo', 'sport', 'kultura', 'tehnologija'].includes(lastSegment.toLowerCase());

    if (
      !isKnownListingTwoSeg &&
      !['oznaka', 'oznake', 'tag', 'tags', 'avtor', 'profil', 'profile'].includes(section)
    ) {
      const collectionOrder: OgCollectionName[] =
        section === 'mali-oglasi' || section === 'oglasi' || section === 'ads' || section === 'ad'
          ? ['ads', 'posts']
          : section === 'dogodki' || section === 'prireditve' || section === 'events' || section === 'event'
          ? ['events', 'posts']
          : section === 'imenik' || section === 'directory'
          ? ['directory', 'posts']
          : ['posts', 'ads', 'events', 'directory'];

      for (const colName of collectionOrder) {
        const docs = await deps.getCollectionDocs(colName);
        const matched = findBestOgDocMatch(docs, lastSegment, lastSlug);
        if (matched) {
          let data = matched.data || {};
          if (
            data.hasChunkedContent &&
            deps.rehydrateShardedDoc &&
            !resolveBestOgImageUrl(colName, matched.id, data, origin)
          ) {
            data = await deps.rehydrateShardedDoc(colName, matched.id, data);
          }

          const rawItemTitle =
            cleanServerHtmlText(data.seoTitle || data.title || data.name || '', 120) || 'Objava';
          const catLabel = cleanServerHtmlText(data.categoryName || '', 40);
          const fullTitle = data.seoTitle?.trim()
            ? cleanServerHtmlText(data.seoTitle, 120)
            : catLabel && !rawItemTitle.toLowerCase().includes(catLabel.toLowerCase())
            ? `${rawItemTitle} – ${catLabel} | Portalko`
            : `${rawItemTitle} | Portalko`;

          const highlightParts: string[] = [];
          if (data.price) highlightParts.push(`Cena: ${data.price}`);
          if (data.discount) highlightParts.push(`Popust: ${data.discount}`);
          if (data.location || data.city) highlightParts.push(String(data.location || data.city));

          const rawBodySummary = cleanServerHtmlText(
            data.metaDescription ||
              data.seoMetaDescription ||
              data.subtitle ||
              data.description ||
              data.content ||
              data.richContent ||
              '',
            180
          );

          let fullDesc = rawBodySummary;
          if (!data.metaDescription && !data.seoMetaDescription && highlightParts.length > 0) {
            const prefix = highlightParts.join(' • ');
            fullDesc = fullDesc ? cleanServerHtmlText(`${prefix} — ${fullDesc}`, 185) : prefix;
          }
          if (!fullDesc) {
            fullDesc = `Preberite objavo ${rawItemTitle} na slovenskem portalu Portalko.`;
          }

          let featuredImg = resolveBestOgImageUrl(colName, matched.id, data, origin);
          if (!featuredImg && deps.resolveExternalEmbedImage) {
            const extCandidateUrl = extractExternalUrlCandidateFromDoc(colName, data);
            if (extCandidateUrl) {
              try {
                const resolvedExt = await deps.resolveExternalEmbedImage(extCandidateUrl);
                if (resolvedExt) {
                  featuredImg = normalizeHttpOrOriginImageUrl(resolvedExt, origin);
                }
              } catch {
                // Ignore external lookup errors during OG resolution
              }
            }
          }
          const authorName = cleanServerHtmlText(
            data.authorName || data.author || data.organizer || data.partner || '',
            80
          );

          const toIso = (val: any): string | undefined => {
            if (!val) return undefined;
            const d = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
            return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
          };

          return {
            title: fullTitle,
            description: fullDesc,
            ogType: 'article',
            canonicalUrl,
            image: featuredImg || portalFallback,
            imageAlt: rawItemTitle,
            imageWidth: featuredImg ? 1200 : undefined,
            imageHeight: featuredImg ? 630 : undefined,
            imageType: featuredImg ? guessImageMimeTypeFromUrl(featuredImg) : 'image/png',
            author: authorName || undefined,
            publishedTime: toIso(data.publishedAt || data.createdAt),
            modifiedTime: toIso(data.updatedAt),
            section: catLabel || undefined,
            isFeaturedImage: Boolean(featuredImg),
          };
        }
      }
    }
  }

  // 3. Static section & category metadata fallback
  let title = defaultTitle;
  let description = defaultDesc;

  if (pathname === '/novice') {
    title = 'Aktualne novice v Sloveniji – RSS viri v živo | Portalko';
    description =
      'Zadnje novice iz osrednjih slovenskih medijev in RSS virov v živo. Preverite aktualna dogajanja v Sloveniji in po svetu na portalu Portalko.';
  } else if (pathname === '/mali-oglasi') {
    title = 'Mali oglasi Slovenija – Brezplačni spletni oglasi | Portalko';
    description =
      'Brezplačni mali oglasi v Sloveniji. Poiščite rabljena in nova vozila, nepremičnine, elektroniko, dom in storitve po slovenskih regijah.';
  } else if (pathname === '/dogodki') {
    title = 'Dogodki in prireditve v Sloveniji – Koledar dogodkov | Portalko';
    description =
      'Koledar prireditev, koncertov, festivalov, športnih in kulturnih dogodkov po celotni Sloveniji na enem mestu na portalu Portalko.';
  } else if (pathname === '/akcije') {
    title = 'Akcije, popusti in ugodnosti v Sloveniji | Portalko';
    description =
      'Preverjene akcije, promocijske kode, ugodnosti in popusti v slovenskih trgovinah ter na spletu. Prihranite z vsakodnevnimi popusti na Portalko.';
  } else if (pathname === '/blog') {
    title = 'Blog & Zgodbe slovenske skupnosti | Portalko';
    description =
      'Avtorske zgodbe, potopisi, lokalni vodiči in razmišljanja članov slovenske spletne skupnosti na uradnem blogu portala Portalko.';
  } else if (pathname === '/imenik') {
    title = 'Slovenski spletni imenik podjetij in znamk | Portalko';
    description = 'Preverjen imenik slovenskih podjetij, trgovin, storitev in blagovnih znamk na portalu Portalko.';
  } else if (pathname === '/shranjeno') {
    title = 'Shranjene objave in zaznamki | Portalko';
    description =
      'Vaše shranjene novice, mali oglasi, dogodki in ugodnosti na enem mestu za hiter in enostaven dostop na slovenskem portalu Portalko.';
  } else if (pathname === '/o-nas') {
    title = 'O portalu Portalko – Slovenski portal za novice, male oglase in dogodke | Portalko';
    description =
      'Spoznajte portal Portalko, osrednjo slovensko skupnost za novice, male oglase, lokalne prireditve in ugodnosti.';
  } else if (pathname === '/pogoji-uporabe') {
    title = 'Pogoji uporabe portala | Portalko';
    description = 'Pogoji uporabe in pravna pravila za uporabnike spletnega portala Portalko.';
  } else if (pathname === '/zasebnost') {
    title = 'Politika zasebnosti | Portalko';
    description = 'Informacije o varstvu osebnih podatkov in zasebnosti na portalu Portalko.';
  } else if (pathname === '/kontakt') {
    title = 'Kontakt | Portalko';
    description = 'Stopite v stik z uredništvom in podporo portala Portalko.';
  } else if (pathname === '/pravila-objavljanja') {
    title = 'Pravila objavljanja vsebin | Portalko';
    description = 'Smernice in pravila za varno objavljanje malih oglasov, dogodkov in prispevkov na portalu Portalko.';
  } else if (segments.length >= 2) {
    const section = segments[0].toLowerCase();
    const lastSegment = segments[segments.length - 1];
    const humanTitle = lastSegment
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    if (section === 'oznaka' || section === 'oznake' || section === 'tag' || section === 'tags') {
      title = `#${humanTitle} – Označene objave | Portalko`;
      description = `Vse objave, zgodbe, dogodki in mali oglasi z oznako #${humanTitle} na slovenskem portalu Portalko.`;
    } else if (
      segments.length >= 3 ||
      (section !== 'novice' &&
        segments.length === 2 &&
        !['slovenija', 'svet', 'gospodarstvo', 'sport', 'kultura', 'tehnologija'].includes(segments[1].toLowerCase()))
    ) {
      title = `${humanTitle} | Portalko`;
      if (section === 'dogodki') {
        description = `Podrobnosti, datum, lokacija in program za dogodek ${humanTitle} v Sloveniji na portalu Portalko.`;
      } else if (section === 'mali-oglasi') {
        description = `Oglejte si oglas ${humanTitle}, fotografije, ceno in kontakt prodajalca na malih oglasih Portalko.`;
      } else if (section === 'akcije') {
        description = `Preverite ugodnost, popust, ceno in promocijsko kodo za ${humanTitle} na portalu Portalko.`;
      } else {
        description = `Preberite podrobnosti objave ${humanTitle} na slovenskem portalu Portalko.`;
      }
    } else {
      const sectionName =
        section === 'mali-oglasi'
          ? 'Mali oglasi'
          : section === 'dogodki'
          ? 'Dogodki'
          : section === 'akcije'
          ? 'Akcije'
          : section === 'blog'
          ? 'Blog'
          : 'Novice';
      title = `${humanTitle} – ${sectionName} | Portalko`;
      description = `Pregled aktualnih objav v kategoriji ${humanTitle} na portalu Portalko v rubriki ${sectionName}.`;
    }
  }

  return {
    title,
    description,
    ogType: 'website',
    canonicalUrl,
    image: portalFallback,
    imageAlt: title,
    imageType: 'image/png',
    isFeaturedImage: false,
  };
}

function upsertHeadMetaTag(
  html: string,
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
): string {
  const safeContent = escapeHtmlAttr(content);
  const tagHtml = `<meta ${attrName}="${attrValue}" content="${safeContent}" />`;
  const escapedAttrVal = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\b[^>]*\\b${attrName}=["']${escapedAttrVal}["'][^>]*\\/?>`, 'i');
  if (pattern.test(html)) {
    return html.replace(pattern, tagHtml);
  }
  return html.replace(/(<\/head>)/i, `    ${tagHtml}\n$1`);
}

function removeHeadMetaTag(html: string, attrName: 'name' | 'property', attrValue: string): string {
  const escapedAttrVal = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\s*<meta\\b[^>]*\\b${attrName}=["']${escapedAttrVal}["'][^>]*\\/?>`, 'gi');
  return html.replace(pattern, '');
}

/**
 * Injects dynamic OpenGraph, Twitter Card, and SEO meta tags into the full SPA HTML template.
 */
export function injectOgTagsIntoSpaHtml(rawHtml: string, meta: ResolvedOgMetadata, gaHtml?: string): string {
  let html = rawHtml;
  const safeTitle = escapeHtmlAttr(meta.title);
  const safeCanonical = escapeHtmlAttr(meta.canonicalUrl);

  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  } else {
    html = html.replace(/(<\/head>)/i, `    <title>${safeTitle}</title>\n$1`);
  }

  if (/<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(html)) {
    html = html.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${safeCanonical}" />`);
  } else {
    html = html.replace(/(<\/head>)/i, `    <link rel="canonical" href="${safeCanonical}" />\n$1`);
  }

  html = upsertHeadMetaTag(html, 'name', 'description', meta.description);
  html = upsertHeadMetaTag(html, 'property', 'og:title', meta.title);
  html = upsertHeadMetaTag(html, 'property', 'og:description', meta.description);
  html = upsertHeadMetaTag(html, 'property', 'og:url', meta.canonicalUrl);
  html = upsertHeadMetaTag(html, 'property', 'og:type', meta.ogType);
  html = upsertHeadMetaTag(html, 'property', 'og:image', meta.image);
  html = upsertHeadMetaTag(html, 'property', 'og:image:alt', meta.imageAlt);

  if (meta.image.startsWith('https://')) {
    html = upsertHeadMetaTag(html, 'property', 'og:image:secure_url', meta.image);
  } else {
    html = removeHeadMetaTag(html, 'property', 'og:image:secure_url');
  }

  if (meta.imageType) {
    html = upsertHeadMetaTag(html, 'property', 'og:image:type', meta.imageType);
  } else {
    html = removeHeadMetaTag(html, 'property', 'og:image:type');
  }

  if (meta.imageWidth && meta.imageHeight) {
    html = upsertHeadMetaTag(html, 'property', 'og:image:width', String(meta.imageWidth));
    html = upsertHeadMetaTag(html, 'property', 'og:image:height', String(meta.imageHeight));
  } else {
    html = removeHeadMetaTag(html, 'property', 'og:image:width');
    html = removeHeadMetaTag(html, 'property', 'og:image:height');
  }

  if (meta.ogType === 'article' && meta.author) {
    html = upsertHeadMetaTag(html, 'property', 'article:author', meta.author);
  } else {
    html = removeHeadMetaTag(html, 'property', 'article:author');
  }

  if (meta.ogType === 'article' && meta.publishedTime) {
    html = upsertHeadMetaTag(html, 'property', 'article:published_time', meta.publishedTime);
  } else {
    html = removeHeadMetaTag(html, 'property', 'article:published_time');
  }

  html = upsertHeadMetaTag(html, 'name', 'twitter:card', 'summary_large_image');
  html = upsertHeadMetaTag(html, 'name', 'twitter:title', meta.title);
  html = upsertHeadMetaTag(html, 'name', 'twitter:description', meta.description);
  html = upsertHeadMetaTag(html, 'name', 'twitter:url', meta.canonicalUrl);
  html = upsertHeadMetaTag(html, 'name', 'twitter:image', meta.image);

  if (gaHtml && !html.includes('G-DYZSLZ29C4')) {
    html = html.replace(/(<\/head>)/i, `${gaHtml}\n$1`);
  }

  return html;
}

/**
 * Generates a lightweight, crawler-only pre-rendered HTML5 document with all OpenGraph,
 * Twitter Card, and Schema.org metadata positioned immediately at the top of <head> so
 * Facebook (`facebookexternalhit`) and social scrapers read the exact article title and
 * featured image reliably on the very first pass.
 */
export function buildPreRenderedCrawlerHtml(meta: ResolvedOgMetadata, origin: string): string {
  const safeTitle = escapeHtmlAttr(meta.title);
  const safeDesc = escapeHtmlAttr(meta.description);
  const safeUrl = escapeHtmlAttr(meta.canonicalUrl);
  const safeImg = escapeHtmlAttr(meta.image);
  const safeImgAlt = escapeHtmlAttr(meta.imageAlt);

  const schemaData: Record<string, any> =
    meta.ogType === 'article'
      ? {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          mainEntityOfPage: { '@type': 'WebPage', '@id': meta.canonicalUrl },
          headline: meta.imageAlt || meta.title,
          description: meta.description,
          image: [meta.image],
          ...(meta.publishedTime ? { datePublished: meta.publishedTime } : {}),
          ...(meta.modifiedTime ? { dateModified: meta.modifiedTime } : {}),
          ...(meta.author ? { author: { '@type': 'Person', name: meta.author } } : {}),
          publisher: {
            '@type': 'Organization',
            name: 'Portalko',
            logo: { '@type': 'ImageObject', url: `${origin}/favicon.png` },
          },
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          url: meta.canonicalUrl,
          name: meta.title,
          description: meta.description,
          primaryImageOfPage: { '@type': 'ImageObject', url: meta.image },
        };

  return `<!doctype html>
<html lang="sl" prefix="og: https://ogp.me/ns# article: https://ogp.me/ns/article#">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:site_name" content="Portalko" />
    <meta property="og:locale" content="sl_SI" />
    <meta property="og:type" content="${meta.ogType}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImg}" />
    ${meta.image.startsWith('https://') ? `<meta property="og:image:secure_url" content="${safeImg}" />` : ''}
    ${meta.imageType ? `<meta property="og:image:type" content="${escapeHtmlAttr(meta.imageType)}" />` : ''}
    ${meta.imageWidth && meta.imageHeight ? `<meta property="og:image:width" content="${meta.imageWidth}" />\n    <meta property="og:image:height" content="${meta.imageHeight}" />` : ''}
    <meta property="og:image:alt" content="${safeImgAlt}" />
    ${meta.ogType === 'article' && meta.author ? `<meta property="article:author" content="${escapeHtmlAttr(meta.author)}" />` : ''}
    ${meta.ogType === 'article' && meta.publishedTime ? `<meta property="article:published_time" content="${escapeHtmlAttr(meta.publishedTime)}" />` : ''}
    ${meta.ogType === 'article' && meta.section ? `<meta property="article:section" content="${escapeHtmlAttr(meta.section)}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${safeUrl}" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImg}" />
    <script type="application/ld+json">${JSON.stringify(schemaData)}</script>
  </head>
  <body>
    <main>
      <article>
        <h1>${safeTitle}</h1>
        <p>${safeDesc}</p>
        <img src="${safeImg}" alt="${safeImgAlt}" />
        <p><a href="${safeUrl}">${safeUrl}</a></p>
      </article>
    </main>
  </body>
</html>`;
}
