import type { Handler } from "@netlify/functions";
import { assertSafePublicUrl } from "../../src/services/externalEmbedFetcher";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  const rawImgUrl = String(event.queryStringParameters?.url || "").trim();
  if (!rawImgUrl) {
    return { statusCode: 400, body: "" };
  }

  try {
    const safeUrl = await assertSafePublicUrl(rawImgUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const upstream = await fetch(safeUrl.toString(), {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "sl-SI,sl;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });

      if (!upstream.ok) {
        return { statusCode: upstream.status, body: "" };
      }

      const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
      if (!contentType.startsWith("image/")) {
        return { statusCode: 415, body: "" };
      }

      const arrBuf = await upstream.arrayBuffer();
      if (arrBuf.byteLength === 0 || arrBuf.byteLength > 5 * 1024 * 1024) {
        return { statusCode: 413, body: "" };
      }

      return {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
        body: Buffer.from(arrBuf).toString("base64"),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return { statusCode: 404, body: "" };
  }
};
