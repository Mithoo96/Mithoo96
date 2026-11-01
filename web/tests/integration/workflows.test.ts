import { afterAll, beforeAll, expect, it } from "vitest";
import { runAsMember, runAsSystem } from "@/server/context";
import { approveAction, rejectAction, requestApproval } from "@/server/services/approvals";
import { getDashboardSummary } from "@/server/services/dashboard";
import { submitEvidence } from "@/server/services/evidence";
import { getExceptions } from "@/server/services/exceptions";
import { getOrderDetails, getOrdersAtRisk } from "@/server/services/orders";
import { confirmItems, confirmPackage, retrieveLabel, verifyLabel } from "@/server/services/packing";
import { prepareShipment, recordTrackingEvents, runShipmentVerification } from "@/server/services/shipping";
import { completeTask, getEmployeeToday, getTaskDetail, startNextTask, startTask } from "@/server/services/tasks";
import { runRiskScan } from "@/server/services/risk-monitor";
import { closeDatabase, describeDb, freshDatabase, ids, tracking } from "../helpers/db";

const asEmp1 = <T>(fn: Parameters<typeof runAsMember<T>>[2]) => runAsMember(ids.emp1, ids.org, fn);
const orderStatus = (n: number) =>
  runAsSystem(ids.org, "test", async (ctx) => (await ctx.db.one<{ status: string; exception_state: string | null }>(`select status, exception_state from public.orders where id = $1`, [ids.order(n)])));

async function countAllItems(taskId: string) {
  const detail = await asEmp1((ctx) => getTaskDetail(ctx, taskId));
  return detail.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity }));
}

describeDb("operations workflows", () => {
  beforeAll(async () => {
    await freshDatabase();
    // The legacy seed intentionally contains two IN_PROGRESS examples for this employee.
    // These ordered workflow tests start at task 7; adjust only this disposable fixture.
    await runAsSystem(ids.org, "test:queue-fixture", (ctx) => ctx.db.query(`update public.tasks set status = 'OPEN', started_at = null where assigned_to = $1 and status = 'IN_PROGRESS'`, [ids.emp1]));
  });
  afterAll(closeDatabase);

  it("employee packs an order end to end; completion requires evidence; carrier scan ships it", async () => {
    const taskId = ids.task(7);
    await asEmp1((ctx) => startTask(ctx, taskId));
    expect((await orderStatus(7)).status).toBe("PACKING");

    const wrong = await asEmp1((ctx) => confirmItems(ctx, { taskId, items: [{ orderItemId: "e1000000-0000-4000-8000-000000000070", quantity: 99 }] }));
    expect(wrong.passed).toBe(false);
    const items = await countAllItems(taskId);
    expect((await asEmp1((ctx) => confirmItems(ctx, { taskId, items }))).passed).toBe(true);

    await expect(asEmp1((ctx) => confirmPackage(ctx, taskId))).rejects.toMatchObject({ code: "GUARD_FAILED" });
    const label = await asEmp1((ctx) => retrieveLabel(ctx, taskId));
    expect(label.trackingLast4).toBe("…0007");
    expect((await orderStatus(7)).status).toBe("LABEL_READY");

    const scan = await asEmp1((ctx) => verifyLabel(ctx, { taskId, scannedValue: tracking(7) }));
    expect(scan.passed).toBe(true);
    expect((await orderStatus(7)).status).toBe("PACKED");
    await asEmp1((ctx) => confirmPackage(ctx, taskId));

    const blocked = await asEmp1((ctx) => completeTask(ctx, taskId));
    expect(blocked.completed).toBe(false);
    expect(blocked.missing).toContain("evidence:PACKAGING_PHOTO");

    await asEmp1((ctx) => submitEvidence(ctx, { evidenceType: "PACKAGING_PHOTO", storagePath: `${ids.org}/tasks/${taskId}/photo.jpg`, taskId }));
    await expect(
      asEmp1((ctx) => submitEvidence(ctx, { evidenceType: "PACKAGING_PHOTO", storagePath: `${ids.orgB}/tasks/x/photo.jpg`, taskId })),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    const done = await asEmp1((ctx) => completeTask(ctx, taskId));
    expect(done).toMatchObject({ completed: true, status: "COMPLETED" });
    expect((await orderStatus(7)).status).toBe("READY_TO_SHIP");

    const evidence = await runAsMember(ids.manager, ids.org, (ctx) => getOrderDetails(ctx, ids.order(7)));
    expect(evidence.evidence[0]!.reviewStatus).toBe("PENDING_REVIEW"); // never auto-verified
    expect(evidence.shipments[0]!.verificationStatus).toBe("AWAITING_CARRIER");

    // A MANUAL note never ships the order; carrier data does.
    await runAsMember(ids.manager, ids.org, (ctx) => recordTrackingEvents(ctx, ids.shipment(7), [{ normalizedStatus: "ACCEPTED", occurredAt: new Date(), source: "MANUAL" }]));
    expect((await orderStatus(7)).status).toBe("READY_TO_SHIP");
    await runAsSystem(ids.org, "integration:test", (ctx) =>
      recordTrackingEvents(ctx, ids.shipment(7), [{ normalizedStatus: "ACCEPTED", occurredAt: new Date(), source: "MOCK", externalEventId: "evt-1" }]),
    );
    expect((await orderStatus(7)).status).toBe("SHIPPED");
  });

  it("a mismatched label scan stops the package, raises a critical exception and blocks completion", async () => {
    const taskId = ids.task(8);
    await asEmp1((ctx) => startTask(ctx, taskId));
    await asEmp1(async (ctx) => confirmItems(ctx, { taskId, items: await countAllItemsIn(ctx, taskId) }));
    await asEmp1((ctx) => retrieveLabel(ctx, taskId));
    const scan = await asEmp1((ctx) => verifyLabel(ctx, { taskId, scannedValue: tracking(12) }));
    expect(scan.passed).toBe(false);
    expect(scan.instruction).toMatch(/STOP/);
    const ex = await runAsMember(ids.manager, ids.org, (ctx) => getExceptions(ctx, { orderId: ids.order(8) }));
    expect(ex.find((e) => e.type === "TRACKING_MISMATCH")?.severity).toBe("CRITICAL");
    expect((await orderStatus(8)).exception_state).toBe("TRACKING_ISSUE");
    await expect(asEmp1((ctx) => confirmPackage(ctx, taskId))).rejects.toMatchObject({ code: "GUARD_FAILED" });
    expect((await asEmp1((ctx) => completeTask(ctx, taskId))).completed).toBe(false);
  });

  it("detects duplicate tracking across orders", async () => {
    const outcome = await runAsSystem(ids.org, "test", (ctx) => runShipmentVerification(ctx, { shipmentId: ids.shipment(17) }));
    expect(outcome.status).toBe("MISMATCH");
    expect(outcome.checks.find((c) => c.code === "TRACKING_UNIQUE")?.result).toBe("FAIL");
  });

  it("approvals: no self-approval, owner-only refund decisions, approved label reprint executes", async () => {
    const { approvalId } = await asEmp1((ctx) =>
      requestApproval(ctx, { actionType: "LABEL_REPRINT", resourceId: ids.shipment(8), reason: "Label does not match order", payload: { trackingNumber: tracking(88) } }),
    );
    await expect(asEmp1((ctx) => approveAction(ctx, { approvalId }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    const result = await runAsMember(ids.manager, ids.org, (ctx) => approveAction(ctx, { approvalId, comment: "Reprint" }));
    expect(result.executed).toBe(true);
    expect((await orderStatus(8)).status).toBe("PACKING");
    const detail = await asEmp1((ctx) => getTaskDetail(ctx, ids.task(8)));
    expect(detail.steps.find((s) => s.check === "LABEL_SCANNED")?.done).toBe(false);

    await expect(runAsMember(ids.manager, ids.org, (ctx) => approveAction(ctx, { approvalId: ids.approval(1) }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    const refund = await runAsMember(ids.owner, ids.org, (ctx) => approveAction(ctx, { approvalId: ids.approval(1) }));
    expect(refund.executed).toBe(false); // no refund integration: never pretends
    await expect(runAsMember(ids.owner, ids.org, (ctx) => rejectAction(ctx, { approvalId: ids.approval(1) }))).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Database backstop against self-approval.
    await expect(
      runAsSystem(ids.org, "test", (ctx) =>
        ctx.db.query(`update public.approvals set status='APPROVED', approved_at=now(), decided_by=requested_by where id=$1`, [ids.approval(2)]),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("risk scan is idempotent, escalates as deadlines approach and auto-resolves cleared conditions", async () => {
    const first = await runAsSystem(ids.org, "system:risk-monitor", (ctx) => runRiskScan(ctx));
    const second = await runAsSystem(ids.org, "system:risk-monitor", (ctx) => runRiskScan(ctx));
    expect(second.raised).toBe(0);
    expect(first.ordersScanned).toBeGreaterThan(10);

    const later = new Date(Date.now() + 2.5 * 3600_000);
    const escalated = await runAsSystem(ids.org, "system:risk-monitor", (ctx) => runRiskScan(ctx), { now: () => later });
    expect(escalated.escalated).toBeGreaterThan(0);
    const deadline = await runAsMember(ids.manager, ids.org, (ctx) => getExceptions(ctx, { orderId: ids.order(9), type: ["SHIPMENT_DEADLINE_APPROACHING"] }));
    expect(deadline[0]!.severity).toBe("CRITICAL");

    const refund = await runAsMember(ids.owner, ids.org, (ctx) => getExceptions(ctx, { orderId: ids.order(25) }));
    expect(refund.map((e) => e.type)).toContain("REFUND_RISK");
  });

  it("prepares shipping: label → READY_TO_PACK → pack task in the pool", async () => {
    const r = await runAsMember(ids.manager, ids.org, (ctx) =>
      prepareShipment(ctx, { orderId: ids.order(5), carrier: "USPS", expectedCarrier: "USPS", trackingNumber: tracking(55), label: { source: "MANUAL" } }),
    );
    expect(r.taskId).toBeTruthy();
    expect((await orderStatus(5)).status).toBe("READY_TO_PACK");
  });

  it("employee mode: today's work and START NEXT ORDER", async () => {
    const today = await runAsMember(ids.emp2, ids.org, (ctx) => getEmployeeToday(ctx));
    expect(today.counts.toPack).toBeGreaterThan(0);
    expect(today.headline).toMatch(/Orders? to Pack/);
    const next = await runAsMember(ids.emp2, ids.org, (ctx) => startNextTask(ctx));
    expect(next?.status).toBe("IN_PROGRESS");
    expect(next?.order?.orderNumber).toBe("ZB-1015"); // in-progress task resumes first
  });

  it("dashboard contract has real numbers and no invented revenue", async () => {
    const d = await runAsMember(ids.owner, ids.org, (ctx) => getDashboardSummary(ctx));
    expect(d.orders.needAttention).toBeGreaterThan(0);
    expect(d.approvals.pending).toBeGreaterThan(0);
    expect(d.revenueAtRisk?.[0]?.currency).toBe("USD");
    const m = await runAsMember(ids.manager, ids.org, (ctx) => getDashboardSummary(ctx));
    expect(m.revenueAtRisk).toBeNull(); // managers lack revenue.read
    const risk = await runAsMember(ids.manager, ids.org, (ctx) => getOrdersAtRisk(ctx));
    expect(risk.length).toBeGreaterThan(0);
    expect(risk.every((o) => o.totalAmount === null)).toBe(true);
  });
});

async function countAllItemsIn(ctx: Parameters<typeof getTaskDetail>[0], taskId: string) {
  const d = await getTaskDetail(ctx, taskId);
  return d.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity }));
}
