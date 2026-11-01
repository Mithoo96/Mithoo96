import { NextResponse, type NextRequest } from "next/server";
import { receiveWebhook } from "@/server/services/integrations";

/**
 * Inbound webhooks: POST /api/webhooks/{provider}/{connectionId}
 *   provider: kebab-case provider code, e.g. "tiktok-shop-mock"
 * Responds 2xx only after the event is durably recorded; 5xx asks the sender
 * to retry (processing is idempotent).
 */
const MAX_BODY_BYTES = 512 * 1024;

export async function POST(request: NextRequest, ctx: { params: Promise<{ provider: string; connectionId: string }> }) {
  const { provider, connectionId } = await ctx.params;
  if (!/^[a-z0-9-]{2,40}$/.test(provider)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => (headers[key.toLowerCase()] = value));

  try {
    const outcome = await receiveWebhook(provider.toUpperCase().replace(/-/g, "_"), connectionId, { rawBody, headers });
    const body = outcome.status === "REJECTED" ? { status: outcome.status, error: outcome.reason } : { status: outcome.status, eventId: outcome.eventId };
    return NextResponse.json(body, { status: outcome.httpStatus });
  } catch (err) {
    console.error("[webhook] unexpected failure", (err as Error).message);
    return NextResponse.json({ status: "FAILED" }, { status: 500 });
  }
}
