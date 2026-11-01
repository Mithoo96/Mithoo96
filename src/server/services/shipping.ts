/**
 * Shipping service: prepare shipments/labels, run & persist verification,
 * ingest carrier tracking, tracking corrections.
 */
import { z } from "zod";
import { DomainError, notFound } from "@/core/errors";
import { exceptionDedupeKey, type ExceptionType } from "@/core/exceptions/catalog";
import { parseDeadlinePolicy } from "@/core/risk/deadline";
import {
  TRACKING_EVENT_SOURCES,
  TRACKING_NORMALIZED_STATUSES,
  hasCarrierAcceptance,
  hasCarrierDelivery,
  verifyShipment,
  type TrackingEventSource,
  type TrackingNormalizedStatus,
  type VerificationOutcome,
} from "@/core/shipping/verification";
import { normalizeTracking } from "@/core/shipping/tracking";
import { actorUserId, requirePermission, type ServiceContext } from "../context";
import { logActivity } from "./activity";
import { autoResolveExceptions, raiseException } from "./exceptions";
import { transitionOrder } from "./orders";
import { getPackOrderRequirements, getSetting } from "./settings";
import { createTask } from "./tasks-core";

const CARRIER = z.string().regex(/^[A-Z0-9_]+$/).max(32);

export const prepareShipmentSchema = z
  .object({
    orderId: z.string().uuid(),
    carrier: CARRIER,
    expectedCarrier: CARRIER.optional(),
    serviceLevel: z.string().max(64).optional(),
    trackingNumber: z.string().trim().min(5).max(64).optional(),
    shipByAt: z.string().datetime().optional(),
    label: z
      .object({
        source: z.enum(["PLATFORM", "CARRIER", "MANUAL", "MOCK"]),
        barcodeValue: z.string().max(128).optional(),
        storagePath: z.string().max(512).optional(),
        externalLabelId: z.string().max(128).optional(),
        format: z.enum(["PDF", "PNG", "ZPL"]).optional(),
      })
      .strict()
      .optional(),
    assignTo: z.string().uuid().optional(),
  })
  .strict();

/**
 * Workflow step "Prepare shipping → Generate/receive label → Employee receives
 * packing task". Idempotent: re-running reuses the live shipment/task.
 */
export async function prepareShipment(ctx: ServiceContext, raw: z.input<typeof prepareShipmentSchema>): Promise<{ shipmentId: string; labelId: string | null; taskId: string | null }> {
  requirePermission(ctx, "shipments.write");
  const input = prepareShipmentSchema.parse(raw);
  const order = await ctx.db.maybeOne<{ id: string; order_number: string; status: string; ship_by_at: Date | null }>(
    `select id, order_number, status, ship_by_at from public.orders where id = $1 and organization_id = $2 for update`,
    [input.orderId, ctx.organizationId],
  );
  if (!order) throw notFound("Order");
  if (!["NEW", "VERIFIED", "READY_TO_PACK"].includes(order.status)) {
    throw new DomainError("CONFLICT", `Cannot prepare shipping for an order in ${order.status}`);
  }

  let shipment = await ctx.db.maybeOne<{ id: string }>(
    `select id from public.shipments where order_id = $1 and status <> 'CANCELLED' order by created_at desc limit 1`,
    [order.id],
  );
  if (!shipment) {
    shipment = await ctx.db.one<{ id: string }>(
      `insert into public.shipments (organization_id, order_id, carrier, expected_carrier, service_level, tracking_number, ship_by_at, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [ctx.organizationId, order.id, input.carrier, input.expectedCarrier ?? null, input.serviceLevel ?? null, input.trackingNumber ?? null,
       input.shipByAt ?? order.ship_by_at, actorUserId(ctx)],
    );
    await logActivity(ctx, { action: "shipment.created", resourceType: "shipment", resourceId: shipment.id, orderId: order.id, summary: `Shipment prepared with ${input.carrier}` });
  }

  let labelId: string | null = null;
  if (input.label) {
    const existing = await ctx.db.maybeOne<{ id: string }>(
      `select id from public.shipping_labels where shipment_id = $1 and status in ('PENDING','READY','PRINTED')`,
      [shipment.id],
    );
    if (existing) {
      labelId = existing.id;
    } else {
      const label = await ctx.db.one<{ id: string }>(
        `insert into public.shipping_labels
           (organization_id, shipment_id, order_id, source, carrier, tracking_number, barcode_value, label_format,
            storage_bucket, storage_path, external_label_id, status, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'READY', $12) returning id`,
        [ctx.organizationId, shipment.id, order.id, input.label.source, input.carrier, input.trackingNumber ?? null,
         input.label.barcodeValue ?? input.trackingNumber ?? null, input.label.format ?? null,
         input.label.storagePath ? "labels" : null, input.label.storagePath ?? null, input.label.externalLabelId ?? null, actorUserId(ctx)],
      );
      labelId = label.id;
      await ctx.db.query(`update public.shipments set status = 'LABEL_READY' where id = $1 and status = 'PENDING'`, [shipment.id]);
      await logActivity(ctx, { action: "label.received", resourceType: "shipping_label", resourceId: label.id, orderId: order.id, summary: `Shipping label received (${input.label.source})` });
    }
  }

  if (order.status === "NEW") {
    await transitionOrder(ctx, { orderId: order.id, to: "VERIFIED", reason: "Order verified during shipping preparation" });
  }
  let taskId: string | null = null;
  if (labelId) {
    const current = await ctx.db.one<{ status: string }>(`select status from public.orders where id = $1`, [order.id]);
    if (current.status === "VERIFIED") {
      await transitionOrder(ctx, { orderId: order.id, to: "READY_TO_PACK", reason: "Shipping label ready" });
    }
    const req = await getPackOrderRequirements(ctx);
    const task = await createTask(ctx, {
      type: "PACK_ORDER",
      orderId: order.id,
      shipmentId: shipment.id,
      orderNumber: order.order_number,
      assignedTo: input.assignTo ?? null,
      requiredEvidence: req.requiredEvidence,
      requiresSignoff: req.requiresSignoff,
      dueAt: order.ship_by_at ? new Date(Math.min(order.ship_by_at.getTime() - 60 * 60_000, ctx.now().getTime() + 4 * 3_600_000)) : null,
    });
    taskId = task.taskId;
  }
  return { shipmentId: shipment.id, labelId, taskId };
}

interface ShipmentRow {
  id: string;
  order_id: string;
  carrier: string | null;
  expected_carrier: string | null;
  tracking_number: string | null;
  verification_status: string;
}

/**
 * Run the verification engine against current data and persist the outcome
 * on the shipment. Raises exceptions for failed checks when `raiseExceptions`.
 */
export async function runShipmentVerification(
  ctx: ServiceContext,
  input: { shipmentId: string; scannedValue?: string | null; packageConfirmed?: boolean; requiredEvidence?: readonly string[]; taskId?: string | null; raiseExceptions?: boolean },
): Promise<VerificationOutcome> {
  const shipment = await ctx.db.maybeOne<ShipmentRow>(
    `select id, order_id, carrier, expected_carrier, tracking_number, verification_status from public.shipments where id = $1 and organization_id = $2`,
    [input.shipmentId, ctx.organizationId],
  );
  if (!shipment) throw notFound("Shipment");
  const order = await ctx.db.one<{ id: string; status: string; ship_by_at: Date | null }>(
    `select id, status, ship_by_at from public.orders where id = $1`,
    [shipment.order_id],
  );
  const label = await ctx.db.maybeOne<{ id: string; order_id: string; shipment_id: string; tracking_number: string | null; carrier: string | null; barcode_value: string | null }>(
    `select id, order_id, shipment_id, tracking_number, carrier, barcode_value from public.shipping_labels
      where shipment_id = $1 and status in ('PENDING','READY','PRINTED') limit 1`,
    [shipment.id],
  );
  const conflicts = shipment.tracking_number
    ? await ctx.db.query<{ shipment_id: string; order_id: string }>(`select * from app.tracking_conflicts($1, $2, $3)`, [ctx.organizationId, shipment.id, shipment.tracking_number])
    : [];
  const evidence = await ctx.db.query<{ evidence_type: string }>(
    `select distinct evidence_type from public.order_evidence
      where organization_id = $1 and review_status <> 'REJECTED' and (order_id = $2 or shipment_id = $3 or ($4::uuid is not null and task_id = $4))`,
    [ctx.organizationId, order.id, shipment.id, input.taskId ?? null],
  );
  const events = await ctx.db.query<{ normalized_status: TrackingNormalizedStatus; source: TrackingEventSource; occurred_at: Date }>(
    `select normalized_status, source, occurred_at from public.tracking_events where shipment_id = $1`,
    [shipment.id],
  );

  // Previous scan / confirmation are remembered on the live task.
  const task = input.taskId
    ? await ctx.db.maybeOne<{ checks_state: Record<string, { passed: boolean; value?: string | null }> }>(`select checks_state from public.tasks where id = $1`, [input.taskId])
    : null;
  const scanned = input.scannedValue !== undefined ? input.scannedValue : (task?.checks_state?.LABEL_SCANNED?.value ?? null);
  const confirmed = input.packageConfirmed ?? task?.checks_state?.PACKAGE_CONFIRMED?.passed === true;

  const outcome = verifyShipment({
    order: { id: order.id, status: order.status, shipByAt: order.ship_by_at },
    shipment: { id: shipment.id, orderId: shipment.order_id, carrier: shipment.carrier, expectedCarrier: shipment.expected_carrier, trackingNumber: shipment.tracking_number },
    activeLabel: label ? { id: label.id, orderId: label.order_id, shipmentId: label.shipment_id, trackingNumber: label.tracking_number, carrier: label.carrier, barcodeValue: label.barcode_value } : null,
    scannedValue: scanned,
    conflictingShipments: conflicts.map((c) => ({ shipmentId: c.shipment_id, orderId: c.order_id })),
    packageConfirmed: confirmed,
    requiredEvidence: input.requiredEvidence ?? [],
    submittedEvidenceTypes: evidence.map((e) => e.evidence_type),
    trackingEvents: events.map((e) => ({ normalizedStatus: e.normalized_status, source: e.source, occurredAt: e.occurred_at })),
    now: ctx.now(),
    deadlinePolicy: parseDeadlinePolicy(await getSetting(ctx, "risk.shipping_deadline_policy")),
  });

  const becameVerified = outcome.status !== shipment.verification_status && outcome.status === "VERIFIED";
  await ctx.db.query(
    `update public.shipments
        set verification_status = $2,
            verification_checks = $3,
            verified_at = case when $4 then now() else verified_at end,
            verified_by = case when $4 then $5::uuid else verified_by end
      where id = $1`,
    [shipment.id, outcome.status, JSON.stringify(outcome.checks), becameVerified, actorUserId(ctx)],
  );
  if (outcome.status !== shipment.verification_status) {
    await logActivity(ctx, {
      action: "shipment.verification_changed",
      resourceType: "shipment",
      resourceId: shipment.id,
      orderId: order.id,
      summary: `Shipment verification ${shipment.verification_status} → ${outcome.status}`,
      changes: { verification_status: { from: shipment.verification_status, to: outcome.status } },
      metadata: { failedChecks: outcome.checks.filter((c) => c.result === "FAIL").map((c) => c.code) },
    });
  }

  if (input.raiseExceptions) {
    const raised = new Set<string>();
    for (const check of outcome.checks) {
      if (check.result !== "FAIL" || !check.exceptionType || raised.has(check.exceptionType)) continue;
      raised.add(check.exceptionType);
      await raiseException(ctx, {
        type: check.exceptionType,
        severity: check.exceptionType === "TRACKING_MISMATCH" || check.exceptionType === "LABEL_ORDER_MISMATCH" || check.exceptionType === "DUPLICATE_TRACKING" ? "CRITICAL" : "HIGH",
        dedupeKey: exceptionDedupeKey(check.exceptionType, "shipment", shipment.id),
        orderId: order.id,
        shipmentId: shipment.id,
        taskId: input.taskId ?? null,
        description: check.message,
        deadlineAt: order.ship_by_at,
        metadata: { check: check.code },
      });
    }
    if (outcome.identityVerified) {
      await autoResolveExceptions(
        ctx,
        (["LABEL_NOT_VERIFIED", "TRACKING_MISSING", "CARRIER_MISMATCH", "DUPLICATE_TRACKING"] as ExceptionType[]).map((t) => exceptionDedupeKey(t, "shipment", shipment.id)),
        "Label scan and shipment verification passed",
      );
    }
  }
  return outcome;
}

export const trackingEventInputSchema = z
  .object({
    normalizedStatus: z.enum(TRACKING_NORMALIZED_STATUSES),
    occurredAt: z.coerce.date(),
    source: z.enum(TRACKING_EVENT_SOURCES),
    eventCode: z.string().max(64).optional(),
    description: z.string().max(500).optional(),
    location: z.string().max(200).optional(),
    externalEventId: z.string().max(200).optional(),
    raw: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type TrackingEventInput = z.infer<typeof trackingEventInputSchema>;

/**
 * Ingest carrier/platform tracking events (idempotent), refresh verification,
 * and advance the order only when CARRIER data proves it.
 */
export async function recordTrackingEvents(ctx: ServiceContext, shipmentId: string, rawEvents: readonly TrackingEventInput[]): Promise<{ inserted: number; orderStatus: string }> {
  const events = rawEvents.map((e) => trackingEventInputSchema.parse(e));
  if (ctx.actor.kind === "USER") {
    requirePermission(ctx, "shipments.write");
    if (events.some((e) => e.source !== "MANUAL")) throw new DomainError("FORBIDDEN", "Users may only record MANUAL tracking notes");
  }
  const shipment = await ctx.db.maybeOne<{ id: string; order_id: string; carrier: string | null; tracking_number: string | null }>(
    `select id, order_id, carrier, tracking_number from public.shipments where id = $1 and organization_id = $2`,
    [shipmentId, ctx.organizationId],
  );
  if (!shipment) throw notFound("Shipment");

  let inserted = 0;
  for (const e of events) {
    const rows = await ctx.db.query(
      `insert into public.tracking_events
         (organization_id, shipment_id, carrier, tracking_number, normalized_status, event_code, description, location, occurred_at, source, external_event_id, raw, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       on conflict (shipment_id, source, external_event_id) where external_event_id is not null do nothing
       returning id`,
      [ctx.organizationId, shipment.id, shipment.carrier, shipment.tracking_number, e.normalizedStatus, e.eventCode ?? null, e.description ?? null,
       e.location ?? null, e.occurredAt, e.source, e.externalEventId ?? null, e.raw ? JSON.stringify(e.raw) : null, actorUserId(ctx)],
    );
    inserted += rows.length;
  }

  const all = await ctx.db.query<{ normalized_status: TrackingNormalizedStatus; source: TrackingEventSource; occurred_at: Date }>(
    `select normalized_status, source, occurred_at from public.tracking_events where shipment_id = $1`,
    [shipment.id],
  );
  const mapped = all.map((e) => ({ normalizedStatus: e.normalized_status, source: e.source, occurredAt: e.occurred_at }));
  const accepted = hasCarrierAcceptance(mapped);
  const delivered = hasCarrierDelivery(mapped);
  if (accepted || delivered) {
    const firstAccepted = mapped
      .filter((e) => e.source !== "MANUAL" && ["ACCEPTED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(e.normalizedStatus))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())[0];
    const firstDelivered = mapped.find((e) => e.source !== "MANUAL" && e.normalizedStatus === "DELIVERED");
    await ctx.db.query(
      `update public.shipments
          set carrier_accepted_at = coalesce(carrier_accepted_at, $2),
              delivered_at = coalesce(delivered_at, $3),
              status = case when $4 then 'DELIVERED' when status in ('PENDING','LABEL_READY','PACKED','READY_TO_SHIP') then 'IN_TRANSIT' else status end
        where id = $1`,
      [shipment.id, firstAccepted?.occurredAt ?? null, firstDelivered?.occurredAt ?? null, delivered],
    );
  }

  if (inserted > 0) {
    await logActivity(ctx, {
      action: "tracking.updated",
      resourceType: "shipment",
      resourceId: shipment.id,
      orderId: shipment.order_id,
      summary: `${inserted} tracking event(s) recorded (${[...new Set(events.map((e) => e.source))].join(", ")})`,
    });
  }

  await runShipmentVerification(ctx, { shipmentId: shipment.id, raiseExceptions: false });

  const order = await ctx.db.one<{ status: string }>(`select status from public.orders where id = $1`, [shipment.order_id]);
  let status = order.status;
  if (ctx.actor.kind === "SYSTEM") {
    if (status === "READY_TO_SHIP" && accepted) {
      await transitionOrder(ctx, { orderId: shipment.order_id, to: "SHIPPED", reason: "Carrier acceptance scan received" });
      status = "SHIPPED";
    }
    if (status === "SHIPPED" && delivered) {
      await transitionOrder(ctx, { orderId: shipment.order_id, to: "DELIVERED", reason: "Carrier delivery confirmation received" });
      status = "DELIVERED";
    }
    if (accepted) {
      await autoResolveExceptions(ctx, [exceptionDedupeKey("CARRIER_NOT_RECEIVED", "shipment", shipment.id)], "Carrier acceptance scan received");
    }
    const latestException = events.find((e) => e.normalizedStatus === "EXCEPTION" || e.normalizedStatus === "RETURNED");
    if (latestException && latestException.source !== "MANUAL") {
      await raiseException(ctx, {
        type: "CARRIER_EXCEPTION",
        severity: "HIGH",
        dedupeKey: exceptionDedupeKey("CARRIER_EXCEPTION", "shipment", shipment.id),
        orderId: shipment.order_id,
        shipmentId: shipment.id,
        taskId: null,
        description: latestException.description ?? `Carrier reported ${latestException.normalizedStatus}`,
        deadlineAt: null,
      });
    }
  }
  return { inserted, orderStatus: status };
}

/** Change a shipment's tracking number. Executed by the TRACKING_CHANGE approval handler (or directly when no approval is required). */
export async function applyTrackingChange(ctx: ServiceContext, input: { shipmentId: string; trackingNumber: string; reason: string }): Promise<void> {
  requirePermission(ctx, "shipments.write");
  const normalized = normalizeTracking(input.trackingNumber);
  if (!normalized || normalized.length < 5) throw new DomainError("VALIDATION_FAILED", "Invalid tracking number");
  const before = await ctx.db.maybeOne<{ tracking_number: string | null; order_id: string }>(
    `select tracking_number, order_id from public.shipments where id = $1 and organization_id = $2 for update`,
    [input.shipmentId, ctx.organizationId],
  );
  if (!before) throw notFound("Shipment");
  await ctx.db.query(
    `update public.shipments set tracking_number = $2, verification_status = 'UNVERIFIED', verification_checks = '[]', verified_at = null, verified_by = null where id = $1`,
    [input.shipmentId, input.trackingNumber],
  );
  await logActivity(ctx, {
    action: "tracking.changed",
    resourceType: "shipment",
    resourceId: input.shipmentId,
    orderId: before.order_id,
    summary: `Tracking number changed: ${input.reason}`,
    changes: { tracking_number: { from: before.tracking_number, to: input.trackingNumber } },
  });
}

/** Void the active label and install a replacement (LABEL_REPRINT approval handler). */
export async function replaceLabel(
  ctx: ServiceContext,
  input: { shipmentId: string; reason: string; trackingNumber?: string | null; barcodeValue?: string | null; source?: "PLATFORM" | "CARRIER" | "MANUAL" | "MOCK" },
): Promise<{ labelId: string }> {
  requirePermission(ctx, "shipments.write");
  const shipment = await ctx.db.maybeOne<{ id: string; order_id: string; carrier: string | null; tracking_number: string | null }>(
    `select id, order_id, carrier, tracking_number from public.shipments where id = $1 and organization_id = $2 for update`,
    [input.shipmentId, ctx.organizationId],
  );
  if (!shipment) throw notFound("Shipment");
  await ctx.db.query(
    `update public.shipping_labels set status = 'SUPERSEDED', voided_at = now(), void_reason = $2
      where shipment_id = $1 and status in ('PENDING','READY','PRINTED')`,
    [shipment.id, input.reason],
  );
  const tracking = input.trackingNumber ?? shipment.tracking_number;
  if (input.trackingNumber && input.trackingNumber !== shipment.tracking_number) {
    await applyTrackingChange(ctx, { shipmentId: shipment.id, trackingNumber: input.trackingNumber, reason: input.reason });
  }
  const label = await ctx.db.one<{ id: string }>(
    `insert into public.shipping_labels (organization_id, shipment_id, order_id, source, carrier, tracking_number, barcode_value, status, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, 'READY', $8) returning id`,
    [ctx.organizationId, shipment.id, shipment.order_id, input.source ?? "MANUAL", shipment.carrier, tracking, input.barcodeValue ?? tracking, actorUserId(ctx)],
  );
  await ctx.db.query(`update public.shipments set verification_status = 'UNVERIFIED', verification_checks = '[]' where id = $1`, [shipment.id]);
  await logActivity(ctx, { action: "label.replaced", resourceType: "shipping_label", resourceId: label.id, orderId: shipment.order_id, summary: `Label replaced: ${input.reason}` });
  return { labelId: label.id };
}
