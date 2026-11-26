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
