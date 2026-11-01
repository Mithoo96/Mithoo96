/**
 * Task Engine public API + Employee Mode data contract.
 */
import { z } from "zod";
import { DomainError, notFound } from "@/core/errors";
import { maskTracking } from "@/core/shipping/verification";
import { TASK_CATALOG, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES, type TaskCheck } from "@/core/tasks/catalog";
import { canStartTask, evaluateTaskCompletion, rankTasksForEmployee, taskStepProgress } from "@/core/tasks/rules";
import { requirePermission, requireUser, type ServiceContext } from "../context";
import { logActivity, recordEmployeeAction } from "./activity";
import { notify } from "./notifications";
import { transitionOrder } from "./orders";
import { completePackTask, onPackTaskStarted, type CompletionResult } from "./packing";
import { getSetting } from "./settings";
import { runShipmentVerification } from "./shipping";
import { assignTask, createTask, lockEmployeeQueue, loadTask, toTaskLike, type TaskRow } from "./tasks-core";

export { assignTask, createTask };

export const createTaskSchema = z
  .object({
    type: z.enum(TASK_TYPES),
    orderId: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(200).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueAt: z.string().datetime().optional(),
    assignedTo: z.string().uuid().optional(),
  })
  .strict();

export async function createManualTask(ctx: ServiceContext, raw: z.input<typeof createTaskSchema>) {
  const input = createTaskSchema.parse(raw);
  return createTask(ctx, { ...input, dueAt: input.dueAt ? new Date(input.dueAt) : null });
}

export async function startTask(ctx: ServiceContext, taskId: string): Promise<void> {
  const user = requireUser(ctx);
  requirePermission(ctx, "tasks.work");
  const currentTaskId = await lockEmployeeQueue(ctx);
  const task = await loadTask(ctx, z.string().uuid().parse(taskId), { forUpdate: true });
  const decision = canStartTask(toTaskLike(task), user.actor.userId);
  if (!decision.ok) throw new DomainError("GUARD_FAILED", decision.reason);
  if (currentTaskId && currentTaskId !== task.id) throw new DomainError("CONFLICT", "Finish or resume your current task before starting another order");
  if (task.status === "IN_PROGRESS") return;
  await ctx.db.query(`update public.tasks set status = 'IN_PROGRESS', started_at = now() where id = $1`, [task.id]);
  task.status = "IN_PROGRESS";
  await recordEmployeeAction(ctx, { actionType: "TASK_STARTED", taskId: task.id, orderId: task.order_id, shipmentId: task.shipment_id });
  await logActivity(ctx, { action: "task.started", resourceType: "task", resourceId: task.id, orderId: task.order_id, summary: `Started task "${task.title}"` });
  if (task.type === "PACK_ORDER" || task.type === "REPRINT_LABEL") await onPackTaskStarted(ctx, task);
}

/** Completes a task only when every required validation is present. */
export async function completeTask(ctx: ServiceContext, taskId: string): Promise<CompletionResult> {
  const user = requireUser(ctx);
  requirePermission(ctx, "tasks.work");
  const currentTaskId = await lockEmployeeQueue(ctx);
  const task = await loadTask(ctx, z.string().uuid().parse(taskId), { forUpdate: true });
  if (task.assigned_to !== user.actor.userId) throw new DomainError("FORBIDDEN", "This task is not assigned to you");
  if (currentTaskId && currentTaskId !== task.id) throw new DomainError("CONFLICT", "Resume your current task before completing another order");

  if ((task.type === "PACK_ORDER" || task.type === "REPRINT_LABEL") && task.order_id && task.shipment_id) {
    return completePackTask(ctx, task as TaskRow & { order_id: string; shipment_id: string });
  }

  const evidence = await ctx.db.query<{ evidence_type: string }>(
    `select distinct evidence_type from public.order_evidence where task_id = $1 and review_status <> 'REJECTED'`,
    [task.id],
  );
  const decision = evaluateTaskCompletion(toTaskLike(task), { userId: user.actor.userId, submittedEvidenceTypes: evidence.map((e) => e.evidence_type) });
  if (!decision.ok) return { completed: false, status: "BLOCKED_BY_VALIDATION", missing: [...(decision.missing ?? [])], message: decision.reason };
  const next = task.requires_signoff ? "AWAITING_VERIFICATION" : "COMPLETED";
  await ctx.db.query(
    `update public.tasks set status = $2, completed_at = case when $2 = 'COMPLETED' then now() else completed_at end,
            completed_by = case when $2 = 'COMPLETED' then $3::uuid else completed_by end,
            verification_status = case when requires_signoff then 'PENDING' else verification_status end
      where id = $1`,
    [task.id, next, user.actor.userId],
  );
  await recordEmployeeAction(ctx, { actionType: "TASK_COMPLETED", taskId: task.id, orderId: task.order_id });
  await logActivity(ctx, { action: next === "COMPLETED" ? "task.completed" : "task.submitted", resourceType: "task", resourceId: task.id, orderId: task.order_id, summary: `Task "${task.title}" ${next === "COMPLETED" ? "completed" : "submitted for sign-off"}` });
  return { completed: next === "COMPLETED", status: next, missing: [], message: next === "COMPLETED" ? "Task completed." : "Submitted for sign-off." };
}

export const verifyTaskSchema = z
  .object({ taskId: z.string().uuid(), approve: z.boolean(), comment: z.string().trim().max(2000).optional() })
  .strict();

/** Manager sign-off on a task awaiting verification (configurable approval point). */
export async function verifyTask(ctx: ServiceContext, raw: z.input<typeof verifyTaskSchema>): Promise<void> {
  const user = requireUser(ctx);
  requirePermission(ctx, "tasks.verify");
  const input = verifyTaskSchema.parse(raw);
  const task = await loadTask(ctx, input.taskId, { forUpdate: true });
  if (task.status !== "AWAITING_VERIFICATION") throw new DomainError("CONFLICT", `Task is ${task.status}`);
  if (task.assigned_to === user.actor.userId) throw new DomainError("FORBIDDEN", "You cannot sign off your own work");
  if (input.approve) {
    await ctx.db.query(
      `update public.tasks set status = 'COMPLETED', completed_at = now(), completed_by = assigned_to,
              verification_status = 'VERIFIED', verified_at = now(), verified_by = $2 where id = $1`,
      [task.id, user.actor.userId],
    );
    if (task.order_id && task.type === "PACK_ORDER") {
      await transitionOrder(ctx, { orderId: task.order_id, to: "READY_TO_SHIP", reason: input.comment ?? "Manager signed off the package" });
      if (task.shipment_id) {
        await runShipmentVerification(ctx, { shipmentId: task.shipment_id, packageConfirmed: true, requiredEvidence: task.required_evidence, taskId: task.id });
      }
    }
  } else {
    await ctx.db.query(
      `update public.tasks set status = 'IN_PROGRESS', verification_status = 'FAILED', verified_at = now(), verified_by = $2,
              checks_state = checks_state - 'PACKAGE_CONFIRMED' - 'LABEL_SCANNED' where id = $1`,
      [task.id, user.actor.userId],
    );
    if (task.order_id && task.type === "PACK_ORDER") {
      await transitionOrder(ctx, { orderId: task.order_id, to: "PACKING", reason: input.comment ?? "Manager rejected the package" });
    }
    if (task.assigned_to) {
      await notify(ctx, { recipientIds: [task.assigned_to], category: "TASK_ASSIGNED", priority: "HIGH", title: "Package needs rework", body: input.comment ?? task.title, resource: { type: "task", id: task.id }, dedupeKey: `task-rework:${task.id}:${Date.now()}` });
    }
  }
  await logActivity(ctx, {
    action: input.approve ? "task.verified" : "task.rejected",
    resourceType: "task",
    resourceId: task.id,
    orderId: task.order_id,
    summary: `Task "${task.title}" ${input.approve ? "signed off" : "rejected"}${input.comment ? `: ${input.comment}` : ""}`,
  });
}

export const listTasksSchema = z
  .object({
    status: z.array(z.enum(TASK_STATUSES)).optional(),
    assignedTo: z.string().uuid().optional(),
    unassignedOnly: z.boolean().optional(),
    type: z.array(z.enum(TASK_TYPES)).optional(),
    limit: z.number().int().min(1).max(200).default(100),
  })
  .strict();

export interface TaskSummary {
  id: string;
  type: string;
  title: string;
  status: string;
  priority: string;
  orderId: string | null;
  orderNumber: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  dueAt: string | null;
  overdue: boolean;
  startedAt: string | null;
  completedAt: string | null;
  verificationStatus: string;
}

/** Managers: all tasks (filterable). Employees: RLS restricts to their own. */
export async function getEmployeeTasks(ctx: ServiceContext, raw: z.input<typeof listTasksSchema> = {}): Promise<TaskSummary[]> {
  const q = listTasksSchema.parse(raw);
  const rows = await ctx.db.query<Record<string, unknown>>(
    `select t.id, t.type, t.title, t.status, t.priority, t.order_id, o.order_number, t.assigned_to,
            coalesce(p.display_name, p.full_name) as assignee_name, t.due_at, t.started_at, t.completed_at, t.verification_status
       from public.tasks t
       left join public.orders o on o.id = t.order_id
       left join public.profiles p on p.id = t.assigned_to
      where t.organization_id = $1
        and t.status = any($2)
        and ($3::uuid is null or t.assigned_to = $3)
        and ($4::boolean is not true or t.assigned_to is null)
        and ($5::text[] is null or t.type = any($5))
      order by case t.priority when 'URGENT' then 0 when 'HIGH' then 1 when 'NORMAL' then 2 else 3 end, t.due_at nulls last, t.created_at
      limit $6`,
    [ctx.organizationId, q.status ?? ["OPEN", "IN_PROGRESS", "BLOCKED", "AWAITING_VERIFICATION"], q.assignedTo ?? null, q.unassignedOnly ?? null, q.type ?? null, q.limit],
  );
  const now = ctx.now().getTime();
  return rows.map((r) => ({
    id: r.id as string,
    type: r.type as string,
    title: r.title as string,
    status: r.status as string,
    priority: r.priority as string,
    orderId: (r.order_id as string | null) ?? null,
    orderNumber: (r.order_number as string | null) ?? null,
    assignedTo: (r.assigned_to as string | null) ?? null,
    assignedToName: (r.assignee_name as string | null) ?? null,
    dueAt: r.due_at ? (r.due_at as Date).toISOString() : null,
    overdue: r.due_at instanceof Date && r.due_at.getTime() < now && !["COMPLETED", "CANCELLED"].includes(r.status as string),
    startedAt: r.started_at ? (r.started_at as Date).toISOString() : null,
    completedAt: r.completed_at ? (r.completed_at as Date).toISOString() : null,
    verificationStatus: r.verification_status as string,
  }));
}

// ---------------------------------------------------------------------------
// Employee Mode
// ---------------------------------------------------------------------------

export interface EmployeeTaskDetail {
  id: string;
  type: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  order: { id: string; orderNumber: string; shipByAt: string | null; status: string } | null;
  items: { orderItemId: string; sku: string; name: string; quantity: number; binLocation: string | null; imageUrl: string | null }[];
  label: { carrier: string | null; trackingLast4: string | null; ready: boolean } | null;
  steps: { key: string; text: string; check: TaskCheck | null; done: boolean; failed: boolean }[];
  currentStep: string | null;
  requiredEvidence: string[];
  submittedEvidence: string[];
}

/** Everything one employee needs for one task — and nothing sensitive (no customer PII, no prices). */
export async function getTaskDetail(ctx: ServiceContext, taskId: string): Promise<EmployeeTaskDetail> {
  const task = await loadTask(ctx, z.string().uuid().parse(taskId));
  const order = task.order_id
    ? await ctx.db.maybeOne<{ id: string; order_number: string; ship_by_at: Date | null; status: string }>(
        `select id, order_number, ship_by_at, status from public.orders where id = $1`,
        [task.order_id],
      )
    : null;
  const items = task.order_id
    ? await ctx.db.query<{ id: string; sku: string; name: string; quantity: number; bin_location: string | null; image_url: string | null }>(
        `select i.id, i.sku, i.name, i.quantity, p.bin_location, p.image_url
           from public.order_items i left join public.products p on p.id = i.product_id
          where i.order_id = $1 order by p.bin_location nulls last, i.sku`,
        [task.order_id],
      )
    : [];
  const label = task.shipment_id
    ? await ctx.db.maybeOne<{ carrier: string | null; tracking_number: string | null; status: string }>(
        `select carrier, tracking_number, status from public.shipping_labels where shipment_id = $1 and status in ('PENDING','READY','PRINTED') limit 1`,
        [task.shipment_id],
      )
    : null;
  const evidence = await ctx.db.query<{ evidence_type: string }>(
    `select distinct evidence_type from public.order_evidence where task_id = $1 and review_status <> 'REJECTED'`,
    [task.id],
  );
  const steps = taskStepProgress(task.instructions ?? [], task.checks_state);
  return {
    id: task.id,
    type: task.type,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.due_at?.toISOString() ?? null,
    order: order ? { id: order.id, orderNumber: order.order_number, shipByAt: order.ship_by_at?.toISOString() ?? null, status: order.status } : null,
    items: items.map((i) => ({ orderItemId: i.id, sku: i.sku, name: i.name, quantity: i.quantity, binLocation: i.bin_location, imageUrl: i.image_url })),
    label: label ? { carrier: label.carrier, trackingLast4: maskTracking(label.tracking_number), ready: label.status !== "PENDING" } : null,
    steps,
    currentStep: steps.find((s) => !s.done)?.key ?? null,
    requiredEvidence: task.required_evidence,
    submittedEvidence: evidence.map((e) => e.evidence_type),
  };
}

export interface EmployeeToday {
  greetingName: string | null;
  counts: { toPack: number; inProgress: number; awaitingSignoff: number; completedToday: number; otherTasks: number };
  headline: string;
  nextTask: { id: string; title: string; type: string; priority: string; dueAt: string | null; orderNumber: string | null; inProgress: boolean } | null;
  poolAvailable: number;
}

/** "TODAY'S WORK — 12 Orders to Pack — [ START NEXT ORDER ]" */
export async function getEmployeeToday(ctx: ServiceContext): Promise<EmployeeToday> {
  const user = requireUser(ctx);
  const me = user.actor.userId;
  const allowPool = (await getSetting(ctx, "tasks.allow_self_claim")) === true;
  const profile = await ctx.db.maybeOne<{ name: string | null }>(`select coalesce(display_name, full_name) as name from public.profiles where id = $1`, [me]);
  const counts = await ctx.db.one<{ to_pack: number; in_progress: number; awaiting: number; completed_today: number; other: number }>(
    `select
       count(*) filter (where type = 'PACK_ORDER' and status in ('OPEN','IN_PROGRESS'))::int as to_pack,
       count(*) filter (where status = 'IN_PROGRESS')::int as in_progress,
       count(*) filter (where status = 'AWAITING_VERIFICATION')::int as awaiting,
       count(*) filter (where status = 'COMPLETED' and completed_at >= date_trunc('day', now() at time zone (select timezone from public.organizations where id = $1)) at time zone (select timezone from public.organizations where id = $1))::int as completed_today,
       count(*) filter (where type <> 'PACK_ORDER' and status in ('OPEN','IN_PROGRESS'))::int as other
     from public.tasks where organization_id = $1 and assigned_to = $2`,
    [ctx.organizationId, me],
  );
  // Pool size via SECURITY DEFINER-free count: employees can't read unassigned tasks, so ask a narrow question.
  const pool = allowPool
    ? await ctx.db.one<{ n: number }>(`select app.claimable_task_count($1) as n`, [ctx.organizationId])
    : { n: 0 };
  const next = await pickNextTask(ctx);
  const toPack = counts.to_pack;
  return {
    greetingName: profile?.name ?? null,
    counts: { toPack, inProgress: counts.in_progress, awaitingSignoff: counts.awaiting, completedToday: counts.completed_today, otherTasks: counts.other },
    headline: toPack === 0 && pool.n === 0 ? "All caught up" : `${toPack} ${toPack === 1 ? "Order" : "Orders"} to Pack`,
    nextTask: next,
    poolAvailable: pool.n,
  };
}

async function pickNextTask(ctx: ServiceContext): Promise<EmployeeToday["nextTask"]> {
  const user = requireUser(ctx);
  const mine = await ctx.db.query<TaskRow & { order_number: string | null }>(
    `select t.*, o.order_number from public.tasks t left join public.orders o on o.id = t.order_id
      where t.organization_id = $1 and t.assigned_to = $2 and t.status in ('OPEN','IN_PROGRESS')`,
    [ctx.organizationId, user.actor.userId],
  );
  const visible = mine.filter((t) => TASK_CATALOG[t.type]?.employeeVisible !== false || ctx.permissions.has("tasks.read_all"));
  const ranked = rankTasksForEmployee(visible.map((t) => ({ ...toTaskLike(t), row: t })), user.actor.userId, { includePool: false });
  const top = ranked[0]?.row;
  if (!top) return null;
  return { id: top.id, title: top.title, type: top.type, priority: top.priority, dueAt: top.due_at?.toISOString() ?? null, orderNumber: top.order_number, inProgress: top.status === "IN_PROGRESS" };
}

/**
 * [ START NEXT ORDER ]: the backend decides. Resumes an in-progress task,
 * else starts the highest-priority assigned task, else claims from the pool.
 */
export async function startNextTask(ctx: ServiceContext): Promise<EmployeeTaskDetail | null> {
  requireUser(ctx);
  requirePermission(ctx, "tasks.work");
  let next = await pickNextTask(ctx);
  if (!next && (await getSetting(ctx, "tasks.allow_self_claim")) === true) {
    const claimed = await ctx.db.maybeOne<{ id: string | null }>(`select app.claim_next_task($1) as id`, [ctx.organizationId]);
    if (claimed?.id) next = await pickNextTask(ctx);
  }
  if (!next) return null;
  if (!next.inProgress) await startTask(ctx, next.id);
  return getTaskDetail(ctx, next.id);
}

export async function getTaskForManager(ctx: ServiceContext, taskId: string): Promise<TaskRow> {
  requirePermission(ctx, "tasks.read_all");
  const t = await loadTask(ctx, taskId);
  if (!t) throw notFound("Task");
  return t;
}
