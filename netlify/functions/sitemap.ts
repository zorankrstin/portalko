import type { Handler } from "@netlify/functions";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  buildDynamicSitemapFromFirestore,
  CrawledFirestoreDoc,
  SitemapCollectionName,
} from "../../src/services/sitemapCrawlerService";

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || "(default)";
const API_KEY = firebaseConfig.apiKey;
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;

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

async function fetchCollectionDocsRest(colName: SitemapCollectionName): Promise<CrawledFirestoreDoc[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${FIRESTORE_REST_BASE}:runQuery?key=${encodeURIComponent(API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: colName }],
          limit: 500,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const rows: any[] = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r) => r?.document?.name)
      .map((r) => {
        const fullName = String(r.document.name || "");
        const id = fullName.split("/").pop() || "";
        return {
          id,
          data: decodeFirestoreFields(r.document.fields),
        };
      });
  } catch {
    return [];
  }
}

export const handler: Handler = async (event) => {
  try {
    const snapshot = await buildDynamicSitemapFromFirestore({
      fetchCollectionDocs: fetchCollectionDocsRest,
    });

    const ifNoneMatch = event.headers["if-none-match"] || event.headers["If-None-Match"];
    if (ifNoneMatch && ifNoneMatch === snapshot.etag) {
      return {
        statusCode: 304,
        headers: {
          ETag: snapshot.etag,
          "Last-Modified": snapshot.lastModified,
          "Cache-Control": "public, max-age=900, must-revalidate",
        },
        body: "",
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=900, must-revalidate",
        ETag: snapshot.etag,
        "Last-Modified": snapshot.lastModified,
        "X-Sitemap-Urls": String(snapshot.stats.totalUrls),
      },
      body: snapshot.xml,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: err?.message || "Error generating dynamic sitemap",
    };
  }
};
