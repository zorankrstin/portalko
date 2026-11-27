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

export function resolvePostExternalUrlCandidate(
  data?: Record<string, any> | null,
  options?: { includeSocialEmbeds?: boolean }
): string | undefined {
  if (!data) return undefined;
  const directCandidates = [data.externalUrl, data.dealLink, data.link];
  for (const cand of directCandidates) {
    if (typeof cand === "string" && cand.trim() && cand.trim() !== "#") {
      const normalized = normalizeExternalUrl(cand.trim());
      try {
        const host = new URL(normalized).hostname.toLowerCase();
        if (!host.includes("portalko.net")) {
          return normalized;
        }
      } catch {
        // ignore invalid URL
      }
    }
  }
  if (typeof data.embedCode === "string") {
    if (isGenericExternalUrl(data.embedCode)) {
      return normalizeExternalUrl(data.embedCode);
    }
    if (options?.includeSocialEmbeds) {
      return extractEmbedSourceUrl(data.embedCode);
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
const FAILED_BACKOFF_MS = 5 * 60 * 1000;

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

