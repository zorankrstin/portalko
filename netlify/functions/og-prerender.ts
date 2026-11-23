import type { Handler, HandlerEvent } from "@netlify/functions";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  OgCollectionName,
  CachedOgDoc,
  buildPreRenderedCrawlerHtml,
  extractFirstDataImageUri,
  resolveBestOgImageUrl,
  resolveOgMetadataFromLookup,
} from "../../src/services/ogMetaGeneratorService";

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || "(default)";
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;
const SITE_URL = "https://portalko.net";

function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return undefined;
  if ("stringValue" in val) return String(val.stringValue);
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("timestampValue" in val) return String(val.timestampValue);
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) {
    const values = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return values.map(decodeFirestoreValue);
  }
  if ("mapValue" in val) {
    return decodeFirestoreFields(val.mapValue?.fields);
  }
  return undefined;
}

function decodeFirestoreFields(fields: Record<string, any> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  if (!fields || typeof fields !== "object") return out;
  for (const [key, rawVal] of Object.entries(fields)) {
    const decoded = decodeFirestoreValue(rawVal);
    if (decoded !== undefined) {
      out[key] = decoded;
    }
  }
  return out;
}

async function fetchCollectionDocsRest(colName: OgCollectionName): Promise<CachedOgDoc[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${FIRESTORE_REST_BASE}/${encodeURIComponent(colName)}?pageSize=200`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const json: any = await res.json();
    const docs = Array.isArray(json?.documents) ? json.documents : [];
    return docs.map((d: any) => {
      const fullName = String(d?.name || "");
      const id = fullName.split("/").pop() || "";
      return {
        id,
        data: decodeFirestoreFields(d?.fields),
      };
    });
  } catch {
    return [];
  }
}

async function fetchSingleDocRest(colName: OgCollectionName, docId: string): Promise<Record<string, any> | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `${FIRESTORE_REST_BASE}/${encodeURIComponent(colName)}/${encodeURIComponent(docId)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const json: any = await res.json();
    return json?.fields ? decodeFirestoreFields(json.fields) : null;
  } catch {
    return null;
  }
}

async function rehydrateShardedDocRest(
  colName: OgCollectionName,
  docId: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  if (!data?.hasChunkedContent || colName === "directory") return data;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `${FIRESTORE_REST_BASE}/${encodeURIComponent(colName)}/${encodeURIComponent(docId)}/chunks?pageSize=50`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return data;
    const json: any = await res.json();
    const docs = Array.isArray(json?.documents) ? json.documents : [];
    if (docs.length === 0) return data;
    const pieces = docs
      .map((d: any) => decodeFirestoreFields(d?.fields))
      .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
      .map((c: any) => String(c.data || ""))
      .join("");
    if (!pieces) return data;
    return { ...data, ...JSON.parse(pieces) };
  } catch {
    return data;
  }
}

async function getPortalFallbackImageRest(): Promise<string> {
  const settings = await fetchSingleDocRest("settings" as any, "portal");
  if (settings?.useFallbackForMissingImages && typeof settings?.fallbackImageUrl === "string") {
    return settings.fallbackImageUrl.trim();
  }
  return "";
}

function resolveNetlifyOrigin(event: HandlerEvent): string {
  const host = (event.headers["x-forwarded-host"] || event.headers.host || "").split(",")[0].trim();
  if (!host) return SITE_URL;
  const proto = (event.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return `${proto}://${host}`;
}

export const handler: Handler = async (event) => {
  const origin = resolveNetlifyOrigin(event);
  const pathLower = (event.path || "").toLowerCase();

  // Dynamic OG image serving for data-URI cover/inline images
  const ogImgMatch = pathLower.match(/\/api\/og-image\/(posts|ads|events|directory)\/([^/?#]+)/i);
  if (ogImgMatch) {
    const colName = ogImgMatch[1] as OgCollectionName;
    const docId = decodeURIComponent(ogImgMatch[2]);
    let data = await fetchSingleDocRest(colName, docId);
    if (data?.hasChunkedContent && !extractFirstDataImageUri(data)) {
      data = await rehydrateShardedDocRest(colName, docId, data);
    }
    const dataUri = data ? extractFirstDataImageUri(data) : null;
    if (dataUri) {
      const m = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
      if (m) {
        return {
          statusCode: 200,
          isBase64Encoded: true,
          headers: {
            "Content-Type": m[1],
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
          body: m[2],
        };
      }
    }
    const fallbackUrl = data ? resolveBestOgImageUrl(colName, docId, data, origin) : null;
    if (fallbackUrl && !fallbackUrl.includes("/api/og-image/")) {
      return {
        statusCode: 302,
        headers: { Location: fallbackUrl },
        body: "",
      };
    }
    return {
      statusCode: 302,
      headers: { Location: `${origin}/favicon.png` },
      body: "",
    };
  }

  const targetUrl = String(
    event.queryStringParameters?.url || event.queryStringParameters?.path || "/"
  ).trim();
  const portalFallbackImage = await getPortalFallbackImageRest();

  const meta = await resolveOgMetadataFromLookup(targetUrl, origin, {
    siteUrl: SITE_URL,
    portalFallbackImage,
    getCollectionDocs: fetchCollectionDocsRest,
    rehydrateShardedDoc: rehydrateShardedDocRest,
  });

  if (pathLower.includes("/api/meta/og")) {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ ok: true, meta }),
    };
  }

  const html = buildPreRenderedCrawlerHtml(meta, origin);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Vary": "User-Agent",
      "X-OG-Prerender": "1",
    },
    body: html,
  };
};
