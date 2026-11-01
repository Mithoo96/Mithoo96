/**
 * Order service: controlled lifecycle transitions + order queries.
 */
import { z } from "zod";
import { DomainError, forbidden, notFound } from "@/core/errors";
import {
  ORDER_EXCEPTION_STATES,
  ORDER_STATUSES,
  allowedNextStatuses,
  evaluateTransition,
  type OrderExceptionState,
  type OrderStatus,
  type TransitionSnapshot,
} from "@/core/orders/state-machine";
import { CARRIER_PROOF_SOURCES } from "@/core/shipping/verification";
import { can } from "@/core/tenancy/permissions";
import { actorRole, actorUserId, requirePermission, type ServiceContext } from "../context";
import { setChangeReason } from "../db/client";
import { getActivityTimeline, type TimelineEntry } from "./activity";
import { toExceptionView, type ExceptionView } from "./exceptions";
import { isApprovalRequired } from "./settings";

const LIVE_SHIPMENT = `s.status <> 'CANCELLED'`;
const ACTIVE_LABEL = `l.status in ('PENDING','READY','PRINTED')`;
const VERIFIED_STATES = ["VERIFIED", "AWAITING_CARRIER", "CARRIER_ACCEPTED", "IN_TRANSIT", "DELIVERED"];

interface OrderRow {
  id: string;
  organization_id: string;
  order_number: string;
  status: OrderStatus;
  exception_state: OrderExceptionState | null;
  shipping_address_id: string | null;
}

export async function loadTransitionSnapshot(
  ctx: ServiceContext,
  orderId: string,
  opts: { reason?: string | null; to?: OrderStatus } = {},
): Promise<{ order: OrderRow; snapshot: TransitionSnapshot }> {
  const order = await ctx.db.maybeOne<OrderRow>(
    `select id, organization_id, order_number, status, exception_state, shipping_address_id
       from public.orders where id = $1 and organization_id = $2`,
    [orderId, ctx.organizationId],
  );
  if (!order) throw notFound("Order");
  const facts = await ctx.db.one<{
    item_count: number;
    shipment_id: string | null;
    verification_status: string | null;
    scan_passed: boolean;
    has_label: boolean;
    carrier_accepted: boolean;
    carrier_delivered: boolean;
    has_task: boolean;
  }>(
    `with sh as (
       select s.* from public.shipments s
        where s.order_id = $1 and ${LIVE_SHIPMENT}
        order by s.created_at desc limit 1
     )
     select
       (select count(*)::int from public.order_items i where i.order_id = $1) as item_count,
       (select id from sh) as shipment_id,
       (select verification_status from sh) as verification_status,
       coalesce((select exists (
          select 1 from sh, jsonb_array_elements(sh.verification_checks) c
           where c->>'code' = 'SCAN_MATCHES_LABEL' and c->>'result' = 'PASS')), false) as scan_passed,
       exists (select 1 from public.shipping_labels l, sh where l.shipment_id = sh.id and ${ACTIVE_LABEL}) as has_label,
       exists (select 1 from public.tracking_events t, sh where t.shipment_id = sh.id and t.source = any($2)
                and t.normalized_status in ('ACCEPTED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED')) as carrier_accepted,
       exists (select 1 from public.tracking_events t, sh where t.shipment_id = sh.id and t.source = any($2)
                and t.normalized_status = 'DELIVERED') as carrier_delivered,
       exists (select 1 from public.tasks k where k.order_id = $1 and k.assigned_to = $3
                and k.status in ('OPEN','IN_PROGRESS','AWAITING_VERIFICATION')) as has_task`,
    [orderId, CARRIER_PROOF_SOURCES, actorUserId(ctx)],
  );

  const overrideAction = opts.to === "SHIPPED" ? "MANUAL_SHIP_OVERRIDE" : opts.to === "DELIVERED" ? "MANUAL_DELIVERY_OVERRIDE" : null;
  const override = overrideAction
    ? await ctx.db.maybeOne(
        `select 1 from public.approvals where organization_id = $1 and order_id = $2 and action_type = $3 and status = 'APPROVED'`,
        [ctx.organizationId, orderId, overrideAction],
      )
    : null;

  return {
    order,
    snapshot: {
      itemCount: facts.item_count,
      hasShippingAddress: order.shipping_address_id !== null,
      hasShipment: facts.shipment_id !== null,
      hasActiveLabel: facts.has_label,
      labelScanPassed: facts.scan_passed,
      shipmentVerified: facts.verification_status !== null && VERIFIED_STATES.includes(facts.verification_status),
      exceptionState: order.exception_state,
      carrierAccepted: facts.carrier_accepted,
      carrierDelivered: facts.carrier_delivered,
      overrideApproved: override !== null,
      actorHasTaskOnOrder: facts.has_task,
      reason: opts.reason ?? null,
    },
  };
}

export const transitionOrderSchema = z
  .object({
    orderId: z.string().uuid(),
    to: z.enum(ORDER_STATUSES),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict();

export interface TransitionOutcome {
  readonly orderId: string;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
}

/**
 * The ONLY way application code changes an order's status. Evaluates the
 * state machine (legality, actor, guards), then updates; the database trigger
 * re-checks legality and writes the audit record.
 */
export async function transitionOrder(
  ctx: ServiceContext,
  raw: z.input<typeof transitionOrderSchema>,
  opts: {
    /**
     * Evaluate as SYSTEM: used only for automatic consequences of an action the
     * engine has already validated (e.g. verification passed after an
     * employee's scan). The DB write still runs under the user's RLS and the
     * audit log still records the user as the actor.
     */
    systemEffect?: boolean;
  } = {},
): Promise<TransitionOutcome> {
  const input = transitionOrderSchema.parse(raw);
  const actor = opts.systemEffect ? "SYSTEM" : actorRole(ctx);
  if (actor !== "SYSTEM" && actor !== "EMPLOYEE") requirePermission(ctx, "orders.transition");

  const { order, snapshot } = await loadTransitionSnapshot(ctx, input.orderId, { reason: input.reason ?? null, to: input.to });
  const result = evaluateTransition({ from: order.status, to: input.to, actor, snapshot });
  if (!result.ok) {
    throw new DomainError(result.code === "GUARD_FAILED" ? "GUARD_FAILED" : result.code === "ILLEGAL_TRANSITION" ? "ILLEGAL_TRANSITION" : "FORBIDDEN", result.message, {
      from: order.status,
      to: input.to,
      failedGuards: result.ok ? undefined : result.failedGuards,
    });
  }

  if (input.to === "CANCELLED" && actor === "MANAGER" && (await isApprovalRequired(ctx, "CANCEL_ORDER"))) {
    const approved = await ctx.db.maybeOne(
      `select 1 from public.approvals where organization_id = $1 and order_id = $2 and action_type = 'CANCEL_ORDER' and status = 'APPROVED'`,
      [ctx.organizationId, order.id],
    );
    if (!approved) throw new DomainError("GUARD_FAILED", "Cancelling an order requires an approved CANCEL_ORDER request");
  }

  await setChangeReason(ctx.db, input.reason ?? result.rule.description);
  const updated = await ctx.db.maybeOne<{ status: OrderStatus }>(
    `update public.orders
        set status = $3,
            cancel_reason = case when $3 = 'CANCELLED' then $4 else cancel_reason end
      where id = $1 and organization_id = $2 and status = $5
      returning status`,
    [order.id, ctx.organizationId, input.to, input.reason ?? null, order.status],
  );
  await setChangeReason(ctx.db, null);
  if (!updated) throw new DomainError("CONFLICT", "Order changed concurrently; reload and retry");
  return { orderId: order.id, from: order.status, to: input.to };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listOrdersSchema = z
  .object({
    status: z.array(z.enum(ORDER_STATUSES)).optional(),
    exceptionState: z.array(z.enum(ORDER_EXCEPTION_STATES)).optional(),
    needsAttention: z.boolean().optional(),
    search: z.string().trim().max(100).optional(),
    placedFrom: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(200).default(50),
    offset: z.number().int().min(0).max(100_000).default(0),
  })
  .strict();

export interface OrderSummary {
  id: string;
  orderNumber: string;
  channel: string;
  externalOrderId: string | null;
  status: OrderStatus;
  exceptionState: OrderExceptionState | null;
  riskLevel: string;
  placedAt: string;
  shipByAt: string | null;
  customerName: string | null;
  itemCount: number;
  totalAmount: string | null;
  currency: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  verificationStatus: string | null;
  openExceptionCount: number;
}

const ORDER_SUMMARY_SELECT = `
  select o.id, o.order_number, o.channel, o.external_order_id, o.status, o.exception_state, o.risk_level,
         o.placed_at, o.ship_by_at, o.total_amount::text as total_amount, o.currency,
         c.display_name as customer_name,
         (select count(*)::int from public.order_items i where i.order_id = o.id) as item_count,
         s.carrier, s.tracking_number, s.verification_status,
         (select count(*)::int from public.exceptions e where e.order_id = o.id and e.status in ('OPEN','ACKNOWLEDGED','IN_PROGRESS')) as open_exception_count
    from public.orders o
    left join public.customers c on c.id = o.customer_id
    left join lateral (
      select s.carrier, s.tracking_number, s.verification_status from public.shipments s
       where s.order_id = o.id and s.status <> 'CANCELLED' order by s.created_at desc limit 1
    ) s on true`;

function toOrderSummary(r: Record<string, unknown>, showRevenue: boolean): OrderSummary {
  return {
    id: r.id as string,
    orderNumber: r.order_number as string,
    channel: r.channel as string,
    externalOrderId: (r.external_order_id as string | null) ?? null,
    status: r.status as OrderStatus,
    exceptionState: (r.exception_state as OrderExceptionState | null) ?? null,
    riskLevel: r.risk_level as string,
    placedAt: (r.placed_at as Date).toISOString(),
    shipByAt: r.ship_by_at ? (r.ship_by_at as Date).toISOString() : null,
    customerName: (r.customer_name as string | null) ?? null,
    itemCount: r.item_count as number,
    totalAmount: showRevenue ? ((r.total_amount as string | null) ?? null) : null,
    currency: (r.currency as string | null) ?? null,
    carrier: (r.carrier as string | null) ?? null,
    trackingNumber: (r.tracking_number as string | null) ?? null,
    verificationStatus: (r.verification_status as string | null) ?? null,
    openExceptionCount: r.open_exception_count as number,
  };
}

export async function getOrders(ctx: ServiceContext, raw: z.input<typeof listOrdersSchema> = {}): Promise<OrderSummary[]> {
  requirePermission(ctx, "orders.read_all");
  const q = listOrdersSchema.parse(raw);
  const rows = await ctx.db.query<Record<string, unknown>>(
    `${ORDER_SUMMARY_SELECT}
      where o.organization_id = $1
        and ($2::text[] is null or o.status = any($2))
        and ($3::text[] is null or o.exception_state = any($3))
        and ($4::boolean is not true or o.exception_state is not null)
        and ($5::text is null or o.order_number ilike '%' || $5 || '%' or o.external_order_id ilike '%' || $5 || '%')
        and ($6::timestamptz is null or o.placed_at >= $6)
      order by o.placed_at desc, o.id
      limit $7 offset $8`,
    [ctx.organizationId, q.status ?? null, q.exceptionState ?? null, q.needsAttention ?? null, q.search ?? null, q.placedFrom ?? null, q.limit, q.offset],
  );
  return rows.map((r) => toOrderSummary(r, can(ctxHolder(ctx), "revenue.read")));
}

/** Orders that need attention: an exception overlay, elevated risk, or a near deadline while unshipped. */
export async function getOrdersAtRisk(ctx: ServiceContext, opts: { withinHours?: number } = {}): Promise<OrderSummary[]> {
  requirePermission(ctx, "orders.read_all");
  const withinHours = Math.min(Math.max(opts.withinHours ?? 24, 1), 168);
  const rows = await ctx.db.query<Record<string, unknown>>(
    `${ORDER_SUMMARY_SELECT}
      where o.organization_id = $1
        and o.status not in ('DELIVERED','CANCELLED')
        and (o.exception_state is not null
             or o.risk_level in ('MEDIUM','HIGH','CRITICAL')
             or (o.status not in ('READY_TO_SHIP','SHIPPED') and o.ship_by_at < now() + make_interval(hours => $2)))
      order by case o.risk_level when 'CRITICAL' then 4 when 'HIGH' then 3 when 'MEDIUM' then 2 when 'LOW' then 1 else 0 end desc,
               o.ship_by_at nulls last
      limit 200`,
    [ctx.organizationId, withinHours],
  );
  return rows.map((r) => toOrderSummary(r, can(ctxHolder(ctx), "revenue.read")));
}

function ctxHolder(ctx: ServiceContext) {
  return { role: ctx.role ?? "OWNER", permissions: ctx.permissions } as const;
}

export interface OrderDetails {
  order: OrderSummary & {
    deliverByAt: string | null;
    statusChangedAt: string;
    notes: string | null;
    subtotalAmount: string | null;
    shippingAmount: string | null;
    taxAmount: string | null;
    metadata: Record<string, unknown>;
  };
  customer: { id: string; displayName: string; email: string | null; phone: string | null } | null;
  shippingAddress: { recipientName: string; line1: string; line2: string | null; city: string; region: string | null; postalCode: string; country: string } | null;
  items: { id: string; sku: string; name: string; quantity: number; unitPrice: string | null; binLocation: string | null; productId: string | null }[];
  shipments: {
    id: string;
    carrier: string | null;
    expectedCarrier: string | null;
    serviceLevel: string | null;
    trackingNumber: string | null;
    status: string;
    verificationStatus: string;
    verificationChecks: unknown[];
    verifiedAt: string | null;
    carrierAcceptedAt: string | null;
    labels: { id: string; status: string; source: string; carrier: string | null; trackingNumber: string | null; printedAt: string | null }[];
    trackingEvents: { id: string; normalizedStatus: string; description: string | null; location: string | null; occurredAt: string; source: string }[];
  }[];
  tasks: { id: string; type: string; title: string; status: string; priority: string; assignedTo: string | null; assignedToName: string | null; dueAt: string | null; completedAt: string | null }[];
  exceptions: ExceptionView[];
  approvals: { id: string; actionType: string; status: string; reason: string; requestedAt: string; requestedBy: string | null }[];
  evidence: { id: string; evidenceType: string; reviewStatus: string; submittedAt: string; submittedBy: string | null; description: string | null; storagePath: string }[];
  timeline: TimelineEntry[];
  allowedTransitions: OrderStatus[];
}

export async function getOrderDetails(ctx: ServiceContext, orderId: string): Promise<OrderDetails> {
  z.string().uuid().parse(orderId);
  const row = await ctx.db.maybeOne<Record<string, unknown>>(
    `${ORDER_SUMMARY_SELECT.replace("select o.id,", "select o.id, o.deliver_by_at, o.status_changed_at, o.notes, o.metadata, o.customer_id, o.shipping_address_id, o.subtotal_amount::text as subtotal_amount, o.shipping_amount::text as shipping_amount, o.tax_amount::text as tax_amount,")}
      where o.id = $1 and o.organization_id = $2`,
    [orderId, ctx.organizationId],
  );
  // RLS returns nothing for orders the user cannot see: indistinguishable from not found.
  if (!row) throw notFound("Order");
  const holder = ctxHolder(ctx);
  const showRevenue = can(holder, "revenue.read");
  const showCustomer = can(holder, "customers.read");

  const [items, shipments, labels, events, tasks, exceptions, approvals, evidence] = await Promise.all([
    ctx.db.query<Record<string, unknown>>(
      `select i.id, i.sku, i.name, i.quantity, i.unit_price::text as unit_price, i.product_id, p.bin_location
         from public.order_items i left join public.products p on p.id = i.product_id
        where i.order_id = $1 order by i.created_at, i.sku`,
      [orderId],
    ),
    ctx.db.query<Record<string, unknown>>(`select * from public.shipments where order_id = $1 order by created_at desc`, [orderId]),
    ctx.db.query<Record<string, unknown>>(`select * from public.shipping_labels where order_id = $1 order by created_at desc`, [orderId]),
    ctx.db.query<Record<string, unknown>>(
      `select t.* from public.tracking_events t join public.shipments s on s.id = t.shipment_id where s.order_id = $1 order by t.occurred_at desc`,
      [orderId],
    ),
    ctx.db.query<Record<string, unknown>>(
      `select t.id, t.type, t.title, t.status, t.priority, t.assigned_to, t.due_at, t.completed_at,
              coalesce(p.display_name, p.full_name) as assignee_name
         from public.tasks t left join public.profiles p on p.id = t.assigned_to
        where t.order_id = $1 order by t.created_at desc`,
      [orderId],
    ),
    ctx.db.query<Record<string, unknown>>(
      `select e.*, null::text as order_number, coalesce(p.display_name, p.full_name) as assignee_name
         from public.exceptions e left join public.profiles p on p.id = e.assigned_to
        where e.order_id = $1 order by e.detected_at desc`,
      [orderId],
    ),
    ctx.db.query<Record<string, unknown>>(
      `select id, action_type, status, reason, requested_at, requested_by from public.approvals where order_id = $1 order by requested_at desc`,
      [orderId],
    ),
    ctx.db.query<Record<string, unknown>>(
      `select id, evidence_type, review_status, submitted_at, submitted_by, description, storage_path
         from public.order_evidence where order_id = $1 order by submitted_at desc`,
      [orderId],
    ),
  ]);

  const customer =
    showCustomer && row.customer_id
      ? await ctx.db.maybeOne<{ id: string; display_name: string; email: string | null; phone: string | null }>(
          `select id, display_name, email, phone from public.customers where id = $1`,
          [row.customer_id],
        )
      : null;
  const address =
    showCustomer && row.shipping_address_id
      ? await ctx.db.maybeOne<Record<string, unknown>>(`select * from public.customer_addresses where id = $1`, [row.shipping_address_id])
      : null;
  const timeline = can(holder, "activity.read") || ctx.actor.kind === "SYSTEM" ? await getActivityTimeline(ctx, { orderId, limit: 100 }) : [];

  const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : null);
  const summary = toOrderSummary(row, showRevenue);
  return {
    order: {
      ...summary,
      customerName: showCustomer ? summary.customerName : null,
      deliverByAt: iso(row.deliver_by_at),
      statusChangedAt: iso(row.status_changed_at)!,
      notes: (row.notes as string | null) ?? null,
      subtotalAmount: showRevenue ? ((row.subtotal_amount as string | null) ?? null) : null,
      shippingAmount: showRevenue ? ((row.shipping_amount as string | null) ?? null) : null,
      taxAmount: showRevenue ? ((row.tax_amount as string | null) ?? null) : null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    },
    customer: customer ? { id: customer.id, displayName: customer.display_name, email: customer.email, phone: customer.phone } : null,
    shippingAddress: address
      ? {
          recipientName: address.recipient_name as string,
          line1: address.line1 as string,
          line2: (address.line2 as string | null) ?? null,
          city: address.city as string,
          region: (address.region as string | null) ?? null,
          postalCode: address.postal_code as string,
          country: address.country as string,
        }
      : null,
    items: items.map((i) => ({
      id: i.id as string,
      sku: i.sku as string,
      name: i.name as string,
      quantity: i.quantity as number,
      unitPrice: showRevenue ? ((i.unit_price as string | null) ?? null) : null,
      binLocation: (i.bin_location as string | null) ?? null,
      productId: (i.product_id as string | null) ?? null,
    })),
    shipments: shipments.map((s) => ({
      id: s.id as string,
      carrier: (s.carrier as string | null) ?? null,
      expectedCarrier: (s.expected_carrier as string | null) ?? null,
      serviceLevel: (s.service_level as string | null) ?? null,
      trackingNumber: (s.tracking_number as string | null) ?? null,
      status: s.status as string,
      verificationStatus: s.verification_status as string,
      verificationChecks: (s.verification_checks as unknown[]) ?? [],
      verifiedAt: iso(s.verified_at),
      carrierAcceptedAt: iso(s.carrier_accepted_at),
      labels: labels
        .filter((l) => l.shipment_id === s.id)
        .map((l) => ({
          id: l.id as string,
          status: l.status as string,
          source: l.source as string,
          carrier: (l.carrier as string | null) ?? null,
          trackingNumber: (l.tracking_number as string | null) ?? null,
          printedAt: iso(l.printed_at),
        })),
      trackingEvents: events
        .filter((e) => e.shipment_id === s.id)
        .map((e) => ({
          id: e.id as string,
          normalizedStatus: e.normalized_status as string,
          description: (e.description as string | null) ?? null,
          location: (e.location as string | null) ?? null,
          occurredAt: iso(e.occurred_at)!,
          source: e.source as string,
        })),
    })),
    tasks: tasks.map((t) => ({
      id: t.id as string,
      type: t.type as string,
      title: t.title as string,
      status: t.status as string,
      priority: t.priority as string,
      assignedTo: (t.assigned_to as string | null) ?? null,
      assignedToName: (t.assignee_name as string | null) ?? null,
      dueAt: iso(t.due_at),
      completedAt: iso(t.completed_at),
    })),
    exceptions: exceptions.map(toExceptionView),
    approvals: approvals.map((a) => ({
      id: a.id as string,
      actionType: a.action_type as string,
      status: a.status as string,
      reason: a.reason as string,
      requestedAt: iso(a.requested_at)!,
      requestedBy: (a.requested_by as string | null) ?? null,
    })),
    evidence: evidence.map((e) => ({
      id: e.id as string,
      evidenceType: e.evidence_type as string,
      reviewStatus: e.review_status as string,
      submittedAt: iso(e.submitted_at)!,
      submittedBy: (e.submitted_by as string | null) ?? null,
      description: (e.description as string | null) ?? null,
      storagePath: e.storage_path as string,
    })),
    timeline,
    allowedTransitions: allowedNextStatuses(summary.status, actorRole(ctx)),
  };
}

export function assertCanReadAllOrders(ctx: ServiceContext): void {
  if (ctx.actor.kind === "USER" && !ctx.permissions.has("orders.read_all")) throw forbidden();
}
