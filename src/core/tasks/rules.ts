/**
 * Task Engine rules (pure): start/complete preconditions and next-task selection.
 */
import { LIVE_TASK_STATUSES, PRIORITY_RANK, type TaskCheck, type TaskPriority, type TaskStatus } from "./catalog";

export interface CheckState {
  readonly passed: boolean;
  readonly at: string;
  readonly by: string;
  readonly value?: string | null;
  readonly details?: Record<string, unknown>;
}
export type ChecksState = Partial<Record<TaskCheck, CheckState>>;

export interface TaskLike {
  readonly id: string;
  readonly status: TaskStatus;
  readonly assignedTo: string | null;
  readonly priority: TaskPriority;
  readonly dueAt: Date | null;
  readonly createdAt: Date;
  readonly requiredChecks: readonly TaskCheck[];
  readonly requiredEvidence: readonly string[];
  readonly checksState: ChecksState;
}

export type Decision = { readonly ok: true } | { readonly ok: false; readonly reason: string; readonly missing?: readonly string[] };

export function canStartTask(task: TaskLike, userId: string): Decision {
  if (task.assignedTo !== userId) return { ok: false, reason: "This task is not assigned to you" };
  if (task.status === "IN_PROGRESS") return { ok: true };
  if (task.status !== "OPEN") return { ok: false, reason: `Task is ${task.status}` };
  return { ok: true };
}

/**
 * A task can only be completed when every required check has PASSED and every
 * required evidence type has been submitted. Nothing is assumed.
 */
export function evaluateTaskCompletion(
  task: TaskLike,
  input: { userId: string; submittedEvidenceTypes: readonly string[] },
): Decision {
  if (task.assignedTo !== input.userId) return { ok: false, reason: "This task is not assigned to you" };
  if (task.status !== "IN_PROGRESS") return { ok: false, reason: `Task must be IN_PROGRESS to complete (is ${task.status})` };
  const missingChecks = task.requiredChecks.filter((c) => task.checksState[c]?.passed !== true);
  const missingEvidence = task.requiredEvidence.filter((e) => !input.submittedEvidenceTypes.includes(e));
  const missing = [...missingChecks.map((c) => `check:${c}`), ...missingEvidence.map((e) => `evidence:${e}`)];
  if (missing.length > 0) {
    return { ok: false, reason: "Required validation is missing", missing };
  }
  return { ok: true };
}

/**
 * Order the employee's work: tasks already in progress first, then their
 * assigned tasks by priority and due time, then (optionally) unassigned pool
 * tasks they may claim. Deterministic for equal keys.
 */
export function rankTasksForEmployee<T extends TaskLike>(tasks: readonly T[], userId: string, opts: { includePool: boolean }): T[] {
  const eligible = tasks.filter(
    (t) =>
      LIVE_TASK_STATUSES.includes(t.status) &&
      t.status !== "AWAITING_VERIFICATION" &&
      t.status !== "BLOCKED" &&
      (t.assignedTo === userId || (opts.includePool && t.assignedTo === null && t.status === "OPEN")),
  );
  const bucket = (t: T): number => (t.status === "IN_PROGRESS" && t.assignedTo === userId ? 0 : t.assignedTo === userId ? 1 : 2);
  const due = (t: T): number => t.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...eligible].sort(
    (a, b) =>
      bucket(a) - bucket(b) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      due(a) - due(b) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );
}

/** Escalate task priority as its order's deadline approaches. */
export function priorityForDeadline(minutesRemaining: number | null, base: TaskPriority): TaskPriority {
  if (minutesRemaining === null) return base;
  const escalated: TaskPriority = minutesRemaining <= 120 ? "URGENT" : minutesRemaining <= 480 ? "HIGH" : base;
  return PRIORITY_RANK[escalated] < PRIORITY_RANK[base] ? escalated : base;
}
