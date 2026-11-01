/**
 * Integration contracts. Core services depend ONLY on these interfaces; each
 * platform/carrier lives in its own adapter folder. Adapters never receive raw
 * secrets from the database — secrets are resolved from the environment by
 * reference (integration_connections.credentials_ref).
 */
import type { TrackingNormalizedStatus } from "@/core/shipping/verification";

export interface ConnectionContext {
  readonly connectionId: string;
  readonly organizationId: string;
  readonly provider: string;
  readonly externalAccountId: string | null;
  readonly config: Readonly<Record<string, unknown>>;
  /** Resolved secret (from env via credentials_ref) or null if not configured. */
  readonly secret: string | null;
}

export interface ImportedOrder {
  readonly externalOrderId: string;
  readonly orderNumber?: string;
  readonly placedAt: Date;
  readonly shipByAt: Date | null;
  readonly deliverByAt?: Date | null;
  readonly platformStatus: "AWAITING_SHIPMENT" | "AWAITING_COLLECTION" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "ON_HOLD";
  readonly currency: string | null;
  /** Only what the platform actually reports; never estimated. */
  readonly amounts: { subtotal: number | null; shipping: number | null; tax: number | null; total: number | null } | null;
  readonly customer: { externalRef: string; displayName: string; email?: string | null; phone?: string | null };
  readonly shippingAddress: { recipientName: string; line1: string; line2?: string | null; city: string; region?: string | null; postalCode: string; country: string } | null;
  readonly items: readonly { externalRef?: string; sku: string; name: string; quantity: number; unitPrice: number | null }[];
  readonly shipping: {
    readonly carrier: string;
    readonly expectedCarrier: string | null;
    readonly serviceLevel: string | null;
    readonly trackingNumber: string | null;
    readonly label: { externalLabelId: string | null; barcodeValue: string | null; format: "PDF" | "PNG" | "ZPL" | null } | null;
  } | null;
  readonly platformFlags: { refundRisk?: boolean; platformActionRequired?: string | null; customerResponseRequired?: boolean };
}

export interface PlatformTracking {
  readonly carrier: string | null;
  readonly trackingNumber: string | null;
  readonly events: readonly { normalizedStatus: TrackingNormalizedStatus; occurredAt: Date; description?: string; location?: string; externalEventId?: string }[];
}

export interface PlatformIssue {
  readonly externalOrderId: string | null;
  readonly kind: "ACTION_REQUIRED" | "REFUND_REQUEST" | "CUSTOMER_MESSAGE" | "POLICY_WARNING";
  readonly description: string;
  readonly deadlineAt: Date | null;
}

export interface WebhookRequest {
  readonly rawBody: string;
  readonly headers: Readonly<Record<string, string | undefined>>;
}

export type WebhookVerification = { readonly valid: true } | { readonly valid: false; readonly reason: string };

export interface NormalizedWebhookEvent {
  readonly externalEventId: string;
  readonly eventType: "ORDER_CREATED" | "ORDER_UPDATED" | "ORDER_CANCELLED" | "TRACKING_UPDATED" | "PLATFORM_ISSUE" | "UNKNOWN";
  readonly externalOrderId: string | null;
  readonly occurredAt: Date;
  readonly data: Readonly<Record<string, unknown>>;
}

/** A sales channel (TikTok Shop, Shopify, Amazon, ...). */
export interface CommerceChannelProvider {
  readonly provider: string;
  readonly channel: string;
  readonly isMock: boolean;
  importOrders(conn: ConnectionContext, opts: { since: Date | null; limit?: number }): Promise<ImportedOrder[]>;
  getOrder(conn: ConnectionContext, externalOrderId: string): Promise<ImportedOrder | null>;
  syncOrder(conn: ConnectionContext, externalOrderId: string): Promise<ImportedOrder | null>;
  getShippingDeadline(conn: ConnectionContext, externalOrderId: string): Promise<Date | null>;
  getTracking(conn: ConnectionContext, externalOrderId: string): Promise<PlatformTracking | null>;
  updateTracking(conn: ConnectionContext, externalOrderId: string, tracking: { carrier: string; trackingNumber: string }): Promise<{ accepted: boolean; mock: boolean; message?: string }>;
  getPlatformIssues(conn: ConnectionContext): Promise<PlatformIssue[]>;
  verifyWebhook(conn: ConnectionContext, req: WebhookRequest, now: Date): WebhookVerification;
  parseWebhook(req: WebhookRequest): NormalizedWebhookEvent;
}

/** A shipping carrier (USPS, UPS, ...). */
export interface CarrierProvider {
  readonly carrier: string;
  readonly isMock: boolean;
  validateTrackingNumber(trackingNumber: string): boolean;
  getTrackingEvents(trackingNumber: string): Promise<PlatformTracking["events"]>;
}
