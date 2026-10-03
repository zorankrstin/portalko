import type { Handler, HandlerEvent } from "@netlify/functions";
import { handler as sendEmailHandler } from "./send-verification-email";

export const handler: Handler = async (event: HandlerEvent, context: any) => {
  const path = event.path.replace(/\/\.netlify\/functions\/api\/?/, "");

  if (path.includes("send-verification-email")) {
    const res = await sendEmailHandler(event, context);
    return res || { statusCode: 200, body: "" };
  }

  if (path.includes("health")) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok", service: "portalko-api", timestamp: new Date().toISOString() }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ok", message: "Portalko API endpoint" }),
  };
};
