interface NetlifyEdgeContext {
  next: (options?: { sendConditionalRequest?: boolean }) => Promise<Response>;
}

const SOCIAL_CRAWLER_UA_REGEX =
  /(facebookexternalhit|facebot|facebookcatalog|meta-externalagent|meta-externalfetcher|twitterbot|linkedinbot|whatsapp|viber|telegrambot|discordbot|slackbot|pinterest|skypeuripreview|redditbot|snapchat|applebot|embedly|vkshare)/i;

const STATIC_ASSET_EXT_REGEX =
  /\.(js|mjs|cjs|css|png|jpe?g|gif|svg|ico|json|woff2?|ttf|eot|webp|avif|map|xml|txt|pdf|mp4|webm)$/i;

export default async function handler(
  request: Request,
  context: NetlifyEdgeContext
): Promise<Response> {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return context.next();
  }

  const url = new URL(request.url);
  const pathname = url.pathname || "/";
  const pathLower = pathname.toLowerCase();

  // Never intercept API endpoints, Netlify internal function routes, or static assets
  if (
    pathLower.startsWith("/api/") ||
    pathLower === "/api" ||
    pathLower.startsWith("/.netlify/") ||
    pathLower.startsWith("/assets/") ||
    pathLower.startsWith("/@") ||
    pathLower.startsWith("/src/") ||
    STATIC_ASSET_EXT_REGEX.test(pathLower)
  ) {
    return context.next();
  }

  const userAgent = request.headers.get("user-agent") || "";
  const forcePrerender = url.searchParams.get("_prerender") === "1";

  if (!forcePrerender && !SOCIAL_CRAWLER_UA_REGEX.test(userAgent)) {
    const response = await context.next();
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const headers = new Headers(response.headers);
      const existingVary = headers.get("vary");
      if (!existingVary) {
        headers.set("Vary", "User-Agent");
      } else if (!existingVary.toLowerCase().includes("user-agent")) {
        headers.set("Vary", `${existingVary}, User-Agent`);
      }
      return new Response(method === "HEAD" ? null : response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    return response;
  }

  try {
    const targetParam = `${pathname}${url.search || ""}`;
    const functionUrl = `${url.origin}/.netlify/functions/og-prerender?url=${encodeURIComponent(
      targetParam
    )}`;

    const upstream = await fetch(functionUrl, {
      method: "GET",
      headers: {
        "user-agent": userAgent,
        "x-forwarded-host": url.host,
        "x-forwarded-proto": url.protocol.replace(":", "") || "https",
        "x-nf-original-path": targetParam,
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!upstream.ok) {
      return context.next();
    }

    const html = await upstream.text();
    const headers = new Headers();
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=300");
    headers.set("Vary", "User-Agent");
    headers.set("X-OG-Prerender", "1");

    return new Response(method === "HEAD" ? null : html, {
      status: 200,
      headers,
    });
  } catch {
    return context.next();
  }
}
