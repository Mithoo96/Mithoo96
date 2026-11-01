/**
 * Activity / audit log. Answers WHO did WHAT, WHEN, to WHICH resource.
 * Append-only at the database level.
 */
import { z } from "zod";
import { validationFailed } from "@/core/errors";
import { actorUserId, requireUser, type ServiceContext } from "../context";

export interface ActivityEntryInput {
  readonly action: string; // e.g. "task.started"
  readonly resourceType: string; // e.g. "task"
  readonly resourceId: string | null;
  readonly orderId?: string | null;
  readonly summary: string;
  readonly changes?: Record<string, { from: unknown; to: unknown }> | null;
  readonly metadata?: Record<string, unknown>;
}

const ACTION_RE = /^[a-z_]+\.[a-z_]+$/;

export async function logActivity(ctx: ServiceContext, entry: ActivityEntryInput): Promise<void> {
  if (!ACTION_RE.test(entry.action)) throw validationFailed(`Invalid activity action "${entry.action}"`);
  const userId = actorUserId(ctx);
  const actorType = userId ? "USER" : ctx.actor.kind === "SYSTEM" && ctx.actor.label.startsWith("integration:") ? "INTEGRATION" : "SYSTEM";
  await ctx.db.query(
    `insert into public.activity_logs
       (organization_id, actor_type, actor_id, actor_label, action, resource_type, resource_id, order_id, summary, changes, metadata, request_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      ctx.organizationId,
      actorType,
      userId,
      ctx.actor.kind === "SYSTEM" ? ctx.actor.label : null,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      entry.orderId ?? null,
      entry.summary,
      entry.changes ? JSON.stringify(entry.changes) : null,
      JSON.stringify(entry.metadata ?? {}),
      ctx.requestId ?? null,
    ],
  );
}

export type EmployeeActionType =
  | "TASK_STARTED"
  | "LABEL_RETRIEVED"
  | "LABEL_PRINTED"
  | "ITEMS_CONFIRMED"
  | "LABEL_SCANNED"
  | "PACKAGE_CONFIRMED"
  | "EVIDENCE_SUBMITTED"
  | "TASK_COMPLETED"
  | "TASK_BLOCKED"
  | "ISSUE_REPORTED";

export async function recordEmployeeAction(
  ctx: ServiceContext,
  input: {
    actionType: EmployeeActionType;
    result?: "OK" | "MISMATCH" | "REJECTED" | "ERROR";
    taskId?: string | null;
    orderId?: string | null;
    shipmentId?: string | null;
    payload?: Record<string, unknown>;
    deviceInfo?: Record<string, unknown> | null;
  },
): Promise<void> {
  const user = requireUser(ctx);
  await ctx.db.query(
    `insert into public.employee_actions
       (organization_id, user_id, task_id, order_id, shipment_id, action_type, result, payload, device_info)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      ctx.organizationId,
      user.actor.userId,
      input.taskId ?? null,
      input.orderId ?? null,
      input.shipmentId ?? null,
      input.actionType,
      input.result ?? "OK",
      JSON.stringify(input.payload ?? {}),
      input.deviceInfo ? JSON.stringify(input.deviceInfo) : null,
    ],
  );
}

export const timelineQuerySchema = z
  .object({
    orderId: z.string().uuid().optional(),
    resourceType: z.string().regex(/^[a-z_]+$/).optional(),
    resourceId: z.string().uuid().optional(),
    before: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(200).default(50),
  })
  .strict();

export interface TimelineEntry {
  id: string;
  occurredAt: string;
  actorType: "USER" | "SYSTEM" | "INTEGRATION";
  actorId: string | null;
  actorName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  orderId: string | null;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  metadata: Record<string, unknown>;
}

/** Timeline, newest first. RLS limits employees to their own entries. */
export async function getActivityTimeline(ctx: ServiceContext, raw: z.input<typeof timelineQuerySchema>): Promise<TimelineEntry[]> {
  const q = timelineQuerySchema.parse(raw);
  const rows = await ctx.db.query<{
    id: string;
    occurred_at: Date;
    actor_type: TimelineEntry["actorType"];
    actor_id: string | null;
    actor_label: string | null;
    actor_name: string | null;
    action: string;
    resource_type: string;
    resource_id: string | null;
    order_id: string | null;
    summary: string;
    changes: TimelineEntry["changes"];
    metadata: Record<string, unknown>;
  }>(
    `select a.id, a.occurred_at, a.actor_type, a.actor_id, a.actor_label,
            coalesce(p.display_name, p.full_name) as actor_name,
            a.action, a.resource_type, a.resource_id, a.order_id, a.summary, a.changes, a.metadata
       from public.activity_logs a
       left join public.profiles p on p.id = a.actor_id
      where a.organization_id = $1
        and ($2::uuid is null or a.order_id = $2)
        and ($3::text is null or a.resource_type = $3)
        and ($4::uuid is null or a.resource_id = $4)
        and ($5::timestamptz is null or a.occurred_at < $5)
      order by a.occurred_at desc, a.id desc
      limit $6`,
    [ctx.organizationId, q.orderId ?? null, q.resourceType ?? null, q.resourceId ?? null, q.before ?? null, q.limit],
  );
  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurred_at.toISOString(),
    actorType: r.actor_type,
    actorId: r.actor_id,
    actorName: r.actor_name ?? (r.actor_type !== "USER" ? r.actor_label ?? "System" : null),
    action: r.action,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    orderId: r.order_id,
    summary: r.summary,
    changes: r.changes,
    metadata: r.metadata,
  }));
}
