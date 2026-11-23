import { slugify } from './urlUtils';

/**
 * Cleans a single raw tag string (removes leading '#', trims, collapses spaces).
 */
export function normalizeTagLabel(raw?: string | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes a `tags` field (string[], comma-separated string, or null/undefined)
 * into a deduplicated array of clean tag labels preserving original display casing.
 */
export function parseTags(raw: string[] | string | undefined | null): string[] {
  if (!raw) return [];
  const rawList = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of rawList) {
    if (typeof item !== 'string' && typeof item !== 'number') continue;
    const clean = normalizeTagLabel(String(item));
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }

  return result;
}

/**
 * Checks if a post's tags match the target tag (either exact case-insensitive match
 * or clean Slovenian slug match, e.g. 'pocitnice-na-morju' matches 'Počitnice na morju').
 */
export function doesPostMatchTag(
  postTags: string[] | string | undefined | null,
  targetTag: string
): boolean {
  const cleanTarget = normalizeTagLabel(targetTag);
  if (!cleanTarget) return false;

  const targetLower = cleanTarget.toLowerCase();
  const targetSlug = slugify(cleanTarget);
  const parsed = parseTags(postTags);

  return parsed.some((tag) => {
    const tLower = tag.toLowerCase();
    if (tLower === targetLower) return true;
    if (targetSlug) {
      const tSlug = slugify(tag);
      if (tSlug && tSlug === targetSlug) return true;
    }
    return false;
  });
}

/**
 * Given a URL slug or clicked tag label and a list of matching posts' tags,
 * resolves the best human-readable label (preserving original casing and Slovenian diacritics).
 */
export function resolveTagDisplayName(
  rawTag: string,
  candidateTagLists: Array<string[] | string | undefined | null>
): string {
  const cleanTarget = normalizeTagLabel(rawTag);
  if (!cleanTarget) return '';

  const targetLower = cleanTarget.toLowerCase();
  const targetSlug = slugify(cleanTarget);

  for (const list of candidateTagLists) {
    const parsed = parseTags(list);
    for (const tag of parsed) {
      if (tag.toLowerCase() === targetLower) {
        return tag;
      }
      if (targetSlug && slugify(tag) === targetSlug) {
        return tag;
      }
    }
  }

  // Fallback: turn hyphenated URL slug back into spaced words if no diacritics are preserved
  if (cleanTarget.includes('-') && !cleanTarget.includes(' ')) {
    return cleanTarget.replace(/-/g, ' ');
  }
  return cleanTarget;
}
