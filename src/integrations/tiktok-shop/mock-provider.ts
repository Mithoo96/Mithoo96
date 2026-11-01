/**
 * ⚠️  MOCK TikTok Shop provider — NOT CONNECTED TO TIKTOK. ⚠️
 *
 * Returns deterministic, fictional orders (no real customer data) so the
 * import → verify → pack → ship workflow can be exercised end to end. It does
 * not scrape, does not use browser sessions, cookies or passwords, and never
 * contacts TikTok. Replace with the official TikTok Shop Open API adapter
 * (./official-provider.ts) once the business has legitimate API credentials.
 *
 * Webhook scheme (MOCK ONLY): header `x-mock-signature` = hex HMAC-SHA256 of
 * `${x-mock-timestamp}.${rawBody}` using the connection secret. The official
 * TikTok scheme is different and must be implemented from TikTok's docs.
 */
import { z } from "zod";
import type {
  CommerceChannelProvider,
  ConnectionContext,
  ImportedOrder,
  NormalizedWebhookEvent,
  PlatformIssue,
  PlatformTracking,
  WebhookRequest,
  WebhookVerification,
} from "../types";
import { verifyTimestampedHmac } from "../webhooks/signature";

const HOUR = 3_600_000;

const PRODUCTS = [
  { sku: "ZB-DRS-LIN-M", name: "Linen Wrap Dress — Sand, M", price: 64 },
  { sku: "ZB-TOP-SAT-S", name: "Satin Cami Top — Ivory, S", price: 28 },
  { sku: "ZB-JWL-HOOP-G", name: "Gold Hoop Earrings", price: 22 },
] as const;

/** Fixed fictional platform orders, timed relative to `now`. */
export function mockPlatformOrders(now: Date): ImportedOrder[] {
  const t = now.getTime();
  return [1, 2, 3].map((n) => {
    const p = PRODUCTS[n - 1]!;
    const qty = n === 2 ? 2 : 1;
    const tracking = `9400 1000 0000 0000 77${String(n).padStart(4, "0")}`;
    return {
      externalOrderId: `MOCK-TTS-${9000 + n}`,
      placedAt: new Date(t - n * HOUR),
      shipByAt: new Date(t + (24 + n * 6) * HOUR),
      platformStatus: "AWAITING_SHIPMENT",
      currency: "USD",
      amounts: { subtotal: p.price * qty, shipping: 0, tax: null, total: p.price * qty },
      customer: { externalRef: `mock-buyer-${n}`, displayName: `Mock Buyer ${n}` },
      shippingAddress: { recipientName: `Mock Buyer ${n}`, line1: `${100 + n} Example Street`, city: "Testville", region: "NY", postalCode: "10001", country: "US" },
      items: [{ externalRef: `MOCK-TTS-${9000 + n}-1`, sku: p.sku, name: p.name, quantity: qty, unitPrice: p.price }],
      shipping: {
        carrier: "USPS",
        expectedCarrier: "USPS",
        serviceLevel: "Ground Advantage",
        trackingNumber: tracking,
        label: { externalLabelId: `MOCK-LBL-${9000 + n}`, barcodeValue: tracking.replace(/\s/g, ""), format: "PDF" },
      },
      platformFlags: {},
    } satisfies ImportedOrder;
  });
}

const webhookBodySchema = z.object({
  event_id: z.string().min(1).max(200),
  type: z.enum(["ORDER_CREATED", "ORDER_UPDATED", "ORDER_CANCELLED", "TRACKING_UPDATED", "PLATFORM_ISSUE"]).or(z.string()),
  order_id: z.string().max(200).nullable().optional(),
  occurred_at: z.string().datetime(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export class MockTikTokShopProvider implements CommerceChannelProvider {
  readonly provider = "TIKTOK_SHOP_MOCK";
  readonly channel = "TIKTOK_SHOP";
  readonly isMock = true;

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async importOrders(_conn: ConnectionContext, opts: { since: Date | null; limit?: number }): Promise<ImportedOrder[]> {
    const orders = mockPlatformOrders(this.clock()).filter((o) => !opts.since || o.placedAt >= opts.since);
    return orders.slice(0, opts.limit ?? 50);
  }

  async getOrder(_conn: ConnectionContext, externalOrderId: string): Promise<ImportedOrder | null> {
    return mockPlatformOrders(this.clock()).find((o) => o.externalOrderId === externalOrderId) ?? null;
  }

  async syncOrder(conn: ConnectionContext, externalOrderId: string): Promise<ImportedOrder | null> {
    return this.getOrder(conn, externalOrderId);
  }

  async getShippingDeadline(conn: ConnectionContext, externalOrderId: string): Promise<Date | null> {
    return (await this.getOrder(conn, externalOrderId))?.shipByAt ?? null;
  }

  async getTracking(): Promise<PlatformTracking | null> {
    // The mock platform has no carrier scan data. Never invent acceptance.
    return null;
  }

  async updateTracking(): Promise<{ accepted: boolean; mock: boolean; message?: string }> {
    return { accepted: false, mock: true, message: "MOCK provider: tracking was NOT sent to TikTok Shop." };
  }

  async getPlatformIssues(): Promise<PlatformIssue[]> {
    return [];
  }

  verifyWebhook(conn: ConnectionContext, req: WebhookRequest, now: Date): WebhookVerification {
    if (!conn.secret) return { valid: false, reason: "webhook secret not configured" };
    return verifyTimestampedHmac({
      secret: conn.secret,
      rawBody: req.rawBody,
      signature: req.headers["x-mock-signature"],
      timestamp: req.headers["x-mock-timestamp"],
      now,
    });
  }

  parseWebhook(req: WebhookRequest): NormalizedWebhookEvent {
    const body = webhookBodySchema.parse(JSON.parse(req.rawBody));
    const known = ["ORDER_CREATED", "ORDER_UPDATED", "ORDER_CANCELLED", "TRACKING_UPDATED", "PLATFORM_ISSUE"] as const;
    return {
      externalEventId: body.event_id,
      eventType: (known as readonly string[]).includes(body.type) ? (body.type as NormalizedWebhookEvent["eventType"]) : "UNKNOWN",
      externalOrderId: body.order_id ?? null,
      occurredAt: new Date(body.occurred_at),
      data: body.data,
    };
  }
}
