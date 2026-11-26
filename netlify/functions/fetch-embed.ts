import type { Handler } from "@netlify/functions";
import { fetchExternalEmbedMetadata } from "../../src/services/externalEmbedFetcher";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  try {
    let targetUrl = event.queryStringParameters?.url || "";
    if (!targetUrl && event.body) {
      try {
        const parsedBody = JSON.parse(event.body);
        targetUrl = typeof parsedBody?.url === "string" ? parsedBody.url : "";
      } catch {
        // ignore invalid body
      }
    }

    if (!targetUrl.trim()) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ok: false, error: "Manjka parameter url." }),
      };
    }

    const meta = await fetchExternalEmbedMetadata(targetUrl);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ ok: true, meta }),
    };
  } catch (err: any) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        ok: false,
        error: err?.message || "Napaka pri branju zunanje spletne strani.",
      }),
    };
  }
};
