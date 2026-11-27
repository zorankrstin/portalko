import { useEffect, useState } from "react";

export interface ExternalEmbedMetadata {
  url: string;
  originalUrl: string;
  domain: string;
  siteName: string;
  faviconUrl: string;
  title: string;
  description: string;
  imageUrl?: string;
  images: string[];
  price?: string;
  oldPrice?: string;
  discount?: string;
  location?: string;
  tags?: string[];
  publishedTime?: string;
  author?: string;
  fetchedAt: string;
}

export function normalizeExternalUrl(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function extractDomainFromUrl(url?: string): string {
  if (!url) return "";
  try {
    const normalized = normalizeExternalUrl(url);
    return new URL(normalized).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isGenericExternalUrl(raw?: string | null): boolean {
  const input = (raw || "").trim();
  if (!input) return false;
  if (input.includes("<iframe") || input.includes("<blockquote") || /\s/.test(input)) {
    return false;
  }
  if (!/^https?:\/\//i.test(input) && !input.startsWith("www.")) {
    return false;
  }
  const normalized = normalizeExternalUrl(input);
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    // Exclude video/social platforms handled by dedicated rich embeds and own domain
    if (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("youtube-nocookie.com") ||
      host.includes("tiktok.com") ||
      host.includes("instagram.com") ||
      host.includes("facebook.com") ||
      host.includes("fb.watch") ||
      host.includes("twitter.com") ||
      host === "x.com" ||
      host.endsWith(".x.com") ||
      host.includes("portalko.net")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function extractEmbedSourceUrl(rawInput?: string | null): string | undefined {
  const input = (rawInput || "").trim();
  if (!input) return undefined;

  const validatePublicHttpUrl = (cand: string): string | undefined => {
    const cleaned = cand.trim();
    if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("blob:") || cleaned.startsWith("javascript:")) {
      return undefined;
    }
    const normalized = normalizeExternalUrl(cleaned);
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
      if (parsed.hostname.toLowerCase().includes("portalko.net")) return undefined;
      return parsed.toString();
    } catch {
      return undefined;
    }
  };

  // 1. Plain single URL
  if (!input.includes("<") && !/\s/.test(input)) {
    if (/^https?:\/\//i.test(input) || input.startsWith("www.")) {
      return validatePublicHttpUrl(input);
    }
    return undefined;
  }

  // 2. Instagram permalink attribute
  const igMatch = input.match(/data-instgrm-permalink=["']([^"']+)["']/i);
  if (igMatch?.[1]) {
    const valid = validatePublicHttpUrl(igMatch[1]);
    if (valid) return valid;
  }

  // 3. Cite attribute (TikTok, etc.)
  const citeMatch = input.match(/\bcite=["']([^"']+)["']/i);
  if (citeMatch?.[1]) {
    const valid = validatePublicHttpUrl(citeMatch[1]);
    if (valid) return valid;
  }

  // 4. <iframe src="...">
  const iframeSrcMatch = input.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeSrcMatch?.[1]) {
    const src = iframeSrcMatch[1];
    // Facebook plugins wrap the real post URL inside ?href=...
    const fbHrefMatch = src.match(/[?&]href=([^&]+)/i);
    if (fbHrefMatch?.[1]) {
      try {
        const decoded = decodeURIComponent(fbHrefMatch[1]);
        const valid = validatePublicHttpUrl(decoded);
        if (valid) return valid;
      } catch {
        // ignore
      }
    }
    // YouTube embed URL -> watch URL so metadata extractor fetches page info cleanly
    const ytMatch = src.match(/(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (ytMatch?.[1]) {
      return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
    }
    const valid = validatePublicHttpUrl(src);
    if (valid) return valid;
  }

  // 5. Fallback <a href="..."> inside blockquote embeds (e.g. Twitter/X)
  const hrefMatches = Array.from(input.matchAll(/<a[^>]+href=["']([^"']+)["']/gi));
  for (let i = hrefMatches.length - 1; i >= 0; i--) {
    const candidate = hrefMatches[i]?.[1];
    if (candidate) {
      const valid = validatePublicHttpUrl(candidate);
      if (valid) return valid;
    }
  }

  return undefined;
}

export function getDirectVideoThumbnailUrl(rawInput?: string | null): string | undefined {
  const input = (rawInput || "").trim();
  if (!input) return undefined;
  const ytMatch = input.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch?.[1]) {
    return `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  return undefined;
}

const KNOWN_DUMMY_STOCK_IMAGE_FRAGMENTS = [
  "photo-1588872657578-7efd1f1555ed",
  "photo-1607082348824-0a96f2a4b9da",
  "photo-1552519507-da3b142c6e3d",
  "photo-1568605117036-5fe5e7bab0b7",
  "photo-1506744038136-46273834b3fb",
  "photo-1501281668745-f7f57925c3b4",
  "photo-1496181133206-80ce9b88a853",
  "photo-1542838132-92c53300491e",
  "photo-1540555700478-4be289fbecef",
  "photo-1551632811-561732d1e306",
  "photo-1555041469-a586c61ea9bc",
];

/**
 * Returns true if the URL is empty, a placeholder/dummy image, or a hardcoded stock fallback
 * that should NOT be treated as a real user/source image.
 */
export function isDummyOrFallbackImageUrl(
  url?: string | null,
  portalFallbackUrl?: string | null
): boolean {
  if (!url || typeof url !== "string") return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#" || trimmed === "undefined" || trimmed === "null") {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (portalFallbackUrl && trimmed === portalFallbackUrl.trim()) {
    return true;
  }
  if (
    lower.endsWith("/favicon.png") ||
    lower.endsWith("/favicon.ico") ||
    lower.includes("via.placeholder.com") ||
    lower.includes("placeholder.com/") ||
    lower.includes("dummyimage.com")
  ) {
    return true;
  }
  return KNOWN_DUMMY_STOCK_IMAGE_FRAGMENTS.some((frag) => lower.includes(frag));
}

export function filterRealStoredImages(
  urls: Array<string | undefined | null>,
  portalFallbackUrl?: string | null
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    if (isDummyOrFallbackImageUrl(trimmed, portalFallbackUrl)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function isNonEmbedAssetOrInternalHost(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase();
  const pathLower = parsed.pathname.toLowerCase();
  if (
    host.includes("portalko.net") ||
    host.includes("firebasestorage.googleapis.com") ||
    host.includes("storage.googleapis.com") ||
    host.includes("i.ytimg.com") ||
    host.includes("img.youtube.com") ||
    (host.includes("google.com") && pathLower.startsWith("/s2/favicons"))
  ) {
    return true;
  }
  if (
    /\.(?:jpe?g|png|webp|gif|svg|avif|ico|bmp|pdf|mp4|webm|mp3|wav|css|js|woff2?)$/i.test(
      pathLower
    )
  ) {
    return true;
  }
  return false;
}

export function extractFirstExternalUrlFromRichText(
  rawHtmlOrText?: string | null,
  options?: { includeSocialEmbeds?: boolean }
): string | undefined {
  if (!rawHtmlOrText || typeof rawHtmlOrText !== "string") return undefined;

  const candidates: string[] = [];
  const seen = new Set<string>();
  const addCandidate = (raw?: string) => {
    if (!raw) return;
    const cleaned = raw
      .replace(/&amp;/gi, "&")
      .replace(/[),.;!?]+$/, "")
      .trim();
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    candidates.push(cleaned);
  };

  // 1. <a href="..."> links inside HTML description/content
  for (const match of rawHtmlOrText.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)) {
    addCandidate(match[1]);
  }

  // 2. Plain https:// or http:// URLs written in text or HTML
  const plainText = rawHtmlOrText
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ");
  for (const match of plainText.matchAll(/\bhttps?:\/\/[^\s<>"')]+/gi)) {
    addCandidate(match[0]);
  }

  for (const cand of candidates) {
    const normalized = normalizeExternalUrl(cand);
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      if (isNonEmbedAssetOrInternalHost(parsed)) continue;
      if (!options?.includeSocialEmbeds && !isGenericExternalUrl(normalized)) {
        continue;
      }
      return parsed.toString();
    } catch {
      // ignore malformed URL
    }
  }

  return undefined;
}

export function resolvePostExternalUrlCandidate(
  data?: Record<string, any> | null,
  options?: { includeSocialEmbeds?: boolean }
): string | undefined {
  if (!data) return undefined;
  const directCandidates = [data.externalUrl, data.dealLink, data.link, data.ticketUrl];
  for (const cand of directCandidates) {
    if (typeof cand === "string" && cand.trim() && cand.trim() !== "#") {
      const normalized = normalizeExternalUrl(cand.trim());
      try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
        if (!parsed.hostname.toLowerCase().includes("portalko.net")) {
          return parsed.toString();
        }
      } catch {
        // ignore invalid URL
      }
    }
  }
  if (typeof data.embedCode === "string" && data.embedCode.trim()) {
    if (isGenericExternalUrl(data.embedCode)) {
      return normalizeExternalUrl(data.embedCode);
    }
    if (options?.includeSocialEmbeds) {
      const fromEmbed = extractEmbedSourceUrl(data.embedCode);
      if (fromEmbed) return fromEmbed;
    }
  }
  const textFields = [data.description, data.content, data.richContent];
  for (const field of textFields) {
    if (typeof field === "string" && field.trim()) {
      const found = extractFirstExternalUrlFromRichText(field, options);
      if (found) return found;
    }
  }
  return undefined;
}

export async function fetchExternalEmbedUrl(rawUrl: string): Promise<ExternalEmbedMetadata> {
  const normalized = normalizeExternalUrl(rawUrl);
  if (!normalized) {
    throw new Error("Vnesite spletno povezavo (URL) objave, oglasa ali akcije.");
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("Vnesena spletna povezava ni veljavna.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Podprti sta samo povezavi http:// in https://.");
  }

  const response = await fetch("/api/embed/fetch-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: parsed.toString() }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok || !payload?.meta) {
    throw new Error(
      payload?.error || "Vsebine s te spletne strani žal ni bilo mogoče samodejno prebrati."
    );
  }

  return payload.meta as ExternalEmbedMetadata;
}

const CLIENT_EMBED_CACHE = new Map<string, ExternalEmbedMetadata>();
const CLIENT_FAILED_CACHE = new Map<string, number>();
const INFLIGHT_EMBED_REQUESTS = new Map<string, Promise<ExternalEmbedMetadata | null>>();
const SESSION_STORAGE_PREFIX = "portalko_ext_embed_v1_";
const FAILED_BACKOFF_MS = 45 * 1000;

export function getCachedExternalEmbed(rawUrl?: string): ExternalEmbedMetadata | null {
  if (!rawUrl) return null;
  const normalized = normalizeExternalUrl(rawUrl);
  if (!normalized) return null;
  const mem = CLIENT_EMBED_CACHE.get(normalized);
  if (mem) return mem;

  if (typeof sessionStorage !== "undefined") {
    try {
      const raw = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${normalized}`);
      if (raw) {
        const parsed = JSON.parse(raw) as ExternalEmbedMetadata;
        if (parsed && parsed.url) {
          CLIENT_EMBED_CACHE.set(normalized, parsed);
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
  }
  return null;
}

export async function fetchExternalEmbedUrlCached(rawUrl: string): Promise<ExternalEmbedMetadata | null> {
  const normalized = normalizeExternalUrl(rawUrl);
  if (!normalized) return null;

  const existing = getCachedExternalEmbed(normalized);
  if (existing) return existing;

  const failedAt = CLIENT_FAILED_CACHE.get(normalized);
  if (failedAt && Date.now() - failedAt < FAILED_BACKOFF_MS) {
    return null;
  }

  const inflight = INFLIGHT_EMBED_REQUESTS.get(normalized);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const meta = await fetchExternalEmbedUrl(normalized);
      CLIENT_EMBED_CACHE.set(normalized, meta);
      if (typeof sessionStorage !== "undefined") {
        try {
          sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${normalized}`, JSON.stringify(meta));
        } catch {
          // ignore quota errors
        }
      }
      return meta;
    } catch {
      CLIENT_FAILED_CACHE.set(normalized, Date.now());
      return null;
    } finally {
      INFLIGHT_EMBED_REQUESTS.delete(normalized);
    }
  })();

  INFLIGHT_EMBED_REQUESTS.set(normalized, promise);
  return promise;
}

export interface ResolvedExternalEmbedState {
  data: ExternalEmbedMetadata | null;
  isLoading: boolean;
}

export function useResolvedExternalEmbedState(
  candidateUrl?: string,
  skipFetch = false
): ResolvedExternalEmbedState {
  const normalized = candidateUrl ? normalizeExternalUrl(candidateUrl) : "";
  const [state, setState] = useState<ResolvedExternalEmbedState>(() => {
    if (!normalized || skipFetch) {
      return { data: null, isLoading: false };
    }
    const cached = getCachedExternalEmbed(normalized);
    if (cached) {
      return { data: cached, isLoading: false };
    }
    const failedAt = CLIENT_FAILED_CACHE.get(normalized);
    if (failedAt && Date.now() - failedAt < FAILED_BACKOFF_MS) {
      return { data: null, isLoading: false };
    }
    return { data: null, isLoading: true };
  });

  useEffect(() => {
    if (!normalized || skipFetch) {
      setState({ data: null, isLoading: false });
      return;
    }
    const cached = getCachedExternalEmbed(normalized);
    if (cached) {
      setState({ data: cached, isLoading: false });
      return;
    }
    const failedAt = CLIENT_FAILED_CACHE.get(normalized);
    if (failedAt && Date.now() - failedAt < FAILED_BACKOFF_MS) {
      setState({ data: null, isLoading: false });
      return;
    }

    let cancelled = false;
    setState((prev) => (prev.data ? prev : { data: null, isLoading: true }));

    fetchExternalEmbedUrlCached(normalized).then((meta) => {
      if (!cancelled) {
        setState({ data: meta, isLoading: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [normalized, skipFetch]);

  return state;
}

export function useResolvedExternalEmbed(
  candidateUrl?: string,
  skipFetch = false
): ExternalEmbedMetadata | null {
  return useResolvedExternalEmbedState(candidateUrl, skipFetch).data;
}

