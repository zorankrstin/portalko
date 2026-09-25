import { ViewMode, PostDetailTarget, PostDetailType, AuthorProfileTarget } from '../types';

/**
 * Transliterates and converts any string into a clean, URL-friendly SEO slug.
 * Handles Slovenian characters (č, š, ž, ć, đ) and cleans punctuation/symbols.
 */
export function slugify(text?: string | null): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Transliterate Slovenian & Central European characters
    .replace(/č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/đ/g, 'd')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    // Remove non-alphanumeric chars (keep spaces and hyphens)
    .replace(/[^\w\s-]/g, '')
    // Replace whitespace or underscores with single hyphen
    .replace(/[\s_]+/g, '-')
    // Replace multiple consecutive hyphens with a single one
    .replace(/-+/g, '-')
    // Strip hyphens from beginning and end
    .replace(/^-+|-+$/g, '');
}

/**
 * Map of sections to their primary Slovenian URL slugs
 */
export const SECTION_TO_SLUG: Record<string, string> = {
  main: 'domov',
  news: 'novice',
  ads: 'mali-oglasi',
  ad: 'mali-oglasi',
  events: 'dogodki',
  event: 'dogodki',
  deals: 'ugodnosti',
  deal: 'ugodnosti',
  blog: 'blog',
  post: 'blog',
  saved: 'shranjeno',
  admin: 'admin',
  profile: 'profil',
};

/**
 * Mapping of ViewMode / section to URL hash or slug
 */
export const VIEW_HASH_MAP: Record<string, string> = {
  ...SECTION_TO_SLUG,
  'post-detail': '',
};

/**
 * Map of URL slugs to their ViewMode
 */
export const SLUG_TO_VIEW: Record<string, ViewMode> = {
  '': 'main',
  domov: 'main',
  novice: 'news',
  news: 'news',
  'mali-oglasi': 'ads',
  oglasi: 'ads',
  ads: 'ads',
  dogodki: 'events',
  prireditve: 'events',
  events: 'events',
  ugodnosti: 'deals',
  popusti: 'deals',
  kuponi: 'deals',
  deals: 'deals',
  blog: 'blog',
  clanki: 'blog',
  shranjeno: 'saved',
  zaznamki: 'saved',
  saved: 'saved',
  admin: 'admin',
  'nadzorna-plosca': 'admin',
  profil: 'profile',
  profile: 'profile',
};

/**
 * Converts post type to standard URL section slug
 */
export function getSectionFromType(type?: PostDetailType | string): string {
  if (type === 'ad') return 'mali-oglasi';
  if (type === 'event') return 'dogodki';
  if (type === 'deal') return 'ugodnosti';
  return 'blog';
}

/**
 * Resolves post type from section or category slug
 */
export function getTypeFromSection(sectionSlug: string): PostDetailType {
  const clean = sectionSlug.toLowerCase().trim();
  if (clean === 'mali-oglasi' || clean === 'oglasi' || clean === 'ads' || clean === 'ad') return 'ad';
  if (clean === 'dogodki' || clean === 'prireditve' || clean === 'events' || clean === 'event') return 'event';
  if (clean === 'ugodnosti' || clean === 'popusti' || clean === 'kuponi' || clean === 'deals' || clean === 'deal') return 'deal';
  return 'blog';
}

export interface BuildPostUrlOptions {
  type?: PostDetailType;
  id?: string;
  title?: string;
  category?: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
}

/**
 * Builds clean, SEO-optimized URL structure: /category/subcategory/title
 * Example: /mali-oglasi/avto-moto/audi-a4-avant-2-0-tdi
 * Example: /blog/turizem-izleti/potep-po-dolini-soce
 * Example: /dogodki/glasba-koncerti/koncert-big-foot-mama
 * Example: /ugodnosti/sport-prosti-cas/hervis-30-popust
 */
export function buildPostUrl(options: BuildPostUrlOptions): string {
  const type = options.type === 'post' ? 'blog' : (options.type || 'blog');
  const sectionSlug = getSectionFromType(type);

  // Determine subcategory slug:
  // Priority: explicit subcategoryName/subcategory -> categoryName/category -> fallback 'splosno'
  let subcatRaw = options.subcategoryName || options.subcategory;
  if (!subcatRaw || subcatRaw.trim() === '') {
    subcatRaw = options.categoryName || options.category;
  }
  
  let subcategorySlug = slugify(subcatRaw || '');
  if (!subcategorySlug || subcategorySlug === sectionSlug || subcategorySlug === type) {
    // If the subcategory is identical to section name, use meaningful default based on type
    subcategorySlug = type === 'ad' ? 'razno' :
                      type === 'event' ? 'splosno' :
                      type === 'deal' ? 'akcije' : 'zgodbe';
  }

  // Title slug
  const titleText = options.title || options.id || 'objava';
  let titleSlug = slugify(titleText);
  if (!titleSlug) titleSlug = 'objava';

  return `/${sectionSlug}/${subcategorySlug}/${titleSlug}`;
}

/**
 * Builds a clean category listing URL: /category/subcategory or /category
 */
export function buildCategoryUrl(section: string, subcategory?: string): string {
  const secSlug = slugify(section);
  if (!subcategory) return `/${secSlug}`;
  return `/${secSlug}/${slugify(subcategory)}`;
}

export interface ParsedRouteResult {
  view: ViewMode;
  target?: PostDetailTarget;
  author?: AuthorProfileTarget;
  categorySlug?: string;
  subcategorySlug?: string;
  titleSlug?: string;
  isPostDetail: boolean;
}

/**
 * Parses current window.location.pathname and hash to determine view and post target.
 * Supports:
 * - 3-level clean paths: /category/subcategory/title
 * - 2-level clean paths: /category/title or /section/subcategory
 * - 1-level paths: /mali-oglasi, /dogodki, /ugodnosti, /blog, /novice, /profil, /admin
 * - Author profiles: /avtor/:authorName or /profil/:authorName
 * - Legacy hash compatibility: #blog-123, #ad-123, #deal-123, #event-123, #profil, #author-...
 */
export function parseUrlPath(pathname: string, hash: string = ''): ParsedRouteResult {
  // 1. First check if there is an explicit legacy hash that takes precedence
  const rawHash = (hash || '').replace(/^#\/?/, '').trim();
  if (rawHash) {
    const lowerHash = rawHash.toLowerCase();

    // Profile hash
    if (lowerHash === 'profil' || lowerHash === 'profile') {
      return { view: 'profile', isPostDetail: false };
    }
    const authorHashMatch = rawHash.match(/^author-(.+)$/i);
    if (authorHashMatch) {
      const decodedName = decodeURIComponent(authorHashMatch[1]).replace(/_/g, ' ');
      return { 
        view: 'profile', 
        author: { name: decodedName }, 
        isPostDetail: false 
      };
    }

    // Direct post hash e.g. #deal-123, #event-123, #ad-123, #post-123, #blog-123
    const postHashMatch = rawHash.match(/^(deal|event|ad|post|blog)-(.+)$/i);
    if (postHashMatch) {
      let type = postHashMatch[1].toLowerCase() as PostDetailType;
      if (type === 'post') type = 'blog';
      const rawId = postHashMatch[2].split('?')[0].split('&')[0].replace(/\/+$/, '');
      const id = decodeURIComponent(rawId).trim();
      return {
        view: 'post-detail',
        isPostDetail: true,
        target: { type, id }
      };
    }

    // Standard view hash
    if (SLUG_TO_VIEW[lowerHash]) {
      return { view: SLUG_TO_VIEW[lowerHash], isPostDetail: false };
    }
  }

  // 2. Parse clean URL pathname: /category/subcategory/title
  // Remove leading/trailing slashes and split by '/'
  const cleanPath = (pathname || '/').replace(/^\/+|\/+$/g, '').trim();
  if (!cleanPath) {
    return { view: 'main', isPostDetail: false };
  }

  const segments = cleanPath.split('/').map(s => decodeURIComponent(s).trim());

  // Check 1-segment routes
  if (segments.length === 1) {
    const seg0 = segments[0].toLowerCase();
    if (SLUG_TO_VIEW[seg0]) {
      return { view: SLUG_TO_VIEW[seg0], isPostDetail: false };
    }
  }

  // Check Author / Profile routes: /avtor/:name or /profil/:name
  if (segments.length === 2 && (segments[0] === 'avtor' || segments[0] === 'profil' || segments[0] === 'profile')) {
    const authorName = segments[1].replace(/[-_]/g, ' ');
    return {
      view: 'profile',
      author: { name: authorName },
      isPostDetail: false,
    };
  }

  // 3-level route: /category/subcategory/title (The IDEAL SEO structure requested)
  if (segments.length >= 3) {
    const categoryPart = segments[0].toLowerCase();
    const subcategoryPart = segments[1].toLowerCase();
    const titlePart = segments[2];

    const type = getTypeFromSection(categoryPart);

    return {
      view: 'post-detail',
      isPostDetail: true,
      categorySlug: categoryPart,
      subcategorySlug: subcategoryPart,
      titleSlug: titlePart,
      target: {
        type,
        id: titlePart, // initial search term (can match id or title slug)
        titleSlug: titlePart,
        categorySlug: categoryPart,
        subcategorySlug: subcategoryPart,
      }
    };
  }

  // 2-level route: could be /section/subcategory (listing) OR /section/title (single post)
  if (segments.length === 2) {
    const seg0 = segments[0].toLowerCase();
    const seg1 = segments[1];

    if (SLUG_TO_VIEW[seg0]) {
      const type = getTypeFromSection(seg0);
      // Treat as post detail or category filter
      return {
        view: 'post-detail',
        isPostDetail: true,
        categorySlug: seg0,
        titleSlug: seg1,
        target: {
          type,
          id: seg1,
          titleSlug: seg1,
          categorySlug: seg0,
        }
      };
    }
  }

  // Default fallback to main
  return { view: 'main', isPostDetail: false };
}

/**
 * Dispatches a popstate event to notify components of URL change
 */
export function navigateApp(url: string, replace: boolean = false) {
  if (typeof window === 'undefined') return;
  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
  // Dispatch a popstate event so standard listeners update immediately
  window.dispatchEvent(new PopStateEvent('popstate'));
}
