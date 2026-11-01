/**
 * Approval Engine: request → decide (approve/reject) → execute handler.
 */
import { z } from "zod";
import {
  APPROVAL_ACTIONS,
  APPROVAL_CATALOG,
  APPROVAL_STATUSES,
  canCancelApproval,
  canDecideApproval,
  type ApprovalAction,
  type ApprovalStatus,
} from "@/core/approvals/rules";
import { DomainError, notFound } from "@/core/errors";
import { requirePermission, requireUser, type ServiceContext } from "../context";
import { logActivity } from "./activity";
import { notify } from "./notifications";
import { transitionOrder } from "./orders";
import { applyTrackingChange, replaceLabel } from "./shipping";
import { createTask } from "./tasks-core";

export const requestApprovalSchema = z
  .object({
    actionType: z.enum(APPROVAL_ACTIONS),
    resourceId: z.string().uuid(),
    orderId: z.string().uuid().optional(),
    reason: z.string().trim().min(3).max(2000),
    payload: z.record(z.string(), z.unknown()).default({}),
    approverId: z.string().uuid().optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .strict();

const payloadSchemas: Partial<Record<ApprovalAction, z.ZodType>> = {
  TRACKING_CHANGE: z.object({ trackingNumber: z.string().trim().min(5).max(64) }).strict(),
  LABEL_REPRINT: z.object({ trackingNumber: z.string().trim().min(5).max(64).optional(), barcodeValue: z.string().max(128).optional() }).strict(),
  SHIPMENT_CORRECTION: z.object({ trackingNumber: z.string().trim().min(5).max(64).optional(), barcodeValue: z.string().max(128).optional(), note: z.string().max(500).optional() }).strict(),
};

interface ApprovalRow {
  id: string;
  organization_id: string;
  requested_by: string | null;
  approver_id: string | null;
  required_role: "MANAGER" | "OWNER";
  action_type: ApprovalAction;
  action_payload: Record<string, unknown>;
  resource_type: string;
  resource_id: string;
  order_id: string | null;
  reason: string;
  status: ApprovalStatus;
  expires_at: Date | null;
  requested_at: Date;
}

async function resolveOrderId(ctx: ServiceContext, resourceType: string, resourceId: string, given?: string): Promise<string | null> {
  if (given) return given;
  if (resourceType === "order") return resourceId;
  if (resourceType === "shipment") {
    const r = await ctx.db.maybeOne<{ order_id: string }>(`select order_id from public.shipments where id = $1 and organization_id = $2`, [resourceId, ctx.organizationId]);
    return r?.order_id ?? null;
  }
  return null;
}

export async function requestApproval(ctx: ServiceContext, raw: z.input<typeof requestApprovalSchema>): Promise<{ approvalId: string }> {
  const user = requireUser(ctx);
  requirePermission(ctx, "approvals.request");
  const input = requestApprovalSchema.parse(raw);
  const def = APPROVAL_CATALOG[input.actionType];
  const payload = payloadSchemas[input.actionType]?.parse(input.payload) ?? input.payload;
  const orderId = await resolveOrderId(ctx, def.resourceType, input.resourceId, input.orderId);
  const row = await ctx.db.one<{ id: string }>(
    `insert into public.approvals
       (organization_id, requested_by, approver_id, required_role, action_type, action_payload, resource_type, resource_id, order_id, reason, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning id`,
    [ctx.organizationId, user.actor.userId, input.approverId ?? null, def.requiredRole, input.actionType, JSON.stringify(payload),
     def.resourceType, input.resourceId, orderId, input.reason, input.expiresAt ?? null],
  );
  await logActivity(ctx, {
    action: "approval.requested",
    resourceType: "approval",
    resourceId: row.id,
    orderId,
    summary: `Approval requested: ${def.label} — ${input.reason}`,
    metadata: { actionType: input.actionType },
  });
  await notify(ctx, {
    recipientIds: input.approverId ? [input.approverId] : undefined,
    toRoles: input.approverId ? undefined : def.requiredRole === "OWNER" ? ["OWNER"] : ["MANAGER", "OWNER"],
    category: "APPROVAL_REQUIRED",
    priority: def.requiredRole === "OWNER" ? "HIGH" : "NORMAL",
    title: `${def.requiredRole === "OWNER" ? "Owner" : "Manager"} approval required: ${def.label}`,
    body: input.reason,
    resource: { type: "approval", id: row.id },
    dedupeKey: `approval:${row.id}`,
  });
  return { approvalId: row.id };
}

/** System-originated approval (e.g. refund risk detected → owner approval). */
export async function requestSystemApproval(
  ctx: ServiceContext,
  input: { actionType: ApprovalAction; resourceId: string; orderId?: string | null; reason: string; payload?: Record<string, unknown> },
): Promise<{ approvalId: string; created: boolean }> {
  if (ctx.actor.kind !== "SYSTEM") throw new DomainError("FORBIDDEN", "System approvals can only be requested by the system");
  const def = APPROVAL_CATALOG[input.actionType];
  const row = await ctx.db.maybeOne<{ id: string }>(
    `insert into public.approvals (organization_id, requested_by, required_role, action_type, action_payload, resource_type, resource_id, order_id, reason)
     values ($1, null, $2, $3, $4, $5, $6, $7, $8)
     on conflict (organization_id, action_type, resource_id) where status = 'PENDING' do nothing
     returning id`,
    [ctx.organizationId, def.requiredRole, input.actionType, JSON.stringify(input.payload ?? {}), def.resourceType, input.resourceId, input.orderId ?? null, input.reason],
  );
  if (!row) {
    const existing = await ctx.db.one<{ id: string }>(
      `select id from public.approvals where organization_id = $1 and action_type = $2 and resource_id = $3 and status = 'PENDING'`,
      [ctx.organizationId, input.actionType, input.resourceId],
    );
    return { approvalId: existing.id, created: false };
  }
  await logActivity(ctx, { action: "approval.requested", resourceType: "approval", resourceId: row.id, orderId: input.orderId ?? null, summary: `System requested approval: ${def.label} — ${input.reason}` });
  await notify(ctx, {
    toRoles: def.requiredRole === "OWNER" ? ["OWNER"] : ["MANAGER", "OWNER"],
    category: "APPROVAL_REQUIRED",
    priority: "HIGH",
    title: `${def.requiredRole === "OWNER" ? "Owner" : "Manager"} approval required: ${def.label}`,
    body: input.reason,
    resource: { type: "approval", id: row.id },
    dedupeKey: `approval:${row.id}`,
  });
  return { approvalId: row.id, created: true };
}

async function loadApproval(ctx: ServiceContext, id: string): Promise<ApprovalRow> {
  const row = await ctx.db.maybeOne<ApprovalRow>(`select * from public.approvals where id = $1 and organization_id = $2 for update`, [id, ctx.organizationId]);
  if (!row) throw notFound("Approval");
  return row;
}

export const decideSchema = z.object({ approvalId: z.string().uuid(), comment: z.string().trim().max(2000).optional() }).strict();

export async function approveAction(ctx: ServiceContext, raw: z.input<typeof decideSchema>): Promise<{ executed: boolean; result: Record<string, unknown> }> {
  const user = requireUser(ctx);
  const input = decideSchema.parse(raw);
  const approval = await loadApproval(ctx, input.approvalId);
  const decision = canDecideApproval(
    { status: approval.status, requestedBy: approval.requested_by, approverId: approval.approver_id, requiredRole: approval.required_role, expiresAt: approval.expires_at },
    { userId: user.actor.userId, role: user.role, permissions: user.permissions },
    ctx.now(),
  );
  if (!decision.ok) throw new DomainError("FORBIDDEN", decision.reason);

  await ctx.db.query(
    `update public.approvals set status = 'APPROVED', approved_at = now(), decided_by = $2, decision_comment = $3 where id = $1`,
    [approval.id, user.actor.userId, input.comment ?? null],
  );
  await logActivity(ctx, {
    action: "approval.approved",
    resourceType: "approval",
    resourceId: approval.id,
    orderId: approval.order_id,
    summary: `${APPROVAL_CATALOG[approval.action_type].label} approved${input.comment ? `: ${input.comment}` : ""}`,
  });

  const result = await executeApproval(ctx, approval);
  await ctx.db.query(
    `update public.approvals set executed_at = case when $2 then now() else null end, execution_result = $3 where id = $1`,
    [approval.id, result.executed, JSON.stringify(result)],
  );
  if (approval.requested_by && approval.requested_by !== user.actor.userId) {
    await notify(ctx, {
      recipientIds: [approval.requested_by],
      category: "APPROVAL_DECIDED",
      title: `Approved: ${APPROVAL_CATALOG[approval.action_type].label}`,
      body: input.comment,
      resource: { type: "approval", id: approval.id },
      dedupeKey: `approval-decided:${approval.id}`,
    });
  }
  return { executed: result.executed, result };
}

export async function rejectAction(ctx: ServiceContext, raw: z.input<typeof decideSchema>): Promise<void> {
  const user = requireUser(ctx);
  const input = decideSchema.parse(raw);
  const approval = await loadApproval(ctx, input.approvalId);
  const decision = canDecideApproval(
    { status: approval.status, requestedBy: approval.requested_by, approverId: approval.approver_id, requiredRole: approval.required_role, expiresAt: approval.expires_at },
    { userId: user.actor.userId, role: user.role, permissions: user.permissions },
    ctx.now(),
  );
  if (!decision.ok) throw new DomainError("FORBIDDEN", decision.reason);
  await ctx.db.query(
    `update public.approvals set status = 'REJECTED', rejected_at = now(), decided_by = $2, decision_comment = $3 where id = $1`,
    [approval.id, user.actor.userId, input.comment ?? null],
  );
  await logActivity(ctx, {
    action: "approval.rejected",
    resourceType: "approval",
    resourceId: approval.id,
    orderId: approval.order_id,
    summary: `${APPROVAL_CATALOG[approval.action_type].label} rejected${input.comment ? `: ${input.comment}` : ""}`,
  });
  if (approval.requested_by) {
    await notify(ctx, {
      recipientIds: [approval.requested_by],
      category: "APPROVAL_DECIDED",
      title: `Rejected: ${APPROVAL_CATALOG[approval.action_type].label}`,
      body: input.comment,
      resource: { type: "approval", id: approval.id },
      dedupeKey: `approval-decided:${approval.id}`,
    });
  }
}

export async function cancelApproval(ctx: ServiceContext, approvalId: string, comment?: string): Promise<void> {
  const user = requireUser(ctx);
  const approval = await loadApproval(ctx, z.string().uuid().parse(approvalId));
  const decision = canCancelApproval(
    { status: approval.status, requestedBy: approval.requested_by, approverId: approval.approver_id, requiredRole: approval.required_role, expiresAt: approval.expires_at },
    { userId: user.actor.userId, role: user.role, permissions: user.permissions },
  );
  if (!decision.ok) throw new DomainError("FORBIDDEN", decision.reason);
  await ctx.db.query(`update public.approvals set status = 'CANCELLED', cancelled_at = now(), decision_comment = $2 where id = $1`, [approval.id, comment ?? null]);
  await logActivity(ctx, { action: "approval.cancelled", resourceType: "approval", resourceId: approval.id, orderId: approval.order_id, summary: "Approval request cancelled" });
}

/** Executes the approved action. Handlers must be honest about what they did. */
async function executeApproval(ctx: ServiceContext, a: ApprovalRow): Promise<{ executed: boolean } & Record<string, unknown>> {
  switch (a.action_type) {
    case "TRACKING_CHANGE": {
      const p = payloadSchemas.TRACKING_CHANGE!.parse(a.action_payload) as { trackingNumber: string };
      await applyTrackingChange(ctx, { shipmentId: a.resource_id, trackingNumber: p.trackingNumber, reason: a.reason });
      await requireRepack(ctx, a, "Tracking number changed");
      return { executed: true, action: "tracking_changed" };
    }
    case "LABEL_REPRINT":
    case "SHIPMENT_CORRECTION": {
      const p = (payloadSchemas[a.action_type]!.parse(a.action_payload) ?? {}) as { trackingNumber?: string; barcodeValue?: string };
      const { labelId } = await replaceLabel(ctx, { shipmentId: a.resource_id, reason: a.reason, trackingNumber: p.trackingNumber ?? null, barcodeValue: p.barcodeValue ?? null });
      await requireRepack(ctx, a, "Label replaced");
      return { executed: true, action: "label_replaced", labelId };
    }
    case "MANUAL_SHIP_OVERRIDE": {
      if (!a.order_id) return { executed: false, note: "No order linked" };
      await transitionOrder(ctx, { orderId: a.order_id, to: "SHIPPED", reason: `Manual ship override approved: ${a.reason}` });
      return { executed: true, action: "order_marked_shipped", carrierConfirmed: false };
    }
    case "MANUAL_DELIVERY_OVERRIDE": {
      if (!a.order_id) return { executed: false, note: "No order linked" };
      await transitionOrder(ctx, { orderId: a.order_id, to: "DELIVERED", reason: `Manual delivery override approved: ${a.reason}` });
      return { executed: true, action: "order_marked_delivered", carrierConfirmed: false };
    }
    case "CANCEL_ORDER": {
      if (!a.order_id) return { executed: false, note: "No order linked" };
      await transitionOrder(ctx, { orderId: a.order_id, to: "CANCELLED", reason: a.reason });
      return { executed: true, action: "order_cancelled", platformUpdated: false, note: "Cancel the order on the sales platform as well." };
    }
    case "REFUND_ACTION":
    case "HIGH_RISK_CUSTOMER_ACTION":
      // No platform refund integration exists yet — never pretend one ran.
      return { executed: false, note: "Approved. Perform this action on the sales platform; no automated execution is configured." };
  }
}

/** After a label/tracking correction, the package must be re-verified. */
async function requireRepack(ctx: ServiceContext, a: ApprovalRow, reason: string): Promise<void> {
  const shipment = await ctx.db.maybeOne<{ order_id: string }>(`select order_id from public.shipments where id = $1`, [a.resource_id]);
  if (!shipment) return;
  const order = await ctx.db.one<{ status: string; order_number: string }>(`select status, order_number from public.orders where id = $1`, [shipment.order_id]);
  if (order.status === "READY_TO_SHIP") {
    await transitionOrder(ctx, { orderId: shipment.order_id, to: "AWAITING_VERIFICATION", reason });
    order.status = "AWAITING_VERIFICATION";
  }
  if (["LABEL_READY", "PACKED", "AWAITING_VERIFICATION"].includes(order.status)) {
    await transitionOrder(ctx, { orderId: shipment.order_id, to: "PACKING", reason });
  }
  const live = await ctx.db.maybeOne<{ id: string; assigned_to: string | null }>(
    `select id, assigned_to from public.tasks where order_id = $1 and type = 'PACK_ORDER' and status in ('OPEN','IN_PROGRESS','AWAITING_VERIFICATION')`,
    [shipment.order_id],
  );
  if (live) {
    await ctx.db.query(
      `update public.tasks set checks_state = checks_state - 'LABEL_RETRIEVED' - 'LABEL_SCANNED' - 'PACKAGE_CONFIRMED',
              status = case when status = 'AWAITING_VERIFICATION' then 'IN_PROGRESS' else status end where id = $1`,
      [live.id],
    );
    if (live.assigned_to) {
      await notify(ctx, { recipientIds: [live.assigned_to], category: "TASK_ASSIGNED", priority: "HIGH", title: `New label for order ${order.order_number}`, body: "Retrieve the new label and scan it again.", resource: { type: "task", id: live.id }, dedupeKey: `relabel:${live.id}:${a.id}` });
    }
    return;
  }
  const lastPacker = await ctx.db.maybeOne<{ completed_by: string | null }>(
    `select completed_by from public.tasks where order_id = $1 and type = 'PACK_ORDER' and status = 'COMPLETED' order by completed_at desc limit 1`,
    [shipment.order_id],
  );
  await createTask(ctx, {
    type: "REPRINT_LABEL",
    orderId: shipment.order_id,
    shipmentId: a.resource_id,
    orderNumber: order.order_number,
    assignedTo: lastPacker?.completed_by ?? null,
    priority: "HIGH",
  });
}

export const listApprovalsSchema = z
  .object({ status: z.array(z.enum(APPROVAL_STATUSES)).optional(), limit: z.number().int().min(1).max(200).default(50) })
  .strict();

export interface ApprovalView {
  id: string;
  actionType: ApprovalAction;
  actionLabel: string;
  status: ApprovalStatus;
  requiredRole: string;
  reason: string;
  resourceType: string;
  resourceId: string;
  orderId: string | null;
  orderNumber: string | null;
  requestedBy: string | null;
  requestedByName: string | null;
  requestedAt: string;
  decidedBy: string | null;
  decisionComment: string | null;
  executedAt: string | null;
  executionResult: Record<string, unknown> | null;
  canDecide: boolean;
}

export async function getApprovals(ctx: ServiceContext, raw: z.input<typeof listApprovalsSchema> = {}): Promise<ApprovalView[]> {
  const q = listApprovalsSchema.parse(raw);
  const rows = await ctx.db.query<Record<string, unknown>>(
    `select a.*, o.order_number, coalesce(p.display_name, p.full_name) as requester_name
       from public.approvals a
       left join public.orders o on o.id = a.order_id
       left join public.profiles p on p.id = a.requested_by
      where a.organization_id = $1 and a.status = any($2)
      order by a.requested_at desc limit $3`,
    [ctx.organizationId, q.status ?? ["PENDING"], q.limit],
  );
  const now = ctx.now();
  return rows.map((r) => {
    const userId = ctx.actor.kind === "USER" ? ctx.actor.userId : "";
    const canDecide =
      ctx.actor.kind === "USER" &&
      canDecideApproval(
        { status: r.status as ApprovalStatus, requestedBy: (r.requested_by as string | null) ?? null, approverId: (r.approver_id as string | null) ?? null, requiredRole: r.required_role as "MANAGER" | "OWNER", expiresAt: (r.expires_at as Date | null) ?? null },
        { userId, role: ctx.role ?? "EMPLOYEE", permissions: ctx.permissions },
        now,
      ).ok;
    return {
      id: r.id as string,
      actionType: r.action_type as ApprovalAction,
      actionLabel: APPROVAL_CATALOG[r.action_type as ApprovalAction]?.label ?? (r.action_type as string),
      status: r.status as ApprovalStatus,
      requiredRole: r.required_role as string,
      reason: r.reason as string,
      resourceType: r.resource_type as string,
      resourceId: r.resource_id as string,
      orderId: (r.order_id as string | null) ?? null,
      orderNumber: (r.order_number as string | null) ?? null,
      requestedBy: (r.requested_by as string | null) ?? null,
      requestedByName: (r.requester_name as string | null) ?? (r.requested_by ? null : "System"),
      requestedAt: (r.requested_at as Date).toISOString(),
      decidedBy: (r.decided_by as string | null) ?? null,
      decisionComment: (r.decision_comment as string | null) ?? null,
      executedAt: r.executed_at ? (r.executed_at as Date).toISOString() : null,
      executionResult: (r.execution_result as Record<string, unknown> | null) ?? null,
      canDecide,
    };
  });
}
