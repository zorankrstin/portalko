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
  const pattern = new RegExp(`\\s*[|\\-–—·•:]\\s*(?:${escapedSite}|${escapedDomain})$`, "i");
  const stripped = title.replace(pattern, "").trim();
  return stripped.length >= 4 ? stripped : title;
}

export async function fetchExternalEmbedMetadata(rawUrl: string): Promise<ExternalEmbedMetadata> {
  const initialUrl = await assertSafePublicUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let finalUrlStr = initialUrl.toString();
  let html = "";

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

    if (!response.ok) {
      throw new Error(`Ciljna spletna stran je vrnila napako (${response.status}).`);
    }

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
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Časovna omejitev pri pridobivanju spletne strani je potekla.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

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

  // Collect images from OG, Twitter, JSON-LD, and link[rel=image_src]
  const rawImageCandidates = [
    ...(meta["og:image:secure_url"] || []),
    ...(meta["og:image"] || []),
    ...(meta["og:image:url"] || []),
    ...(meta["twitter:image"] || []),
    ...(meta["twitter:image:src"] || []),
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
  const price = formatPriceString(metaPriceRaw, metaCurrency) || jsonLd.price;

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

  return {
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
