import type { Handler, HandlerEvent } from "@netlify/functions";
import { handler as sendEmailHandler } from "./send-verification-email";

interface ServerRssFeedConfig {
  id: string;
  url: string;
  name: string;
  active: boolean;
}

interface ServerNewsItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
  thumbnail?: string;
  category?: string;
  feedId?: string;
}

const DEFAULT_NETLIFY_FEEDS: ServerRssFeedConfig[] = [
  { id: 'rtvslo', url: 'https://img.rtvslo.si/feeds/00.xml', name: 'RTV Slovenija', active: true },
  { id: '24ur', url: 'https://www.24ur.com/rss', name: '24ur.com', active: true },
  { id: 'delo', url: 'https://www.delo.si/rss', name: 'Delo.si', active: true },
  { id: 'n1info', url: 'https://n1info.si/feed/', name: 'N1 Slovenija', active: true }
];

let netlifyRssCache: {
  timestamp: number;
  items: ServerNewsItem[];
} = {
  timestamp: 0,
  items: []
};

function cleanHtmlText(raw: string): string {
  if (!raw) return '';
  let str = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  str = str.replace(/<\/?[^>]+(>|$)/g, ' ');
  str = str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#38;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return str;
}

function parseRssXml(xmlText: string, sourceName: string, feedId: string): ServerNewsItem[] {
  const items: ServerNewsItem[] = [];
  const itemMatches = xmlText.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) || [];

  for (let idx = 0; idx < itemMatches.length; idx++) {
    const raw = itemMatches[idx];

    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? cleanHtmlText(titleMatch[1]) : '';
    if (!title) continue;

    let link = '';
    const linkMatch = raw.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    if (linkMatch && linkMatch[1] && linkMatch[1].trim()) {
      link = cleanHtmlText(linkMatch[1]);
    } else {
      const hrefMatch = raw.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (hrefMatch) link = hrefMatch[1].trim();
    }
    if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) continue;

    const descMatch = raw.match(/<(description|summary|content:encoded|content)[^>]*>([\s\S]*?)<\/(description|summary|content:encoded|content)>/i);
    const desc = descMatch ? cleanHtmlText(descMatch[2]) : '';

    const dateMatch = raw.match(/<(pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(pubDate|published|updated|dc:date)>/i);
    const pubDate = dateMatch ? cleanHtmlText(dateMatch[2]) : new Date().toISOString();

    const catMatch = raw.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
    let category = catMatch ? cleanHtmlText(catMatch[1]) : 'Slovenija';
    if (!category || category === 'true') category = 'Slovenija';

    let thumbnail = '';
    const encMatch = raw.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    if (encMatch && encMatch[1]) thumbnail = encMatch[1].trim();
    
    if (!thumbnail) {
      const mediaMatch = raw.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
      if (mediaMatch && mediaMatch[1]) thumbnail = mediaMatch[1].trim();
    }
    if (!thumbnail) {
      const imgMatch = raw.match(/(?:<|&lt;)img[^>]+src=(?:["']|&#34;|&quot;)(https?:\/\/[^"'\s&;]+)/i);
      if (imgMatch && imgMatch[1]) thumbnail = imgMatch[1].trim();
    }

    items.push({
      id: `rss-${feedId}-${idx}-${Buffer.from(link).toString('base64').slice(-16).replace(/[/+=]/g, '')}`,
      title,
      link,
      description: desc,
      pubDate,
      sourceName,
      thumbnail: thumbnail || undefined,
      category,
      feedId
    });
  }

  return items;
}

async function fetchFeed(feed: ServerRssFeedConfig, timeoutMs = 6000): Promise<ServerNewsItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 PortalkoNews/2.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*;q=0.9',
        'Accept-Language': 'sl,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (!response.ok) return [];
    const xml = await response.text();
    return parseRssXml(xml, feed.name, feed.id);
  } catch {
    return [];
  }
}

export const handler: Handler = async (event: HandlerEvent, context: any) => {
  const path = event.path.replace(/\/\.netlify\/functions\/api\/?/, "");

  // Verification email handling
  if (path.includes("send-verification-email")) {
    const res = await sendEmailHandler(event, context);
    return res || { statusCode: 200, body: "" };
  }

  // Health endpoint
  if (path.includes("health")) {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ status: "ok", service: "portalko-api", timestamp: new Date().toISOString() }),
    };
  }

  // RSS News Aggregation endpoint (/api/rss/news)
  if (path.includes("rss/news")) {
    const now = Date.now();
    const CACHE_TTL_MS = 2.5 * 60 * 1000;

    let force = event.queryStringParameters?.force === "true";
    let requestedFeeds = DEFAULT_NETLIFY_FEEDS;

    if (event.body) {
      try {
        const parsedBody = JSON.parse(event.body);
        if (parsedBody.force) force = true;
        if (Array.isArray(parsedBody.feeds) && parsedBody.feeds.length > 0) {
          const valid = parsedBody.feeds.filter((f: any) => f && f.url && f.active !== false);
          if (valid.length > 0) requestedFeeds = valid;
        }
      } catch {}
    }

    // Return warm cache if still fresh and not forcing
    if (!force && netlifyRssCache.items.length > 0 && (now - netlifyRssCache.timestamp) < CACHE_TTL_MS) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=120"
        },
        body: JSON.stringify({
          success: true,
          count: netlifyRssCache.items.length,
          items: netlifyRssCache.items,
          cached: true,
          fetchedAt: new Date(netlifyRssCache.timestamp).toISOString()
        })
      };
    }

    try {
      const feedResults = await Promise.allSettled(requestedFeeds.map(feed => fetchFeed(feed)));
      const allItems: ServerNewsItem[] = [];
      feedResults.forEach(r => {
        if (r.status === "fulfilled" && Array.isArray(r.value)) {
          allItems.push(...r.value);
        }
      });

      if (allItems.length > 0) {
        const seenLinks = new Set<string>();
        const seenTitles = new Set<string>();
        const uniqueItems: ServerNewsItem[] = [];

        for (const item of allItems) {
          const normLink = item.link.toLowerCase().replace(/\/+$/, "");
          const normTitle = item.title.toLowerCase().trim();
          if (!seenLinks.has(normLink) && !seenTitles.has(normTitle)) {
            seenLinks.add(normLink);
            seenTitles.add(normTitle);
            uniqueItems.push(item);
          }
        }

        uniqueItems.sort((a, b) => {
          const timeA = new Date(a.pubDate).getTime();
          const timeB = new Date(b.pubDate).getTime();
          if (isNaN(timeA) || isNaN(timeB)) return 0;
          return timeB - timeA;
        });

        netlifyRssCache = {
          timestamp: now,
          items: uniqueItems
        };

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=120"
          },
          body: JSON.stringify({
            success: true,
            count: uniqueItems.length,
            items: uniqueItems,
            cached: false,
            fetchedAt: new Date(now).toISOString()
          })
        };
      }

      if (netlifyRssCache.items.length > 0) {
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60"
          },
          body: JSON.stringify({
            success: true,
            count: netlifyRssCache.items.length,
            items: netlifyRssCache.items,
            cached: true,
            fallback: true
          })
        };
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ success: true, count: 0, items: [] })
      };
    } catch (err: any) {
      if (netlifyRssCache.items.length > 0) {
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({
            success: true,
            count: netlifyRssCache.items.length,
            items: netlifyRssCache.items,
            cached: true,
            fallback: true
          })
        };
      }
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: false, error: err.message, items: [] })
      };
    }
  }

  // XML RSS Proxy endpoint (/api/rss/proxy)
  if (path.includes("rss/proxy")) {
    const targetUrl = event.queryStringParameters?.url;
    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
        body: "Parameter 'url' is required and must start with http:// or https://"
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const upstream = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 PortalkoNews/2.0",
          "Accept": "application/rss+xml, application/xml, text/xml, */*;q=0.8"
        },
        redirect: "follow"
      });
      clearTimeout(timer);

      const xml = await upstream.text();
      return {
        statusCode: upstream.status,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=300"
        },
        body: xml
      };
    } catch {
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: "Failed to fetch upstream RSS feed."
      };
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ status: "ok", message: "Portalko API endpoint" }),
  };
};
