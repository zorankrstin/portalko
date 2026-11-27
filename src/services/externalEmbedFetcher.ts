import dns from "node:dns/promises";
import net from "node:net";

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

const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 9_000;
const EMBED_CACHE_TTL_MS = 15 * 60 * 1000;
const embedServerCache = new Map<string, { meta: ExternalEmbedMetadata; expiresAt: number }>();

function decodeHtmlEntities(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(raw: string): string {
  if (!raw) return "";
  return decodeHtmlEntities(raw.replace(/<[^>]*>/g, " "));
}

function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.trim().toLowerCase();
  if (!clean) return true;

  // Strip IPv6-mapped IPv4 prefix
  const mappedMatch = clean.match(/^::ffff:([0-9.]+)$/);
  const targetIp = mappedMatch ? mappedMatch[1] : clean;

  if (net.isIPv4(targetIp)) {
    const parts = targetIp.split(".").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  if (net.isIPv6(targetIp)) {
    if (targetIp === "::" || targetIp === "::1") return true;
    if (targetIp.startsWith("fe80:") || targetIp.startsWith("fc") || targetIp.startsWith("fd")) return true;
    return false;
  }

  return true;
}

export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let candidate = (rawUrl || "").trim();
  if (!candidate) {
    throw new Error("Vnesite veljaven spletni naslov (URL).");
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Spletni naslov (URL) ni veljaven.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Podprti sta samo varni povezavi HTTP in HTTPS.");
  }

  const host = parsed.hostname.trim().toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("Notranji ali lokalni naslovi niso dovoljeni.");
  }

  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) {
      throw new Error("Zasebni ali lokalni IP naslovi niso dovoljeni.");
    }
    return parsed;
  }

  try {
    const resolved = await dns.lookup(host, { all: true, verbatim: true });
    if (!resolved || resolved.length === 0) {
      throw new Error("Domene ni bilo mogoče najti.");
    }
    for (const entry of resolved) {
      if (isPrivateOrReservedIp(entry.address)) {
        throw new Error("Ciljni strežnik kaže na zasebno omrežje in ni dovoljen.");
      }
    }
  } catch (err: any) {
    if (err?.message?.includes("ni dovoljen") || err?.message?.includes("Domene")) {
      throw err;
    }
    throw new Error("Domene spletne strani ni bilo mogoče razrešiti.");
  }

  return parsed;
}

function resolveAbsoluteUrl(maybeRelative: string | undefined | null, baseUrl: string): string | undefined {
  const val = (maybeRelative || "").trim();
  if (!val || val.startsWith("data:") || val.startsWith("javascript:") || val.startsWith("#")) {
    return undefined;
  }
  try {
    const resolved = new URL(val, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return undefined;
    return resolved.toString();
  } catch {
    return undefined;
  }
}

function isLikelyLogoOrIconUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    /\.svg(\?|$)/i.test(lower) ||
    /(?:^|[/_.-])(favicon|logo|icon|sprite|pixel|spacer|blank|placeholder|spinner|avatar|badge|dummy|noimage|no-image|1x1)(?:[/_.-]|$)/i.test(lower) ||
    lower.includes("_graphics/") ||
    lower.includes("dummyimage.com") ||
    lower.includes("via.placeholder.com")
  );
}

function parseMetaTags(html: string): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const metaRegex = /<meta\b([^>]*?)>/gi;
  let m: RegExpExecArray | null;

  while ((m = metaRegex.exec(html)) !== null) {
    const attrsStr = m[1];
    const attrs: Record<string, string> = {};
    const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
    let a: RegExpExecArray | null;
    while ((a = attrRegex.exec(attrsStr)) !== null) {
      const key = a[1].toLowerCase();
      const value = a[2] ?? a[3] ?? a[4] ?? "";
      attrs[key] = decodeHtmlEntities(value);
    }

    const nameKey = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase().trim();
    const content = (attrs.content || "").trim();
    if (nameKey && content) {
      if (!map[nameKey]) map[nameKey] = [];
      map[nameKey].push(content);
    }
  }
  return map;
}

function parseLinkTags(html: string): { rel: string; href: string }[] {
  const results: { rel: string; href: string }[] = [];
  const linkRegex = /<link\b([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const attrsStr = m[1];
    const relMatch = attrsStr.match(/rel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
    const hrefMatch = attrsStr.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
    const rel = (relMatch?.[1] || relMatch?.[2] || relMatch?.[3] || "").toLowerCase().trim();
    const href = decodeHtmlEntities(hrefMatch?.[1] || hrefMatch?.[2] || hrefMatch?.[3] || "").trim();
    if (rel && href) {
      results.push({ rel, href });
    }
  }
  return results;
}

function extractContentImagesFromHtml(html: string, baseUrl: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();
  const imgRegex = /<img\b([^>]*?)>/gi;
  let m: RegExpExecArray | null;

  while ((m = imgRegex.exec(html)) !== null) {
    const attrsStr = m[1];
    const srcMatch =
      attrsStr.match(/\bdata-src\s*=\s*(?:"([^"]*)"|'([^']*)')/i) ||
      attrsStr.match(/\bdata-lazy-src\s*=\s*(?:"([^"]*)"|'([^']*)')/i) ||
      attrsStr.match(/\bdata-original\s*=\s*(?:"([^"]*)"|'([^']*)')/i) ||
      attrsStr.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
    const rawSrc = decodeHtmlEntities(srcMatch?.[1] || srcMatch?.[2] || srcMatch?.[3] || "").trim();
    if (!rawSrc) continue;

    const abs = resolveAbsoluteUrl(rawSrc, baseUrl);
    if (!abs || seen.has(abs)) continue;
    if (isLikelyLogoOrIconUrl(abs)) continue;

    // Skip tiny explicit dimensions (e.g. width="16" height="16")
    const widthMatch = attrsStr.match(/\bwidth\s*=\s*["']?(\d+)/i);
    const heightMatch = attrsStr.match(/\bheight\s*=\s*["']?(\d+)/i);
    const w = widthMatch ? parseInt(widthMatch[1], 10) : 0;
    const h = heightMatch ? parseInt(heightMatch[1], 10) : 0;
    if ((w > 0 && w < 80) || (h > 0 && h < 80)) continue;

    seen.add(abs);
    results.push(abs);
    if (results.length >= 8) break;
  }

  return results;
}

function formatPriceString(rawPrice: string | number | undefined, currency?: string): string | undefined {
  if (rawPrice === undefined || rawPrice === null) return undefined;
  const rawStr = String(rawPrice).trim();
  if (!rawStr) return undefined;

  // Already contains currency symbol or non-numeric words like "Po dogovoru"
  if (/€|eur|\$|usd|po dogovoru|brezplačno/i.test(rawStr)) {
    return rawStr.replace(/\s*EUR\b/i, " €");
  }

  const normalizedNum = Number(rawStr.replace(/\s+/g, "").replace(",", "."));
  if (Number.isFinite(normalizedNum) && normalizedNum > 0) {
    const formatted = normalizedNum.toLocaleString("sl-SI", {
      minimumFractionDigits: normalizedNum % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    const cur = (currency || "EUR").toUpperCase();
    return cur === "EUR" || cur === "€" ? `${formatted} €` : `${formatted} ${cur}`;
  }
  return rawStr;
}

function extractPriceFromText(text?: string): string | undefined {
  if (!text) return undefined;
  // Matches e.g. "14900 EUR", "14.900 €", "1.299,99 EUR", "€ 499"
  const afterRegex = /(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,(\d{1,2}))?\s*(€|EUR)\b/i;
  const afterMatch = text.match(afterRegex);
  if (afterMatch) {
    const intRaw = afterMatch[1].replace(/[.\s]/g, "");
    const decRaw = afterMatch[2] || "";
    const num = Number(decRaw ? `${intRaw}.${decRaw}` : intRaw);
    if (Number.isFinite(num) && num > 0 && num < 10_000_000) {
      return `${num.toLocaleString("sl-SI", {
        minimumFractionDigits: decRaw ? Math.min(2, decRaw.length) : 0,
        maximumFractionDigits: 2,
      })} €`;
    }
  }
  const beforeRegex = /(?:€|EUR)\s*(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,(\d{1,2}))?/i;
  const beforeMatch = text.match(beforeRegex);
  if (beforeMatch) {
    const intRaw = beforeMatch[1].replace(/[.\s]/g, "");
    const decRaw = beforeMatch[2] || "";
    const num = Number(decRaw ? `${intRaw}.${decRaw}` : intRaw);
    if (Number.isFinite(num) && num > 0 && num < 10_000_000) {
      return `${num.toLocaleString("sl-SI", {
        minimumFractionDigits: decRaw ? Math.min(2, decRaw.length) : 0,
        maximumFractionDigits: 2,
      })} €`;
    }
  }
  return undefined;
}

function computeDiscountLabel(oldPriceStr?: string, newPriceStr?: string): string | undefined {
  if (!oldPriceStr || !newPriceStr) return undefined;
  const oldNum = parseFloat(oldPriceStr.replace(/[^0-9.,]/g, "").replace(",", "."));
  const newNum = parseFloat(newPriceStr.replace(/[^0-9.,]/g, "").replace(",", "."));
  if (Number.isFinite(oldNum) && Number.isFinite(newNum) && oldNum > newNum && oldNum > 0) {
    const pct = Math.round(((oldNum - newNum) / oldNum) * 100);
    if (pct >= 1 && pct <= 99) return `-${pct}%`;
  }
  return undefined;
}

interface JsonLdExtracted {
  title?: string;
  description?: string;
  images: string[];
  price?: string;
  oldPrice?: string;
  currency?: string;
  brand?: string;
  seller?: string;
  location?: string;
  author?: string;
  publishedTime?: string;
}

function parseJsonLdNodes(html: string): JsonLdExtracted {
  const out: JsonLdExtracted = { images: [] };
  const scriptRegex = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;

  const visitNode = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visitNode);
      return;
    }
    if (Array.isArray(node["@graph"])) {
      visitNode(node["@graph"]);
    }

    const typeRaw = Array.isArray(node["@type"]) ? node["@type"].join(" ") : String(node["@type"] || "");
    const typeLower = typeRaw.toLowerCase();

    const isRelevantPrimary =
      typeLower.includes("product") ||
      typeLower.includes("offer") ||
      typeLower.includes("vehicle") ||
      typeLower.includes("car") ||
      typeLower.includes("realestate") ||
      typeLower.includes("apartment") ||
      typeLower.includes("house") ||
      typeLower.includes("article") ||
      typeLower.includes("webpage");

    if (!out.title && isRelevantPrimary && typeof node.name === "string") {
      out.title = decodeHtmlEntities(node.name);
    }
    if (!out.title && isRelevantPrimary && typeof node.headline === "string") {
      out.title = decodeHtmlEntities(node.headline);
    }
    if (!out.description && isRelevantPrimary && typeof node.description === "string") {
      out.description = stripTags(node.description);
    }
    if (!out.author && node.author) {
      if (typeof node.author === "string") out.author = decodeHtmlEntities(node.author);
      else if (typeof node.author?.name === "string") out.author = decodeHtmlEntities(node.author.name);
    }
    if (!out.publishedTime && typeof node.datePublished === "string") {
      out.publishedTime = node.datePublished;
    }
    if (!out.brand && node.brand) {
      if (typeof node.brand === "string") out.brand = decodeHtmlEntities(node.brand);
      else if (typeof node.brand?.name === "string") out.brand = decodeHtmlEntities(node.brand.name);
    }

    // Images
    const imgField = node.image;
    if (typeof imgField === "string") {
      out.images.push(imgField);
    } else if (Array.isArray(imgField)) {
      for (const entry of imgField) {
        if (typeof entry === "string") out.images.push(entry);
        else if (entry && typeof entry.url === "string") out.images.push(entry.url);
      }
    } else if (imgField && typeof imgField.url === "string") {
      out.images.push(imgField.url);
    }

    // Address / location
    const addr = node.address || node.areaServed || node.location?.address || node.availableAtOrFrom?.address;
    if (!out.location && addr) {
      if (typeof addr === "string") out.location = decodeHtmlEntities(addr);
      else if (typeof addr.addressLocality === "string") out.location = decodeHtmlEntities(addr.addressLocality);
      else if (typeof addr.name === "string") out.location = decodeHtmlEntities(addr.name);
    }

    // Offers
    const offersList = Array.isArray(node.offers) ? node.offers : node.offers ? [node.offers] : (typeLower.includes("offer") ? [node] : []);
    for (const offer of offersList) {
      if (!offer || typeof offer !== "object") continue;
      const cur = typeof offer.priceCurrency === "string" ? offer.priceCurrency : undefined;
      if (!out.currency && cur) out.currency = cur;

      const priceVal = offer.lowPrice ?? offer.price ?? offer.priceSpecification?.price;
      const highVal = offer.highPrice;

      if (!out.price && priceVal !== undefined && priceVal !== null && String(priceVal).trim() !== "") {
        out.price = formatPriceString(priceVal, cur || out.currency);
      }
      if (!out.oldPrice && highVal !== undefined && priceVal !== undefined && Number(highVal) > Number(priceVal)) {
        out.oldPrice = formatPriceString(highVal, cur || out.currency);
      }
      if (!out.seller && offer.seller?.name) {
        out.seller = decodeHtmlEntities(String(offer.seller.name));
      }
    }
  };

  while ((m = scriptRegex.exec(html)) !== null) {
    const jsonText = (m[1] || "").trim();
    if (!jsonText) continue;
    try {
      const parsed = JSON.parse(jsonText);
      visitNode(parsed);
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  return out;
}

function cleanTitleSiteSuffix(rawTitle: string, siteName: string, domain: string): string {
  const title = rawTitle.trim();
  if (!title) return "";
  const escapedSite = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\s*(?:::|[|\\-–—·•:])\\s*(?:www\\.)?(?:${escapedSite}|${escapedDomain})(?:\\s*::\\s*[^|]+)?$`, "i");
  const stripped = title.replace(pattern, "").trim();
  return stripped.length >= 4 ? stripped : title;
}

function isCloudflareOrBotChallengeHtml(html: string): boolean {
  if (!html) return false;
  return (
    /just a moment\.\.\./i.test(html) ||
    /attention required!\s*\|\s*cloudflare/i.test(html) ||
    /\/cdn-cgi\/challenge-platform\//i.test(html) ||
    /window\._cf_chl_opt/i.test(html) ||
    /enable javascript and cookies to continue/i.test(html)
  );
}

function isChallengeTitleOrText(title?: string, desc?: string): boolean {
  const combined = `${title || ""} ${desc || ""}`;
  return (
    /just a moment\.\.\./i.test(combined) ||
    /attention required!\s*\|\s*cloudflare/i.test(combined) ||
    /sorry,\s*you have been blocked/i.test(combined) ||
    /security service to protect itself/i.test(combined) ||
    /checking your browser before accessing/i.test(combined)
  );
}

async function fetchViaMicrolinkFallback(targetUrl: URL): Promise<ExternalEmbedMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS + 1500);

  try {
    const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl.toString())}&palette=false&audio=false&video=false&iframe=false`;
    const res = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    const payload: any = await res.json().catch(() => null);
    if (!res.ok || payload?.status !== "success" || !payload?.data) {
      throw new Error("Ciljna spletna stran blokira samodejni dostop (zaščita Cloudflare).");
    }

    const d = payload.data;
    const rawTitle = decodeHtmlEntities(String(d.title || "")).trim();
    const rawDesc = stripTags(String(d.description || "")).slice(0, 1200);

    if (isChallengeTitleOrText(rawTitle, rawDesc)) {
      throw new Error("Ciljna spletna stran zahteva ročno potrditev (Cloudflare) in ne dovoli samodejnega branja.");
    }

    const resolvedUrl = resolveAbsoluteUrl(d.url, targetUrl.toString()) || targetUrl.toString();
    const canonicalDomain = (() => {
      try {
        return new URL(resolvedUrl).hostname.replace(/^www\./i, "").toLowerCase();
      } catch {
        return targetUrl.hostname.replace(/^www\./i, "").toLowerCase();
      }
    })();

    const siteName = (decodeHtmlEntities(String(d.publisher || "")) || canonicalDomain).trim();
    // Clean patterns like "Jaguar F-Pace ... - prodam :: Avtonet :: www.Avto.net"
    let title = cleanTitleSiteSuffix(rawTitle, siteName, canonicalDomain);
    title = title.replace(/\s*::\s*Avtonet\s*::\s*www\.Avto\.net$/i, "").trim() || title;

    const images: string[] = [];
    const seen = new Set<string>();
    const pushImg = (cand?: string) => {
      const abs = resolveAbsoluteUrl(cand, resolvedUrl);
      if (abs && !seen.has(abs) && !isLikelyLogoOrIconUrl(abs)) {
        seen.add(abs);
        images.push(abs);
      }
    };
    pushImg(d.image?.url);

    const faviconUrl =
      resolveAbsoluteUrl(d.logo?.url, resolvedUrl) ||
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(canonicalDomain)}&sz=64`;

    const price = extractPriceFromText(`${rawTitle} ${rawDesc}`);

    return {
      url: resolvedUrl,
      originalUrl: targetUrl.toString(),
      domain: canonicalDomain,
      siteName,
      faviconUrl,
      title: title || canonicalDomain,
      description: rawDesc,
      imageUrl: images[0],
      images: images.slice(0, 6),
      price,
      author: typeof d.author === "string" && d.author.trim() ? decodeHtmlEntities(d.author) : undefined,
      publishedTime: typeof d.date === "string" && d.date.trim() ? d.date : undefined,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Časovna omejitev pri pridobivanju zaščitene spletne strani je potekla.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchExternalEmbedMetadata(rawUrl: string): Promise<ExternalEmbedMetadata> {
  const initialUrl = await assertSafePublicUrl(rawUrl);
  const cacheKey = initialUrl.toString();

  const cached = embedServerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.meta;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let finalUrlStr = initialUrl.toString();
  let html = "";
  let shouldFallbackToMicrolink = false;
  let directFailureStatus: number | null = null;

  try {
    const response = await fetch(finalUrlStr, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sl-SI,sl;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (response.url) {
      const verifiedFinal = await assertSafePublicUrl(response.url);
      finalUrlStr = verifiedFinal.toString();
    }

    const cfMitigated = (response.headers.get("cf-mitigated") || "").toLowerCase();
    if (response.status === 403 || response.status === 429 || response.status === 503 || cfMitigated === "challenge") {
      shouldFallbackToMicrolink = true;
      directFailureStatus = response.status;
    } else if (!response.ok) {
      throw new Error(`Ciljna spletna stran je vrnila napako (${response.status}).`);
    } else {
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml") && !contentType.includes("text/plain")) {
        throw new Error("Povezava ne kaže na spletno stran (HTML), temveč na drugo vrsto datoteke.");
      }

      const reader = response.body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            total += value.byteLength;
            chunks.push(value);
            if (total >= MAX_HTML_BYTES) {
              await reader.cancel().catch(() => {});
              break;
            }
          }
        }
        html = Buffer.concat(chunks).toString("utf8");
      } else {
        html = (await response.text()).slice(0, MAX_HTML_BYTES);
      }

      if (isCloudflareOrBotChallengeHtml(html)) {
        shouldFallbackToMicrolink = true;
        directFailureStatus = response.status;
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Časovna omejitev pri pridobivanju spletne strani je potekla.");
    }
    if (!shouldFallbackToMicrolink) {
      throw err;
    }
  } finally {
    clearTimeout(timeout);
  }

  let result: ExternalEmbedMetadata;

  if (shouldFallbackToMicrolink) {
    try {
      result = await fetchViaMicrolinkFallback(new URL(finalUrlStr));
    } catch (fallbackErr: any) {
      if (directFailureStatus) {
        throw new Error(
          fallbackErr?.message || `Ciljna spletna stran je vrnila napako (${directFailureStatus}).`
        );
      }
      throw fallbackErr;
    }
  } else {
    const finalParsedUrl = new URL(finalUrlStr);
    const domain = finalParsedUrl.hostname.replace(/^www\./i, "").toLowerCase();

    const meta = parseMetaTags(html);
    const links = parseLinkTags(html);
    const jsonLd = parseJsonLdNodes(html);

    const canonicalRaw = meta["og:url"]?.[0] || links.find((l) => l.rel === "canonical")?.href;
    const canonicalUrl = resolveAbsoluteUrl(canonicalRaw, finalUrlStr) || finalUrlStr;
    const canonicalDomain = (() => {
      try {
        return new URL(canonicalUrl).hostname.replace(/^www\./i, "").toLowerCase();
      } catch {
        return domain;
      }
    })();

    const rawSiteName =
      meta["og:site_name"]?.[0] ||
      meta["application-name"]?.[0] ||
      jsonLd.seller ||
      canonicalDomain;
    const siteName = rawSiteName.trim() || canonicalDomain;

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const rawTitle =
      meta["og:title"]?.[0] ||
      meta["twitter:title"]?.[0] ||
      jsonLd.title ||
      (titleMatch ? stripTags(titleMatch[1]) : "") ||
      (h1Match ? stripTags(h1Match[1]) : "") ||
      canonicalDomain;
    const title = cleanTitleSiteSuffix(rawTitle, siteName, canonicalDomain);

    const rawDesc =
      meta["og:description"]?.[0] ||
      meta["twitter:description"]?.[0] ||
      meta["description"]?.[0] ||
      jsonLd.description ||
      "";
    const description = stripTags(rawDesc).slice(0, 1200);

    // Collect images from OG, Twitter, itemprop=image, JSON-LD, link[rel=image_src], then HTML <img> fallback
    const rawImageCandidates = [
      ...(meta["og:image:secure_url"] || []),
      ...(meta["og:image"] || []),
      ...(meta["og:image:url"] || []),
      ...(meta["twitter:image"] || []),
      ...(meta["twitter:image:src"] || []),
      ...(meta["image"] || []),
      ...(meta["thumbnail"] || []),
      ...(jsonLd.images || []),
      ...links.filter((l) => l.rel === "image_src").map((l) => l.href),
    ];

    const resolvedImages: string[] = [];
    const seenImg = new Set<string>();
    for (const candidate of rawImageCandidates) {
      const abs = resolveAbsoluteUrl(candidate, finalUrlStr);
      if (abs && !seenImg.has(abs)) {
        seenImg.add(abs);
        resolvedImages.push(abs);
      }
    }

    // If structured metadata had zero photos (or only logos), scan content <img> elements
    const nonLogoResolved = resolvedImages.filter((u) => !isLikelyLogoOrIconUrl(u));
    if (nonLogoResolved.length === 0) {
      const htmlImages = extractContentImagesFromHtml(html, finalUrlStr);
      for (const htmlImg of htmlImages) {
        if (!seenImg.has(htmlImg)) {
          seenImg.add(htmlImg);
          resolvedImages.push(htmlImg);
        }
      }
    }

    // Prioritize real non-logo photos first
    resolvedImages.sort((a, b) => Number(isLikelyLogoOrIconUrl(a)) - Number(isLikelyLogoOrIconUrl(b)));

    // Favicon
    const iconCandidate =
      links.find((l) => l.rel === "apple-touch-icon")?.href ||
      links.find((l) => l.rel.includes("icon"))?.href;
    const faviconUrl =
      resolveAbsoluteUrl(iconCandidate, finalUrlStr) ||
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(canonicalDomain)}&sz=64`;

    // Price & discount
    const metaCurrency =
      meta["product:price:currency"]?.[0] ||
      meta["og:price:currency"]?.[0] ||
      jsonLd.currency ||
      "EUR";
    const metaPriceRaw =
      meta["product:price:amount"]?.[0] ||
      meta["og:price:amount"]?.[0] ||
      meta["price"]?.[0];
    const price =
      formatPriceString(metaPriceRaw, metaCurrency) ||
      jsonLd.price ||
      extractPriceFromText(`${rawTitle} ${description}`);

    const metaOldPriceRaw =
      meta["product:original_price:amount"]?.[0] ||
      meta["og:original_price:amount"]?.[0];
    const oldPrice = formatPriceString(metaOldPriceRaw, metaCurrency) || jsonLd.oldPrice;
    const discount = computeDiscountLabel(oldPrice, price);

    // Location
    const location =
      meta["og:locality"]?.[0] ||
      meta["product:location"]?.[0] ||
      jsonLd.location ||
      undefined;

    // Tags
    const rawKeywordStrings = [
      ...(meta["article:tag"] || []),
      ...(meta["keywords"] || []),
    ];
    const tagSet = new Set<string>();
    for (const kStr of rawKeywordStrings) {
      for (const part of kStr.split(",")) {
        const cleaned = part.replace(/^#/, "").trim();
        if (cleaned.length >= 2 && cleaned.length <= 32 && tagSet.size < 6) {
          tagSet.add(cleaned);
        }
      }
    }
    if (jsonLd.brand && tagSet.size < 6) {
      tagSet.add(jsonLd.brand);
    }

    result = {
      url: canonicalUrl,
      originalUrl: initialUrl.toString(),
      domain: canonicalDomain,
      siteName,
      faviconUrl,
      title: title || canonicalDomain,
      description,
      imageUrl: resolvedImages[0],
      images: resolvedImages.slice(0, 6),
      price,
      oldPrice,
      discount,
      location,
      tags: tagSet.size > 0 ? Array.from(tagSet) : undefined,
      publishedTime: meta["article:published_time"]?.[0] || jsonLd.publishedTime,
      author: meta["author"]?.[0] || jsonLd.author,
      fetchedAt: new Date().toISOString(),
    };
  }

  // Cache bounded entries
  if (embedServerCache.size > 200) {
    const firstKey = embedServerCache.keys().next().value;
    if (firstKey) embedServerCache.delete(firstKey);
  }
  embedServerCache.set(cacheKey, {
    meta: result,
    expiresAt: Date.now() + EMBED_CACHE_TTL_MS,
  });

  return result;
}
