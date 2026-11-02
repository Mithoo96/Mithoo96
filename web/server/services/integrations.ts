/**
 * Integration service: order import (idempotent upsert), webhook intake
 * (signature → idempotency ledger → retry-safe processing), carrier sync.
 */
import {organizationModules,requireModules} from "@/core/tenancy/modules";
import {providerChannel} from "@/integrations/commerce/catalog";
import type {Db} from "../db/client";
import { DomainError, notFound } from "@/core/errors";
import { exceptionDedupeKey } from "@/core/exceptions/catalog";
import { getCarrierProvider, getCommerceProvider } from "@/integrations/registry";
import type { ConnectionContext, ImportedOrder, NormalizedWebhookEvent, WebhookRequest } from "@/integrations/types";
import { sha256Hex } from "@/integrations/webhooks/signature";
import { requirePermission, runAsSystem, type ServiceContext } from "../context";
import { withSystemTransaction } from "../db/client";
import { integrationSecret } from "../env";
import { logActivity } from "./activity";
import { raiseException } from "./exceptions";
import { prepareShipment, recordTrackingEvents } from "./shipping";

interface ConnectionRow {
  id: string;
  organization_id: string;
  provider: string;
  kind: string;
  status: string;
  is_mock: boolean;
  external_account_id: string | null;
  credentials_ref: string | null;
  config: Record<string, unknown>;
  last_sync_at: Date | null;
}

async function requireCommerceChannel(db:Db, org:string, provider:string) {
  const row=await db.one<{metadata:Record<string,unknown>}>("select metadata from public.organizations where id = $1",[org]);
  const access=organizationModules(row.metadata);
  requireModules(access,["CORE","COMMERCE","INTEGRATIONS"]);
  const channel=providerChannel(provider);
  if(!channel||!access.enabledCommerceChannels.includes(channel))throw new DomainError("FORBIDDEN","This sales channel is not enabled for the organization");
}

function toConnectionContext(c: ConnectionRow): ConnectionContext {
  return {
    connectionId: c.id,
    organizationId: c.organization_id,
    provider: c.provider,
    externalAccountId: c.external_account_id,
    config: c.config,
    secret: integrationSecret(c.credentials_ref),
  };
}

async function loadConnection(ctx: ServiceContext, connectionId: string): Promise<ConnectionRow> {
  const c = await ctx.db.maybeOne<ConnectionRow>(
    `select * from public.integration_connections where id = $1 and organization_id = $2`,
    [connectionId, ctx.organizationId],
  );
  if (!c) throw notFound("Integration connection");
  if(c.kind==="COMMERCE_CHANNEL")await requireCommerceChannel(ctx.db,ctx.organizationId,c.provider);
  return c;
}

export async function getIntegrationConnections(ctx: ServiceContext) {
  requirePermission(ctx, "integrations.read");
  const rows = await ctx.db.query<ConnectionRow & { display_name: string; last_error: string | null }>(
    `select id, organization_id, provider, kind, status, is_mock, external_account_id, credentials_ref, config, last_sync_at, display_name, last_error
       from public.integration_connections where organization_id = $1 order by created_at`,
    [ctx.organizationId],
  );
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    kind: r.kind,
    displayName: r.display_name,
    status: r.status,
    isMock: r.is_mock,
    externalAccountId: r.external_account_id,
    // Expose only whether a secret is configured, never the value or reference name.
    secretConfigured: /^VAULT_[A-F0-9]{32}$/.test(r.credentials_ref??'') || integrationSecret(r.credentials_ref) !== null,
    lastSyncAt: r.last_sync_at?.toISOString() ?? null,
    lastError: r.last_error,
  }));
}

/**
 * Idempotent upsert of one platform order. Safe to call repeatedly with the
 * same payload (webhook retries, overlapping syncs).
 */
export async function upsertImportedOrder(ctx: ServiceContext, conn: ConnectionRow, imported: ImportedOrder, channel: string): Promise<{ orderId: string; created: boolean }> {
  if (ctx.actor.kind !== "SYSTEM") throw new DomainError("FORBIDDEN", "Imports run as the system");
  const org = ctx.organizationId;
  if(conn.organization_id!==org)throw new DomainError("FORBIDDEN","Integration belongs to another organization");
  await requireCommerceChannel(ctx.db,org,conn.provider);

  const customer = await ctx.db.one<{ id: string }>(
    `insert into public.customers (organization_id, channel, external_ref, display_name, email, phone)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (organization_id, channel, external_ref) where external_ref is not null
     do update set display_name = excluded.display_name, email = coalesce(excluded.email, customers.email), phone = coalesce(excluded.phone, customers.phone)
     returning id`,
    [org, channel, imported.customer.externalRef, imported.customer.displayName, imported.customer.email ?? null, imported.customer.phone ?? null],
  );

  let addressId: string | null = null;
  if (imported.shippingAddress) {
    const a = imported.shippingAddress;
    const existing = await ctx.db.maybeOne<{ id: string }>(
      `select id from public.customer_addresses where customer_id = $1 and line1 = $2 and postal_code = $3 and kind = 'SHIPPING' limit 1`,
      [customer.id, a.line1, a.postalCode],
    );
    addressId =
      existing?.id ??
      (
        await ctx.db.one<{ id: string }>(
          `insert into public.customer_addresses (organization_id, customer_id, kind, recipient_name, line1, line2, city, region, postal_code, country, is_default)
           values ($1, $2, 'SHIPPING', $3, $4, $5, $6, $7, $8, $9, true) returning id`,
          [org, customer.id, a.recipientName, a.line1, a.line2 ?? null, a.city, a.region ?? null, a.postalCode, a.country],
        )
      ).id;
  }

  const orderNumber = imported.orderNumber ?? imported.externalOrderId;
  const amounts = imported.amounts;
  const order = await ctx.db.one<{ id: string; created: boolean; status: string }>(
    `insert into public.orders
       (organization_id, order_number, channel, external_order_id, integration_connection_id, customer_id, shipping_address_id,
        placed_at, ship_by_at, deliver_by_at, currency, subtotal_amount, shipping_amount, tax_amount, total_amount, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     on conflict (organization_id, channel, external_order_id) where external_order_id is not null
     do update set ship_by_at = excluded.ship_by_at,
                   deliver_by_at = excluded.deliver_by_at,
                   metadata = orders.metadata || excluded.metadata
     returning id, (xmax = 0) as created, status`,
    [
      org, orderNumber, channel, imported.externalOrderId, conn.id, customer.id, addressId, imported.placedAt, imported.shipByAt,
      imported.deliverByAt ?? null, imported.currency, amounts?.subtotal ?? null, amounts?.shipping ?? null, amounts?.tax ?? null,
      amounts?.total ?? null,
      JSON.stringify({ platform_status: imported.platformStatus, platform_flags: imported.platformFlags, source_is_mock: conn.is_mock }),
    ],
  );

  if (order.created) {
    for (const item of imported.items) {
      const product = await ctx.db.one<{ id: string }>(
        `insert into public.products (organization_id, sku, name, unit_price, currency)
         values ($1, $2, $3, $4, $5)
         on conflict (organization_id, sku) do update set name = public.products.name
         returning id`,
        [org, item.sku, item.name, item.unitPrice, imported.currency],
      );
      await ctx.db.query(
        `insert into public.order_items (organization_id, order_id, product_id, sku, name, quantity, unit_price, external_ref)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [org, order.id, product.id, item.sku, item.name, item.quantity, item.unitPrice, item.externalRef ?? null],
      );
    }
    await logActivity(ctx, {
      action: "integration.order_imported",
      resourceType: "order",
      resourceId: order.id,
      orderId: order.id,
      summary: `Order ${orderNumber} imported from ${conn.provider}${conn.is_mock ? " (MOCK)" : ""}`,
      metadata: { connectionId: conn.id, externalOrderId: imported.externalOrderId },
    });
    if (imported.shipping && imported.platformStatus === "AWAITING_SHIPMENT") {
      await prepareShipment(ctx, {
        orderId: order.id,
        carrier: imported.shipping.carrier,
        expectedCarrier: imported.shipping.expectedCarrier ?? undefined,
        serviceLevel: imported.shipping.serviceLevel ?? undefined,
        trackingNumber: imported.shipping.trackingNumber ?? undefined,
        label: imported.shipping.label
          ? {
              source: conn.is_mock ? "MOCK" : "PLATFORM",
              barcodeValue: imported.shipping.label.barcodeValue ?? undefined,
              externalLabelId: imported.shipping.label.externalLabelId ?? undefined,
              format: imported.shipping.label.format ?? undefined,
            }
          : undefined,
      });
    }
  }

  if (imported.platformStatus === "CANCELLED" && !["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status)) {
    // Never auto-cancel locally: a human must stop the package and confirm.
    await raiseException(ctx, {
      type: "PLATFORM_ACTION_REQUIRED",
      severity: "CRITICAL",
      dedupeKey: exceptionDedupeKey("PLATFORM_ACTION_REQUIRED", "order", order.id) + ":cancelled",
      orderId: order.id,
      shipmentId: null,
      taskId: null,
      description: `The platform reports order ${orderNumber} as CANCELLED. Stop packing/shipping and confirm the cancellation.`,
      deadlineAt: null,
    }, { source: "INTEGRATION" });
  }
  return { orderId: order.id, created: order.created };
}

export async function importOrdersFromConnection(organizationId: string, connectionId: string, opts: { since?: Date | null } = {}): Promise<{ imported: number; created: number }> {
  return runAsSystem(organizationId, `integration:${connectionId}`, async (ctx) => {
    const conn = await loadConnection(ctx, connectionId);
    if (conn.status !== "ACTIVE") throw new DomainError("INTEGRATION_NOT_CONFIGURED", "Connection is not active");
    const provider = getCommerceProvider(conn.provider);
    const orders = await provider.importOrders(toConnectionContext(conn), { since: opts.since ?? null });
    let created = 0;
    for (const o of orders) {
      const r = await upsertImportedOrder(ctx, conn, o, provider.channel);
      if (r.created) created++;
    }
    await ctx.db.query(`update public.integration_connections set last_sync_at = now(), last_error = null where id = $1`, [conn.id]);
    await ctx.db.query(
      `insert into public.integration_events (organization_id, connection_id, provider, direction, event_type, status, attempts, processed_at, result)
       values ($1, $2, $3, 'SYNC', 'ORDERS_IMPORT', 'PROCESSED', 1, now(), $4)`,
      [organizationId, conn.id, conn.provider, JSON.stringify({ imported: orders.length, created })],
    );
    return { imported: orders.length, created };
  });
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export type WebhookOutcome =
  | { httpStatus: 200; status: "PROCESSED" | "DUPLICATE" | "IGNORED"; eventId: string }
  | { httpStatus: 202; status: "IN_PROGRESS"; eventId: string }
  | { httpStatus: 403 | 401 | 404 | 400 | 503; status: "REJECTED"; reason: string }
  | { httpStatus: 500; status: "FAILED"; eventId: string };

const MAX_ATTEMPTS = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Webhook intake. Never assumes exactly-once delivery:
 *   1. verify signature (reject without side effects),
 *   2. record in the idempotency ledger (unique per connection + event id),
 *   3. claim with a lease (concurrent duplicates get 202),
 *   4. process in its own transaction; failures are recorded and retried.
 */
export async function receiveWebhook(provider: string, connectionId: string, req: WebhookRequest, now: Date = new Date()): Promise<WebhookOutcome> {
  if (!UUID.test(connectionId)) return { httpStatus: 404, status: "REJECTED", reason: "unknown connection" };

  const conn = await withSystemTransaction("webhook:lookup", (db) =>
    db.maybeOne<ConnectionRow>(`select * from public.integration_connections where id = $1 and provider = $2`, [connectionId, provider]),
  );
  if (!conn || conn.status === "DISABLED") return { httpStatus: 404, status: "REJECTED", reason: "unknown connection" };

  try { await withSystemTransaction("webhook:capabilities",db=>requireCommerceChannel(db,conn.organization_id,conn.provider)); } catch { return {httpStatus:403,status:"REJECTED",reason:"sales channel unavailable"}; }

  let adapter;
  try {
    adapter = getCommerceProvider(conn.provider);
  } catch {
    return { httpStatus: 404, status: "REJECTED", reason: "unsupported provider" };
  }
  const connCtx = toConnectionContext(conn);
  if (!connCtx.secret) return { httpStatus: 503, status: "REJECTED", reason: "webhook secret not configured" };

  const verification = adapter.verifyWebhook(connCtx, req, now);
  if (!verification.valid) {
    await withSystemTransaction("webhook:reject", (db) =>
      db.query(
        `insert into public.integration_events (organization_id, connection_id, provider, direction, event_type, payload_sha256, signature_valid, status, last_error)
         values ($1, $2, $3, 'INBOUND_WEBHOOK', 'UNVERIFIED', $4, false, 'REJECTED', $5)`,
        [conn.organization_id, conn.id, conn.provider, sha256Hex(req.rawBody), verification.reason],
      ),
    );
    return { httpStatus: 401, status: "REJECTED", reason: "invalid signature" };
  }

  let event: NormalizedWebhookEvent;
  try {
    event = adapter.parseWebhook(req);
  } catch {
    return { httpStatus: 400, status: "REJECTED", reason: "malformed payload" };
  }

  // Ledger insert (idempotent) + lease claim.
  const claim = await withSystemTransaction("webhook:claim", async (db) => {
    await db.query(
      `insert into public.integration_events
         (organization_id, connection_id, provider, direction, external_event_id, event_type, payload, payload_sha256, signature_valid, status)
       values ($1, $2, $3, 'INBOUND_WEBHOOK', $4, $5, $6, $7, true, 'RECEIVED')
       on conflict (connection_id, external_event_id) where external_event_id is not null do nothing`,
      [conn.organization_id, conn.id, conn.provider, event.externalEventId, event.eventType, req.rawBody, sha256Hex(req.rawBody)],
    );
    const claimed = await db.maybeOne<{ id: string }>(
      `update public.integration_events
          set status = 'PROCESSING', locked_at = now(), attempts = attempts + 1
        where connection_id = $1 and external_event_id = $2
          and (status in ('RECEIVED','FAILED') or (status = 'PROCESSING' and locked_at < now() - interval '5 minutes'))
          and attempts < $3
        returning id`,
      [conn.id, event.externalEventId, MAX_ATTEMPTS],
    );
    const current = await db.one<{ id: string; status: string }>(
      `select id, status from public.integration_events where connection_id = $1 and external_event_id = $2`,
      [conn.id, event.externalEventId],
    );
    return { claimedId: claimed?.id ?? null, current };
  });

  if (!claim.claimedId) {
    const s = claim.current.status;
    if (s === "PROCESSED" || s === "IGNORED" || s === "DEAD_LETTER") return { httpStatus: 200, status: "DUPLICATE", eventId: claim.current.id };
    return { httpStatus: 202, status: "IN_PROGRESS", eventId: claim.current.id };
  }

  try {
    const result = await runAsSystem(conn.organization_id, `integration:${conn.id}`, async (ctx) => {
      const r = await handleWebhookEvent(ctx, conn, event);
      await ctx.db.query(
        `update public.integration_events set status = $2, processed_at = now(), locked_at = null, last_error = null, result = $3 where id = $1`,
        [claim.claimedId, r.ignored ? "IGNORED" : "PROCESSED", JSON.stringify(r)],
      );
      return r;
    }, { now: () => now });
    return { httpStatus: 200, status: result.ignored ? "IGNORED" : "PROCESSED", eventId: claim.claimedId };
  } catch (err) {
    const message = (err as Error).message?.slice(0, 500) ?? "processing error";
    await withSystemTransaction("webhook:fail", (db) =>
      db.query(
        `update public.integration_events
            set status = case when attempts >= $3 then 'DEAD_LETTER' else 'FAILED' end,
                locked_at = null, last_error = $2,
                next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, attempts)::int))
          where id = $1`,
        [claim.claimedId, message, MAX_ATTEMPTS],
      ),
    );
    return { httpStatus: 500, status: "FAILED", eventId: claim.claimedId };
  }
}

async function handleWebhookEvent(ctx: ServiceContext, conn: ConnectionRow, event: NormalizedWebhookEvent): Promise<{ ignored: boolean; action: string; orderId?: string }> {
  const adapter = getCommerceProvider(conn.provider);
  const connCtx = toConnectionContext(conn);
  switch (event.eventType) {
    case "ORDER_CREATED":
    case "ORDER_UPDATED":
    case "ORDER_CANCELLED": {
      if (!event.externalOrderId) return { ignored: true, action: "no_order_id" };
      // Re-fetch from the platform rather than trusting the webhook body.
      const imported = await adapter.getOrder(connCtx, event.externalOrderId);
      if (!imported) return { ignored: true, action: "order_not_found_on_platform" };
      const effective = event.eventType === "ORDER_CANCELLED" ? { ...imported, platformStatus: "CANCELLED" as const } : imported;
      const r = await upsertImportedOrder(ctx, conn, effective, adapter.channel);
      return { ignored: false, action: r.created ? "order_created" : "order_updated", orderId: r.orderId };
    }
    case "TRACKING_UPDATED": {
      if (!event.externalOrderId) return { ignored: true, action: "no_order_id" };
      const order = await ctx.db.maybeOne<{ id: string }>(
        `select id from public.orders where organization_id = $1 and channel = $2 and external_order_id = $3`,
        [ctx.organizationId, adapter.channel, event.externalOrderId],
      );
      if (!order) return { ignored: true, action: "unknown_order" };
      const shipment = await ctx.db.maybeOne<{ id: string }>(
        `select id from public.shipments where order_id = $1 and status <> 'CANCELLED' order by created_at desc limit 1`,
        [order.id],
      );
      if (!shipment) return { ignored: true, action: "no_shipment" };
      const d = event.data as { normalized_status?: string; description?: string; location?: string };
      await recordTrackingEvents(ctx, shipment.id, [
        {
          normalizedStatus: (d.normalized_status ?? "UNKNOWN") as never,
          occurredAt: event.occurredAt,
          source: conn.is_mock ? "MOCK" : "WEBHOOK",
          description: d.description,
          location: d.location,
          externalEventId: event.externalEventId,
        },
      ]);
      return { ignored: false, action: "tracking_recorded", orderId: order.id };
    }
    case "PLATFORM_ISSUE": {
      const order = event.externalOrderId
        ? await ctx.db.maybeOne<{ id: string }>(
            `select id from public.orders where organization_id = $1 and channel = $2 and external_order_id = $3`,
            [ctx.organizationId, adapter.channel, event.externalOrderId],
          )
        : null;
      const description = typeof event.data.description === "string" ? event.data.description.slice(0, 1000) : "The platform requires an action.";
      await raiseException(ctx, {
        type: "PLATFORM_ACTION_REQUIRED",
        severity: "HIGH",
        dedupeKey: `PLATFORM_ACTION_REQUIRED:event:${event.externalEventId}`,
        orderId: order?.id ?? null,
        shipmentId: null,
        taskId: null,
        description,
        deadlineAt: null,
      }, { source: "INTEGRATION" });
      return { ignored: false, action: "exception_raised", orderId: order?.id };
    }
    default:
      return { ignored: true, action: "unsupported_event_type" };
  }
}

/** Poll carrier APIs for live shipments (cron). Carriers without a configured adapter are skipped honestly. */
export async function syncCarrierTracking(organizationId: string): Promise<{ checked: number; updated: number; skipped: number }> {
  return runAsSystem(organizationId, "system:carrier-sync", async (ctx) => {
    const shipments = await ctx.db.query<{ id: string; carrier: string | null; tracking_number: string | null }>(
      `select s.id, s.carrier, s.tracking_number from public.shipments s join public.orders o on o.id = s.order_id
        where s.organization_id = $1 and s.tracking_number is not null and o.status in ('READY_TO_SHIP','SHIPPED')`,
      [organizationId],
    );
    let updated = 0;
    let skipped = 0;
    for (const s of shipments) {
      const provider = s.carrier ? getCarrierProvider(s.carrier) : null;
      if (!provider) {
        skipped++;
        continue;
      }
      try {
        const events = await provider.getTrackingEvents(s.tracking_number!);
        if (events.length === 0) continue;
        const r = await recordTrackingEvents(
          ctx,
          s.id,
          events.map((e) => ({ ...e, source: provider.isMock ? ("MOCK" as const) : ("CARRIER_API" as const) })),
        );
        if (r.inserted > 0) updated++;
      } catch (err) {
        if ((err as DomainError).code === "INTEGRATION_NOT_CONFIGURED") skipped++;
        else throw err;
      }
    }
    return { checked: shipments.length, updated, skipped };
  });
}
