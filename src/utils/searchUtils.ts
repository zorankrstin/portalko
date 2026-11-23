export type SearchCategory = 'all' | 'ads' | 'news' | 'events' | 'blog' | 'deals' | 'directory';

export interface ParsedSearchQuery {
  category: SearchCategory;
  directoryCategory?: string;
  text: string;
  terms: string[];
  rawQuery: string;
}

const CATEGORY_MAP: Record<string, SearchCategory> = {
  // Slovenian
  'oglasi': 'ads',
  'oglas': 'ads',
  'mali-oglasi': 'ads',
  'malioglasi': 'ads',
  'novice': 'news',
  'novica': 'news',
  'rss': 'news',
  'dogodki': 'events',
  'dogodek': 'events',
  'prireditve': 'events',
  'blog': 'blog',
  'objave': 'blog',
  'objava': 'blog',
  'clanki': 'blog',
  'popusti': 'deals',
  'popust': 'deals',
  'ugodnosti': 'deals',
  'ugodnost': 'deals',
  'kuponi': 'deals',
  'kupon': 'deals',
  'imenik': 'directory',
  'podjetja': 'directory',
  'znamke': 'directory',
  'vse': 'all',
  
  // English
  'ads': 'ads',
  'ad': 'ads',
  'classifieds': 'ads',
  'news': 'news',
  'events': 'events',
  'event': 'events',
  'posts': 'blog',
  'post': 'blog',
  'deals': 'deals',
  'deal': 'deals',
  'discounts': 'deals',
  'directory': 'directory',
  'all': 'all',
};

/**
 * Parses a search query string for category tags such as:
 * - "kategorija:oglasi avto"
 * - "kategorija:imenik/cat-trgovine mercator"
 * - "cat:news vlada"
 * - "category:events koncert"
 * - "[novice] 24ur"
 * - "#dogodki ljubljana"
 */
export function parseSearchQuery(query: string = ''): ParsedSearchQuery {
  const rawQuery = query || '';
  let category: SearchCategory = 'all';
  let directoryCategory: string | undefined;
  let text = rawQuery;

  // 1. Match prefix like "kategorija:xyz", "kategorija:imenik/cat-id", "category:xyz", "cat:xyz"
  const colonMatch = text.match(/(?:^|\s)(?:kategorija|category|cat):([a-z0-9_-]+)(?:\/([a-z0-9_-]+))?/i);
  if (colonMatch) {
    const catKey = colonMatch[1].toLowerCase();
    if (CATEGORY_MAP[catKey]) {
      category = CATEGORY_MAP[catKey];
      if (category === 'directory' && colonMatch[2]) {
        directoryCategory = colonMatch[2];
      }
    }
    text = text.replace(colonMatch[0], ' ');
  }

  // 2. Match bracket syntax like "[oglasi]", "[novice]", "[imenik]"
  const bracketMatch = text.match(/(?:^|\s)\[([a-z0-9_-]+)\]/i);
  if (bracketMatch && category === 'all') {
    const catKey = bracketMatch[1].toLowerCase();
    if (CATEGORY_MAP[catKey]) {
      category = CATEGORY_MAP[catKey];
    }
    text = text.replace(bracketMatch[0], ' ');
  }

  // 3. Match hashtag syntax like "#oglasi", "#novice", "#popusti", "#imenik"
  const hashMatch = text.match(/(?:^|\s)#(oglasi|novice|dogodki|blog|popusti|ugodnosti|imenik|ads|news|events|deals|directory)\b/i);
  if (hashMatch && category === 'all') {
    const catKey = hashMatch[1].toLowerCase();
    if (CATEGORY_MAP[catKey]) {
      category = CATEGORY_MAP[catKey];
    }
    text = text.replace(hashMatch[0], ' ');
  }

  const cleanedText = text.trim();
  const terms = cleanedText ? cleanedText.toLowerCase().split(/\s+/).filter(Boolean) : [];

  return {
    category,
    ...(directoryCategory ? { directoryCategory } : {}),
    text: cleanedText,
    terms,
    rawQuery,
  };
}

/**
 * Re-constructs a search query string given a category, text, and optional Imenik subcategory ID.
 */
export function buildSearchQuery(
  category: SearchCategory,
  text: string = '',
  directoryCategory?: string
): string {
  const cleanText = text.trim();
  if (category === 'all') {
    return cleanText;
  }
  
  const categoryTokenMap: Record<SearchCategory, string> = {
    all: '',
    news: 'kategorija:novice',
    ads: 'kategorija:oglasi',
    deals: 'kategorija:ugodnosti',
    events: 'kategorija:dogodki',
    blog: 'kategorija:blog',
    directory: 'kategorija:imenik',
  };

  let token = categoryTokenMap[category];
  if (category === 'directory' && directoryCategory && directoryCategory !== 'all') {
    token = `${token}/${directoryCategory}`;
  }
  if (!token) return cleanText;

  return cleanText ? `${token} ${cleanText}` : token;
}

/**
 * Checks whether an item with given text and category matches the search query.
 */
export function matchesSearchAndCategory(
  itemText: string = '',
  itemCategory?: string,
  searchQuery: string = ''
): boolean {
  if (!searchQuery) return true;

  const parsed = parseSearchQuery(searchQuery);

  // Category filter check
  if (parsed.category !== 'all') {
    if (!itemCategory) return false;
    const normalizedItemCategory = normalizeCategory(itemCategory);
    if (normalizedItemCategory !== parsed.category) {
      return false;
    }
  }

  // Text terms check
  if (parsed.terms.length > 0) {
    const lowerItemText = itemText.toLowerCase();
    const allTermsMatch = parsed.terms.every(term => lowerItemText.includes(term));
    if (!allTermsMatch) return false;
  }

  return true;
}

function normalizeCategory(category: string): SearchCategory {
  const lower = category.toLowerCase().trim();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  if (lower.includes('oglas') || lower.includes('ad')) return 'ads';
  if (lower.includes('novic') || lower.includes('news') || lower.includes('rss')) return 'news';
  if (lower.includes('ugodnost') || lower.includes('popust') || lower.includes('deal') || lower.includes('kupon')) return 'deals';
  if (lower.includes('dogod') || lower.includes('event')) return 'events';
  if (lower.includes('blog') || lower.includes('post')) return 'blog';
  if (lower.includes('imenik') || lower.includes('director')) return 'directory';
  return 'all';
}
