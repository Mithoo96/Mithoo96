/**
 * Exception Engine service: raise (idempotent, escalating), acknowledge,
 * assign, resolve, auto-resolve, list.
 */
import { z } from "zod";
import {
  EXCEPTION_CATALOG,
  EXCEPTION_STATUSES,
  EXCEPTION_TYPES,
  exceptionDedupeKey,
  type ExceptionCandidate,
  type ExceptionType,
} from "@/core/exceptions/catalog";
import { DomainError, notFound } from "@/core/errors";
import { SEVERITIES, severityRank, type Severity } from "@/core/severity";
import { actorUserId, requirePermission, requireUser, type ServiceContext } from "../context";
import { logActivity } from "./activity";
import { notify } from "./notifications";

export type ExceptionSource = "SYSTEM_RULE" | "EMPLOYEE" | "MANAGER" | "INTEGRATION";

export interface RaiseResult {
  readonly exceptionId: string;
  readonly inserted: boolean;
  readonly escalated: boolean;
  readonly severity: Severity;
}

export async function raiseException(
  ctx: ServiceContext,
  c: ExceptionCandidate,
  opts: { source?: ExceptionSource; notifyManagers?: boolean } = {},
): Promise<RaiseResult> {
  const def = EXCEPTION_CATALOG[c.type];
  const source: ExceptionSource = opts.source ?? "SYSTEM_RULE";
  const row = await ctx.db.one<{ exception_id: string; inserted: boolean; escalated: boolean; severity: Severity; previous_severity: Severity | null }>(
    `select * from app.raise_exception($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      ctx.organizationId,
      c.type,
      c.severity,
      def.title,
      c.description,
      def.recommendedAction,
      def.orderState,
      c.dedupeKey,
      source === "SYSTEM_RULE" ? def.autoResolvable : false,
      source,
      c.orderId,
      c.shipmentId,
      c.taskId,
      c.deadlineAt,
      JSON.stringify(c.metadata ?? {}),
    ],
  );

  if (row.inserted || row.escalated) {
    await logActivity(ctx, {
      action: row.inserted ? "exception.created" : "exception.escalated",
      resourceType: "exception",
      resourceId: row.exception_id,
      orderId: c.orderId,
      summary: row.inserted
        ? `${def.title} (${row.severity}): ${c.description}`
        : `${def.title} escalated ${row.previous_severity} → ${row.severity}`,
      changes: row.escalated ? { severity: { from: row.previous_severity, to: row.severity } } : null,
      metadata: { type: c.type, source },
    });
    if (opts.notifyManagers !== false && severityRank(row.severity) >= severityRank("MEDIUM")) {
      await notify(ctx, {
        toRoles: severityRank(row.severity) >= severityRank("CRITICAL") ? ["MANAGER", "OWNER"] : ["MANAGER"],
        category: "EXCEPTION",
        priority: row.severity === "CRITICAL" ? "URGENT" : row.severity === "HIGH" ? "HIGH" : "NORMAL",
        title: `${row.severity === "CRITICAL" ? "Critical: " : ""}${def.title}`,
        body: c.description,
        resource: { type: "exception", id: row.exception_id },
        dedupeKey: `exception:${row.exception_id}:${row.severity}`,
      });
    }
  }
  return { exceptionId: row.exception_id, inserted: row.inserted, escalated: row.escalated, severity: row.severity };
}

export async function autoResolveExceptions(ctx: ServiceContext, dedupeKeys: readonly string[], note: string): Promise<string[]> {
  if (dedupeKeys.length === 0) return [];
  const rows = await ctx.db.query<{ id: string }>(`select app.auto_resolve_exceptions($1, $2, $3) as id`, [ctx.organizationId, dedupeKeys, note]);
  return rows.map((r) => r.id);
}

export const reportIssueSchema = z
  .object({
    orderId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    description: z.string().trim().min(5).max(2000),
  })
  .strict();

/** Employee "something is wrong" button. */
export async function reportIssue(ctx: ServiceContext, raw: z.input<typeof reportIssueSchema>): Promise<RaiseResult> {
  const user = requireUser(ctx);
  requirePermission(ctx, "exceptions.report");
  const input = reportIssueSchema.parse(raw);
  const anchor = input.taskId ?? input.orderId ?? crypto.randomUUID();
  return raiseException(
    ctx,
    {
      type: "EMPLOYEE_REPORTED_ISSUE",
      severity: "MEDIUM",
      dedupeKey: `${exceptionDedupeKey("EMPLOYEE_REPORTED_ISSUE", input.taskId ? "task" : "order", anchor)}:${user.actor.userId}:${Date.now()}`,
      orderId: input.orderId ?? null,
      shipmentId: null,
      taskId: input.taskId ?? null,
      description: input.description,
      deadlineAt: null,
    },
    { source: "EMPLOYEE" },
  );
}

export const createExceptionSchema = z
  .object({
    type: z.enum(EXCEPTION_TYPES),
    severity: z.enum(SEVERITIES).optional(),
    description: z.string().trim().min(3).max(2000),
    orderId: z.string().uuid().optional(),
    shipmentId: z.string().uuid().optional(),
    deadlineAt: z.string().datetime().optional(),
    assignedTo: z.string().uuid().optional(),
  })
  .strict();

/** Manager-created exception. */
export async function createException(ctx: ServiceContext, raw: z.input<typeof createExceptionSchema>): Promise<RaiseResult> {
  requirePermission(ctx, "exceptions.resolve");
  const input = createExceptionSchema.parse(raw);
  const result = await raiseException(
    ctx,
    {
      type: input.type,
      severity: input.severity ?? EXCEPTION_CATALOG[input.type].defaultSeverity,
      dedupeKey: `${input.type}:manual:${crypto.randomUUID()}`,
      orderId: input.orderId ?? null,
      shipmentId: input.shipmentId ?? null,
      taskId: null,
      description: input.description,
      deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : null,
    },
    { source: "MANAGER" },
  );
  if (input.assignedTo) await assignException(ctx, result.exceptionId, input.assignedTo);
  return result;
}

export async function assignException(ctx: ServiceContext, exceptionId: string, assigneeId: string): Promise<void> {
  requirePermission(ctx, "exceptions.resolve");
  const row = await ctx.db.maybeOne<{ id: string; order_id: string | null; title: string }>(
    `update public.exceptions set assigned_to = $3
      where id = $2 and organization_id = $1 and status in ('OPEN','ACKNOWLEDGED','IN_PROGRESS')
      returning id, order_id, title`,
    [ctx.organizationId, exceptionId, assigneeId],
  );
  if (!row) throw notFound("Open exception");
  await logActivity(ctx, { action: "exception.assigned", resourceType: "exception", resourceId: exceptionId, orderId: row.order_id, summary: `Exception "${row.title}" assigned`, metadata: { assigneeId } });
  await notify(ctx, { recipientIds: [assigneeId], category: "EXCEPTION", title: `Assigned: ${row.title}`, resource: { type: "exception", id: exceptionId }, dedupeKey: `exception-assign:${exceptionId}:${assigneeId}` });
}

export async function acknowledgeException(ctx: ServiceContext, exceptionId: string): Promise<void> {
  const user = requireUser(ctx);
  const row = await ctx.db.maybeOne<{ order_id: string | null; title: string }>(
    `update public.exceptions set status = 'ACKNOWLEDGED', acknowledged_at = now(), acknowledged_by = $3
      where id = $2 and organization_id = $1 and status = 'OPEN'
      returning order_id, title`,
    [ctx.organizationId, exceptionId, user.actor.userId],
  );
  if (!row) throw notFound("Open exception");
  await logActivity(ctx, { action: "exception.acknowledged", resourceType: "exception", resourceId: exceptionId, orderId: row.order_id, summary: `Exception "${row.title}" acknowledged` });
}

export const resolveExceptionSchema = z
  .object({
    exceptionId: z.string().uuid(),
    resolution: z.enum(["RESOLVED", "DISMISSED"]).default("RESOLVED"),
    notes: z.string().trim().min(3).max(4000),
  })
  .strict();

export async function resolveException(ctx: ServiceContext, raw: z.input<typeof resolveExceptionSchema>): Promise<void> {
  requirePermission(ctx, "exceptions.resolve");
  const input = resolveExceptionSchema.parse(raw);
  const row = await ctx.db.maybeOne<{ order_id: string | null; title: string; status: string }>(
    `update public.exceptions
        set status = $3, resolved_at = now(), resolved_by = $4, resolution_notes = $5
      where id = $2 and organization_id = $1 and status in ('OPEN','ACKNOWLEDGED','IN_PROGRESS')
      returning order_id, title, status`,
    [ctx.organizationId, input.exceptionId, input.resolution, actorUserId(ctx), input.notes],
  );
  if (!row) throw notFound("Open exception");
  await logActivity(ctx, {
    action: input.resolution === "RESOLVED" ? "exception.resolved" : "exception.dismissed",
    resourceType: "exception",
    resourceId: input.exceptionId,
    orderId: row.order_id,
    summary: `Exception "${row.title}" ${input.resolution.toLowerCase()}: ${input.notes}`,
  });
}

export const listExceptionsSchema = z
  .object({
    status: z.array(z.enum(EXCEPTION_STATUSES)).optional(),
    severity: z.array(z.enum(SEVERITIES)).optional(),
    type: z.array(z.enum(EXCEPTION_TYPES)).optional(),
    orderId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).default(50),
  })
  .strict();

export interface ExceptionView {
  id: string;
  type: ExceptionType;
  severity: Severity;
  status: string;
  title: string;
  description: string | null;
  recommendedAction: string | null;
  orderId: string | null;
  orderNumber: string | null;
  shipmentId: string | null;
  taskId: string | null;
  detectedAt: string;
  lastDetectedAt: string;
  occurrences: number;
  deadlineAt: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  source: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

export async function getExceptions(ctx: ServiceContext, raw: z.input<typeof listExceptionsSchema> = {}): Promise<ExceptionView[]> {
  const q = listExceptionsSchema.parse(raw);
  const statuses = q.status ?? ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"];
  const rows = await ctx.db.query<Record<string, unknown>>(
    `select e.*, o.order_number, coalesce(p.display_name, p.full_name) as assignee_name
       from public.exceptions e
       left join public.orders o on o.id = e.order_id
       left join public.profiles p on p.id = e.assigned_to
      where e.organization_id = $1
        and e.status = any($2)
        and ($3::text[] is null or e.severity = any($3))
        and ($4::text[] is null or e.type = any($4))
        and ($5::uuid is null or e.order_id = $5)
      order by case e.severity when 'CRITICAL' then 4 when 'HIGH' then 3 when 'MEDIUM' then 2 else 1 end desc,
               e.deadline_at nulls last, e.detected_at
      limit $6`,
    [ctx.organizationId, statuses, q.severity ?? null, q.type ?? null, q.orderId ?? null, q.limit],
  );
  return rows.map(toExceptionView);
}

function iso(v: unknown): string | null {
  return v instanceof Date ? v.toISOString() : null;
}

export function toExceptionView(r: Record<string, unknown>): ExceptionView {
  return {
    id: r.id as string,
    type: r.type as ExceptionType,
    severity: r.severity as Severity,
    status: r.status as string,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    recommendedAction: (r.recommended_action as string | null) ?? null,
    orderId: (r.order_id as string | null) ?? null,
    orderNumber: (r.order_number as string | null) ?? null,
    shipmentId: (r.shipment_id as string | null) ?? null,
    taskId: (r.task_id as string | null) ?? null,
    detectedAt: iso(r.detected_at)!,
    lastDetectedAt: iso(r.last_detected_at)!,
    occurrences: r.occurrences as number,
    deadlineAt: iso(r.deadline_at),
    assignedTo: (r.assigned_to as string | null) ?? null,
    assignedToName: (r.assignee_name as string | null) ?? null,
    source: r.source as string,
    resolvedAt: iso(r.resolved_at),
    resolutionNotes: (r.resolution_notes as string | null) ?? null,
  };
}

export function assertExceptionType(v: string): ExceptionType {
  if (!(EXCEPTION_TYPES as readonly string[]).includes(v)) throw new DomainError("VALIDATION_FAILED", "Unknown exception type");
  return v as ExceptionType;
}
