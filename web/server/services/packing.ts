/**
 * PACK_ORDER workflow — the Zile Boutik shipping pilot.
 *
 *   startTask        READY_TO_PACK → PACKING
 *   confirmItems     check ITEMS_CONFIRMED (exact quantities)
 *   retrieveLabel    check LABEL_RETRIEVED; PACKING → LABEL_READY
 *   verifyLabel      scan; LABEL_READY → PACKED; check LABEL_SCANNED (pass/fail)
 *   confirmPackage   check PACKAGE_CONFIRMED (requires a passing scan)
 *   completePackTask PACKED → AWAITING_VERIFICATION → READY_TO_SHIP (or manager sign-off)
 *
 * The employee never needs platform knowledge: each step returns plain
 * instructions and the system validates every claim it can.
 */
import { z } from "zod";
import { DomainError } from "@/core/errors";
import type { VerificationCheck } from "@/core/shipping/verification";
import { maskTracking } from "@/core/shipping/verification";
import { evaluateTaskCompletion } from "@/core/tasks/rules";
import { requirePermission, requireUser, type ServiceContext } from "../context";
import { logActivity, recordEmployeeAction } from "./activity";
import { notify } from "./notifications";
import { transitionOrder } from "./orders";
import { runShipmentVerification } from "./shipping";
import { loadTask, recordCheck, toTaskLike, type TaskRow } from "./tasks-core";

async function loadWorkingTask(ctx: ServiceContext, taskId: string): Promise<TaskRow & { order_id: string; shipment_id: string }> {
  const user = requireUser(ctx);
  requirePermission(ctx, "tasks.work");
  const task = await loadTask(ctx, z.string().uuid().parse(taskId), { forUpdate: true });
  if (task.assigned_to !== user.actor.userId) throw new DomainError("FORBIDDEN", "This task is not assigned to you");
  if (task.status !== "IN_PROGRESS") throw new DomainError("CONFLICT", `Start the task first (status is ${task.status})`);
  if (!task.order_id || !task.shipment_id) throw new DomainError("VALIDATION_FAILED", "Task is not linked to an order shipment");
  return task as TaskRow & { order_id: string; shipment_id: string };
}

async function orderStatus(ctx: ServiceContext, orderId: string): Promise<string> {
  return (await ctx.db.one<{ status: string }>(`select status from public.orders where id = $1`, [orderId])).status;
}

/** Called by startTask for PACK_ORDER / REPRINT_LABEL tasks. */
export async function onPackTaskStarted(ctx: ServiceContext, task: TaskRow): Promise<void> {
  if (task.type === "PACK_ORDER" && task.order_id && (await orderStatus(ctx, task.order_id)) === "READY_TO_PACK") {
    await transitionOrder(ctx, { orderId: task.order_id, to: "PACKING", reason: "Employee started packing" });
  }
}

export const confirmItemsSchema = z
  .object({
    taskId: z.string().uuid(),
    items: z.array(z.object({ orderItemId: z.string().uuid(), quantity: z.number().int().min(0).max(10_000) }).strict()).min(1),
  })
  .strict();

export async function confirmItems(ctx: ServiceContext, raw: z.input<typeof confirmItemsSchema>): Promise<{ passed: boolean; problems: string[] }> {
  const input = confirmItemsSchema.parse(raw);
  const task = await loadWorkingTask(ctx, input.taskId);
  const items = await ctx.db.query<{ id: string; sku: string; name: string; quantity: number }>(
    `select id, sku, name, quantity from public.order_items where order_id = $1`,
    [task.order_id],
  );
  const counted = new Map(input.items.map((i) => [i.orderItemId, i.quantity]));
  const problems: string[] = [];
  for (const item of items) {
    const got = counted.get(item.id);
    if (got === undefined) problems.push(`${item.name} (${item.sku}) was not counted`);
    else if (got !== item.quantity) problems.push(`${item.name} (${item.sku}): expected ${item.quantity}, counted ${got}`);
  }
  for (const id of counted.keys()) if (!items.some((i) => i.id === id)) problems.push("An item that is not part of this order was counted");
  const passed = problems.length === 0;
  await recordCheck(ctx, task, "ITEMS_CONFIRMED", { passed, details: { problems } });
  await recordEmployeeAction(ctx, { actionType: "ITEMS_CONFIRMED", result: passed ? "OK" : "MISMATCH", taskId: task.id, orderId: task.order_id, payload: { items: input.items, problems } });
  return { passed, problems };
}

export interface LabelForEmployee {
  labelId: string;
  carrier: string | null;
  trackingLast4: string | null;
  format: string | null;
  storagePath: string | null;
  source: string;
}

export async function retrieveLabel(ctx: ServiceContext, taskId: string): Promise<LabelForEmployee> {
  const user = requireUser(ctx);
  const task = await loadWorkingTask(ctx, taskId);
  const label = await ctx.db.maybeOne<{ id: string; carrier: string | null; tracking_number: string | null; label_format: string | null; storage_path: string | null; source: string; status: string }>(
    `select id, carrier, tracking_number, label_format, storage_path, source, status from public.shipping_labels
      where shipment_id = $1 and status in ('PENDING','READY','PRINTED') limit 1`,
    [task.shipment_id],
  );
  if (!label || label.status === "PENDING") {
    await recordEmployeeAction(ctx, { actionType: "LABEL_RETRIEVED", result: "ERROR", taskId: task.id, orderId: task.order_id, shipmentId: task.shipment_id, payload: { reason: "NO_LABEL" } });
    throw new DomainError("GUARD_FAILED", "No shipping label is ready for this order yet. A manager has been notified.");
  }
  await ctx.db.query(
    `update public.shipping_labels
        set status = 'PRINTED', retrieved_at = coalesce(retrieved_at, now()), retrieved_by = coalesce(retrieved_by, $2),
            printed_at = now(), printed_by = $2
      where id = $1`,
    [label.id, user.actor.userId],
  );
  await recordCheck(ctx, task, "LABEL_RETRIEVED", { passed: true, value: label.id });
  await recordEmployeeAction(ctx, { actionType: "LABEL_PRINTED", taskId: task.id, orderId: task.order_id, shipmentId: task.shipment_id, payload: { labelId: label.id } });
  await logActivity(ctx, { action: "label.printed", resourceType: "shipping_label", resourceId: label.id, orderId: task.order_id, summary: "Employee retrieved/printed the shipping label" });
  if ((await orderStatus(ctx, task.order_id)) === "PACKING") {
    await transitionOrder(ctx, { orderId: task.order_id, to: "LABEL_READY", reason: "Label retrieved for packing" });
  }
  return {
    labelId: label.id,
    carrier: label.carrier,
    trackingLast4: maskTracking(label.tracking_number),
    format: label.label_format,
    storagePath: label.storage_path,
    source: label.source,
  };
}

export const verifyLabelSchema = z
  .object({ taskId: z.string().uuid(), scannedValue: z.string().trim().min(1).max(200), deviceInfo: z.record(z.string(), z.unknown()).optional() })
  .strict();

export interface ScanResult {
  passed: boolean;
  instruction: string;
  checks: Pick<VerificationCheck, "code" | "result" | "message">[];
}

export async function verifyLabel(ctx: ServiceContext, raw: z.input<typeof verifyLabelSchema>): Promise<ScanResult> {
  const input = verifyLabelSchema.parse(raw);
  const task = await loadWorkingTask(ctx, input.taskId);
  if (task.checks_state?.LABEL_RETRIEVED?.passed !== true) throw new DomainError("GUARD_FAILED", "Retrieve the label before scanning it");
  if (task.type === "PACK_ORDER" && task.checks_state?.ITEMS_CONFIRMED?.passed !== true) {
    throw new DomainError("GUARD_FAILED", "Confirm the items and quantities before scanning the label");
  }
  if ((await orderStatus(ctx, task.order_id)) === "LABEL_READY") {
    await transitionOrder(ctx, { orderId: task.order_id, to: "PACKED", reason: "Package packed with label attached" });
  }

  const outcome = await runShipmentVerification(ctx, {
    shipmentId: task.shipment_id,
    scannedValue: input.scannedValue,
    packageConfirmed: false,
    taskId: task.id,
    raiseExceptions: true,
  });
  const scan = outcome.checks.find((c) => c.code === "SCAN_MATCHES_LABEL");
  const passed = scan?.result === "PASS" && outcome.identityVerified;
  await recordCheck(ctx, task, "LABEL_SCANNED", {
    passed,
    value: input.scannedValue,
    details: { failed: outcome.checks.filter((c) => c.result === "FAIL").map((c) => c.code) },
  });
  await recordEmployeeAction(ctx, {
    actionType: "LABEL_SCANNED",
    result: passed ? "OK" : "MISMATCH",
    taskId: task.id,
    orderId: task.order_id,
    shipmentId: task.shipment_id,
    payload: { scanned: maskTracking(input.scannedValue.replace(/[^A-Za-z0-9]/g, "").toUpperCase()), status: outcome.status },
    deviceInfo: input.deviceInfo ?? null,
  });
  await logActivity(ctx, {
    action: passed ? "label.scan_passed" : "label.scan_failed",
    resourceType: "shipment",
    resourceId: task.shipment_id,
    orderId: task.order_id,
    summary: passed ? "Label scanned and verified" : `Label scan FAILED: ${outcome.checks.filter((c) => c.result === "FAIL").map((c) => c.message).join("; ")}`,
  });
  return {
    passed,
    instruction: passed
      ? "Label verified. Take the packaging photo and confirm the package."
      : "STOP — do not ship this package. The label does not match this order. A manager has been notified.",
    checks: outcome.checks
      .filter((c) => c.code !== "DEADLINE")
      .map((c) => ({ code: c.code, result: c.result, message: c.message })),
  };
}

export async function confirmPackage(ctx: ServiceContext, taskId: string): Promise<void> {
  const task = await loadWorkingTask(ctx, taskId);
  if (task.checks_state?.LABEL_SCANNED?.passed !== true) {
    throw new DomainError("GUARD_FAILED", "The label must be scanned successfully before confirming the package");
  }
  await recordCheck(ctx, task, "PACKAGE_CONFIRMED", { passed: true });
  await recordEmployeeAction(ctx, { actionType: "PACKAGE_CONFIRMED", taskId: task.id, orderId: task.order_id, shipmentId: task.shipment_id });
}

export interface CompletionResult {
  completed: boolean;
  status: "COMPLETED" | "AWAITING_VERIFICATION" | "BLOCKED_BY_VALIDATION";
  missing: string[];
  message: string;
}

/** PACK_ORDER completion. Never throws for validation failures: returns what is missing. */
export async function completePackTask(ctx: ServiceContext, task: TaskRow & { order_id: string; shipment_id: string }): Promise<CompletionResult> {
  const user = requireUser(ctx);
  const evidence = await ctx.db.query<{ evidence_type: string }>(
    `select distinct evidence_type from public.order_evidence where (task_id = $1 or order_id = $2) and review_status <> 'REJECTED'`,
    [task.id, task.order_id],
  );
  const decision = evaluateTaskCompletion(toTaskLike(task), { userId: user.actor.userId, submittedEvidenceTypes: evidence.map((e) => e.evidence_type) });
  if (!decision.ok) {
    return { completed: false, status: "BLOCKED_BY_VALIDATION", missing: [...(decision.missing ?? [])], message: decision.reason };
  }

  // Full verification (identity + confirmation + evidence) before anything moves.
  const outcome = await runShipmentVerification(ctx, {
    shipmentId: task.shipment_id,
    packageConfirmed: true,
    requiredEvidence: task.required_evidence,
    taskId: task.id,
    raiseExceptions: true,
  });
  if (!outcome.readyForHandover) {
    const failed = outcome.checks.filter((c) => c.result === "FAIL" || (c.result === "UNKNOWN" && c.code !== "CARRIER_ACCEPTANCE"));
    return { completed: false, status: "BLOCKED_BY_VALIDATION", missing: failed.map((c) => `verification:${c.code}`), message: failed.map((c) => c.message).join("; ") };
  }

  if ((await orderStatus(ctx, task.order_id)) === "PACKED") {
    await transitionOrder(ctx, { orderId: task.order_id, to: "AWAITING_VERIFICATION", reason: "Package submitted for verification" });
  }
  await recordEmployeeAction(ctx, { actionType: "TASK_COMPLETED", taskId: task.id, orderId: task.order_id, shipmentId: task.shipment_id });

  if (task.requires_signoff) {
    await ctx.db.query(`update public.tasks set status = 'AWAITING_VERIFICATION', verification_status = 'PENDING' where id = $1`, [task.id]);
    await logActivity(ctx, { action: "task.submitted", resourceType: "task", resourceId: task.id, orderId: task.order_id, summary: `Task "${task.title}" submitted for manager sign-off` });
    await notify(ctx, {
      toRoles: ["MANAGER"],
      category: "APPROVAL_REQUIRED",
      title: "Package ready for sign-off",
      body: task.title,
      resource: { type: "task", id: task.id },
      dedupeKey: `task-signoff:${task.id}`,
    });
    return { completed: false, status: "AWAITING_VERIFICATION", missing: [], message: "Submitted. A manager will verify this package." };
  }

  await ctx.db.query(
    `update public.tasks set status = 'COMPLETED', completed_at = now(), completed_by = $2, verification_status = 'VERIFIED' where id = $1`,
    [task.id, user.actor.userId],
  );
  await transitionOrder(ctx, { orderId: task.order_id, to: "READY_TO_SHIP", reason: "System verification passed after employee packing" }, { systemEffect: true });
  // Re-evaluate now that the order is ready to ship: VERIFIED → AWAITING_CARRIER.
  await runShipmentVerification(ctx, { shipmentId: task.shipment_id, packageConfirmed: true, requiredEvidence: task.required_evidence, taskId: task.id });
  await logActivity(ctx, { action: "task.completed", resourceType: "task", resourceId: task.id, orderId: task.order_id, summary: `Task "${task.title}" completed and verified` });
  return { completed: true, status: "COMPLETED", missing: [], message: "Package verified and ready to ship." };
}
