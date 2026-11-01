/**
 * Task Engine primitives shared by the generic task API and workflow-specific
 * modules (packing). No workflow knowledge here.
 */
import { DomainError, notFound } from "@/core/errors";
import { TASK_CATALOG, type TaskCheck, type TaskPriority, type TaskStatus, type TaskType } from "@/core/tasks/catalog";
import { rankTasksForEmployee, type ChecksState, type TaskLike } from "@/core/tasks/rules";
import { actorUserId, requireUser, requirePermission, type ServiceContext } from "../context";
import { logActivity } from "./activity";
import { notify } from "./notifications";

export interface TaskRow {
  id: string;
  organization_id: string;
  order_id: string | null;
  shipment_id: string | null;
  exception_id: string | null;
  type: TaskType;
  title: string;
  instructions: { key: string; text: string; check: TaskCheck | null }[];
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  due_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  required_checks: TaskCheck[];
  required_evidence: string[];
  checks_state: ChecksState;
  requires_signoff: boolean;
  verification_status: string;
  created_at: Date;
  metadata: Record<string, unknown>;
}

export function toTaskLike(t: TaskRow): TaskLike {
  return {
    id: t.id,
    status: t.status,
    assignedTo: t.assigned_to,
    priority: t.priority,
    dueAt: t.due_at,
    createdAt: t.created_at,
    requiredChecks: t.required_checks,
    requiredEvidence: t.required_evidence,
    checksState: t.checks_state ?? {},
  };
}

export async function loadTask(ctx: ServiceContext, taskId: string, opts: { forUpdate?: boolean } = {}): Promise<TaskRow> {
  const t = await ctx.db.maybeOne<TaskRow>(
    `select * from public.tasks where id = $1 and organization_id = $2 ${opts.forUpdate ? "for update" : ""}`,
    [taskId, ctx.organizationId],
  );
  if (!t) throw notFound("Task");
  return t;
}

export interface CreateTaskInput {
  readonly type: TaskType;
  readonly orderId?: string | null;
  readonly shipmentId?: string | null;
  readonly exceptionId?: string | null;
  readonly orderNumber?: string;
  readonly title?: string;
  readonly priority?: TaskPriority;
  readonly dueAt?: Date | null;
  readonly assignedTo?: string | null;
  readonly requiredEvidence?: readonly string[];
  readonly requiresSignoff?: boolean;
  readonly metadata?: Record<string, unknown>;
}

/** Idempotent per (order, type): returns the existing live task if one exists. */
export async function createTask(ctx: ServiceContext, input: CreateTaskInput): Promise<{ taskId: string; created: boolean }> {
  requirePermission(ctx, "tasks.assign");
  const def = TASK_CATALOG[input.type];
  const due = input.dueAt ?? new Date(ctx.now().getTime() + def.defaultDueMinutes * 60_000);
  const row = await ctx.db.maybeOne<{ id: string }>(
    `insert into public.tasks
       (organization_id, order_id, shipment_id, exception_id, type, title, instructions, priority, due_at,
        assigned_to, assigned_at, required_checks, required_evidence, requires_signoff, verification_status, metadata, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, case when $10::uuid is null then null else now() end, $11, $12, $13, $14, $15, $16)
     on conflict (order_id, type) where order_id is not null and status not in ('COMPLETED', 'CANCELLED') do nothing
     returning id`,
    [
      ctx.organizationId,
      input.orderId ?? null,
      input.shipmentId ?? null,
      input.exceptionId ?? null,
      input.type,
      input.title ?? def.title({ orderNumber: input.orderNumber }),
      JSON.stringify(def.instructions),
      input.priority ?? def.defaultPriority,
      due,
      input.assignedTo ?? null,
      def.requiredChecks,
      input.requiredEvidence ?? [],
      input.requiresSignoff ?? false,
      input.requiresSignoff ? "PENDING" : def.requiredChecks.length > 0 || (input.requiredEvidence?.length ?? 0) > 0 ? "PENDING" : "NOT_REQUIRED",
      JSON.stringify(input.metadata ?? {}),
      actorUserId(ctx),
    ],
  );
  if (!row) {
    const existing = await ctx.db.one<{ id: string }>(
      `select id from public.tasks where order_id = $1 and type = $2 and status not in ('COMPLETED','CANCELLED')`,
      [input.orderId, input.type],
    );
    return { taskId: existing.id, created: false };
  }
  if (input.assignedTo) {
    await ctx.db.query(
      `insert into public.task_assignments (organization_id, task_id, assigned_to, assigned_by, reason) values ($1, $2, $3, $4, 'CREATED')`,
      [ctx.organizationId, row.id, input.assignedTo, actorUserId(ctx)],
    );
  }
  await logActivity(ctx, {
    action: "task.created",
    resourceType: "task",
    resourceId: row.id,
    orderId: input.orderId ?? null,
    summary: `Task created: ${input.title ?? def.title({ orderNumber: input.orderNumber })}`,
    metadata: { type: input.type, assignedTo: input.assignedTo ?? null },
  });
  if (input.assignedTo) {
    await notify(ctx, {
      recipientIds: [input.assignedTo],
      category: "TASK_ASSIGNED",
      title: "New task assigned",
      body: input.title ?? def.title({ orderNumber: input.orderNumber }),
      resource: { type: "task", id: row.id },
      dedupeKey: `task-assigned:${row.id}:${input.assignedTo}`,
      excludeActor: false,
    });
  }
  return { taskId: row.id, created: true };
}

export async function assignTask(ctx: ServiceContext, taskId: string, assigneeId: string | null, reason?: string): Promise<void> {
  requirePermission(ctx, "tasks.assign");
  const task = await loadTask(ctx, taskId, { forUpdate: true });
  if (task.status === "COMPLETED" || task.status === "CANCELLED") throw new DomainError("CONFLICT", `Task is ${task.status}`);
  if (task.assigned_to === assigneeId) return;
  await ctx.db.query(
    `update public.task_assignments set unassigned_at = now() where task_id = $1 and unassigned_at is null`,
    [taskId],
  );
  // Reassigning an in-progress task returns it to OPEN for the new assignee.
  await ctx.db.query(
    `update public.tasks set assigned_to = $2, assigned_at = case when $2::uuid is null then null else now() end,
            status = case when status = 'IN_PROGRESS' then 'OPEN' else status end,
            started_at = case when status = 'IN_PROGRESS' then null else started_at end
      where id = $1`,
    [taskId, assigneeId],
  );
  if (assigneeId) {
    await ctx.db.query(
      `insert into public.task_assignments (organization_id, task_id, assigned_to, assigned_by, reason) values ($1, $2, $3, $4, $5)`,
      [ctx.organizationId, taskId, assigneeId, actorUserId(ctx), reason ?? (task.assigned_to ? "REASSIGNED" : "ASSIGNED")],
    );
    await notify(ctx, {
      recipientIds: [assigneeId],
      category: "TASK_ASSIGNED",
      title: "New task assigned",
      body: task.title,
      resource: { type: "task", id: taskId },
      dedupeKey: `task-assigned:${taskId}:${assigneeId}:${Date.now()}`,
      excludeActor: false,
    });
  }
  await logActivity(ctx, {
    action: task.assigned_to ? "task.reassigned" : "task.assigned",
    resourceType: "task",
    resourceId: taskId,
    orderId: task.order_id,
    summary: `Task "${task.title}" ${assigneeId ? "assigned" : "unassigned"}`,
    changes: { assigned_to: { from: task.assigned_to, to: assigneeId } },
    metadata: { reason: reason ?? null },
  });
}

export async function recordCheck(
  ctx: ServiceContext,
  task: TaskRow,
  check: TaskCheck,
  state: { passed: boolean; value?: string | null; details?: Record<string, unknown> },
): Promise<ChecksState> {
  const userId = actorUserId(ctx) ?? "system";
  const next: ChecksState = {
    ...(task.checks_state ?? {}),
    [check]: { passed: state.passed, at: ctx.now().toISOString(), by: userId, value: state.value ?? null, details: state.details },
  };
  await ctx.db.query(`update public.tasks set checks_state = $2 where id = $1`, [task.id, JSON.stringify(next)]);
  task.checks_state = next;
  return next;
}

/** One canonical working task per employee, serialized across browser tabs and requests. */
export async function lockEmployeeQueue(ctx: ServiceContext): Promise<string | null> {
  const user = requireUser(ctx);
  await ctx.db.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`task-start:${ctx.organizationId}:${user.actor.userId}`]);
  const active = await ctx.db.query<TaskRow>(`select * from public.tasks where organization_id = $1 and assigned_to = $2 and status = 'IN_PROGRESS'`, [ctx.organizationId, user.actor.userId]);
  return rankTasksForEmployee(active.map(toTaskLike), user.actor.userId, { includePool: false })[0]?.id ?? null;
}
