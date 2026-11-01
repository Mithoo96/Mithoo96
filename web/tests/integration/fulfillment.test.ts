import { afterAll, beforeEach, expect, it } from "vitest";
import { runAsMember, runAsSystem } from "@/server/context";
import { lookupPackages, transitionOrder, getOrderDetails } from "@/server/services/orders";
import { getTaskDetail, startTask, completeTask, assignTask } from "@/server/services/tasks";
import { confirmItems, retrieveLabel, verifyLabel, confirmPackage } from "@/server/services/packing";
import { runShipmentVerification } from "@/server/services/shipping";
import { getExceptions } from "@/server/services/exceptions";
import { createEvidenceUpload, submitUploadedEvidence } from "@/server/services/evidence";
import { closeDatabase, describeDb, freshDatabase, ids, tracking } from "../helpers/db";
const employee = <T>(fn: Parameters<typeof runAsMember<T>>[2]) => runAsMember(ids.emp1, ids.org, fn);
const system = <T>(fn: Parameters<typeof runAsSystem<T>>[2]) => runAsSystem(ids.org, "test:fulfillment", fn);
async function prepareScan() {
  await system((ctx) => ctx.db.query(`update public.tasks set status = 'OPEN', started_at = null where assigned_to = $1 and status = 'IN_PROGRESS'`, [ids.emp1]));
  await employee((ctx) => startTask(ctx, ids.task(7)));
  await employee(async (ctx) => { const d = await getTaskDetail(ctx, ids.task(7)); await confirmItems(ctx, { taskId: d.id, items: d.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })) }); });
  await employee((ctx) => retrieveLabel(ctx, ids.task(7)));
}
describeDb("orders and fulfillment checkpoint", () => {
  beforeEach(freshDatabase); afterAll(closeDatabase);
  it("owner sees orders and another tenant is not found", async () => {
    expect((await runAsMember(ids.owner, ids.org, (ctx) => getOrderDetails(ctx, ids.order(7)))).order.orderNumber).toBe("ZB-1007");
    await expect(runAsMember(ids.owner, ids.org, (ctx) => getOrderDetails(ctx, ids.order(99)))).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("unique last-four/full tracking/order/barcode lookup stays assigned-order scoped", async () => {
    for (const value of ["0007", tracking(7), "ZB-1007"]) {
      expect(await employee((ctx) => lookupPackages(ctx, { value }))).toMatchObject({ kind: "UNIQUE", match: { orderId: ids.order(7) } });
    }
    await system((ctx) => ctx.db.query(`update public.shipping_labels set barcode_value = 'https://labels.example/QR/pack-7' where shipment_id = $1`, [ids.shipment(7)]));
    expect(await employee((ctx) => lookupPackages(ctx, { value: "https://labels.example/QR/pack-7" }))).toMatchObject({ kind: "UNIQUE" });
    expect(await employee((ctx) => lookupPackages(ctx, { value: tracking(9) }))).toMatchObject({ kind: "NONE" });
    expect(await employee((ctx) => lookupPackages(ctx, { value: "NW-0001" }))).toMatchObject({ kind: "NONE" });
  });
  it("last-four collision never chooses an order; full tracking disambiguates", async () => {
    await system((ctx) => ctx.db.query(`update public.shipments set tracking_number = $2 where id = $1`, [ids.shipment(8), `9400111111111111110007`]));
    expect(await employee((ctx) => lookupPackages(ctx, { value: "0007" }))).toMatchObject({ kind: "AMBIGUOUS" });
    expect(await employee((ctx) => lookupPackages(ctx, { value: tracking(7) }))).toMatchObject({ kind: "UNIQUE" });
  });
  it("duplicate full tracking is also ambiguous", async () => {
    expect(await runAsMember(ids.owner, ids.org, (ctx) => lookupPackages(ctx, { value: tracking(21) }))).toMatchObject({ kind: "AMBIGUOUS" });
  });
  it("cannot start a second task; concurrent starts serialize", async () => {
    await expect(employee((ctx) => startTask(ctx, ids.task(7)))).rejects.toMatchObject({ code: "CONFLICT" });
    await system((ctx) => ctx.db.query(`update public.tasks set status='OPEN', started_at=null where assigned_to=$1`, [ids.emp1]));
    const outcomes = await Promise.allSettled([employee((ctx) => startTask(ctx, ids.task(7))), employee((ctx) => startTask(ctx, ids.task(8)))]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    const active = await system((ctx) => ctx.db.one<{ n: number }>(`select count(*)::int n from public.tasks where assigned_to=$1 and status='IN_PROGRESS'`, [ids.emp1]));
    expect(active.n).toBe(1);
  });
  it("does not permit another employee's task or omitted verification steps", async () => {
    await expect(employee((ctx) => startTask(ctx, ids.task(9)))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(employee((ctx) => getTaskDetail(ctx, ids.task(9)))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await prepareScan();
    await expect(employee((ctx) => confirmPackage(ctx, ids.task(7)))).rejects.toMatchObject({ code: "GUARD_FAILED" });
    expect((await employee((ctx) => completeTask(ctx, ids.task(7)))).completed).toBe(false);
  });
  it("wrong label scan creates one deduplicated exception and audit failure entries", async () => {
    await prepareScan();
    for (let n = 0; n < 2; n++) expect((await employee((ctx) => verifyLabel(ctx, { taskId: ids.task(7), scannedValue: tracking(8) }))).passed).toBe(false);
    const exceptions = await runAsMember(ids.owner, ids.org, (ctx) => getExceptions(ctx, { orderId: ids.order(7), type: ["TRACKING_MISMATCH"] }));
    expect(exceptions).toHaveLength(1); expect(exceptions[0].occurrences).toBe(1); // Repeated employee scans reuse the protected exception; attempts are audited separately.
    const logs = await system((ctx) => ctx.db.query<{ action: string }>(`select action from public.activity_logs where order_id=$1`, [ids.order(7)]));
    expect(logs.map((l) => l.action)).toContain("label.scan_failed");
    const changed = await employee((ctx) => ctx.db.query(`update public.exceptions set severity='LOW' where id=$1 returning id`, [exceptions[0].id]));
    expect(changed).toHaveLength(0); // Reuse never grants employee exception update access.
    await expect(employee((ctx) => confirmPackage(ctx, ids.task(7)))).rejects.toMatchObject({ code: "GUARD_FAILED" });
  });
  it("missing tracking, tracking mismatch and duplicate tracking fail integrity checks", async () => {
    for (const [n, code] of [[13, "TRACKING_PRESENT"], [16, "TRACKING_MATCHES_SHIPMENT"], [17, "TRACKING_UNIQUE"]] as const) {
      const outcome = await system((ctx) => runShipmentVerification(ctx, { shipmentId: ids.shipment(n), raiseExceptions: true }));
      expect(outcome.identityVerified).toBe(false); expect(outcome.checks.find((c) => c.code === code)?.result).toBe("FAIL");
    }
  });
  it("an employee cannot claim SHIPPED; even owner needs carrier proof or approved override", async () => {
    await expect(employee((ctx) => transitionOrder(ctx, { orderId: ids.order(18), to: "SHIPPED" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(runAsMember(ids.owner, ids.org, (ctx) => transitionOrder(ctx, { orderId: ids.order(18), to: "SHIPPED" }))).rejects.toMatchObject({ code: "GUARD_FAILED" });
  });
  it("assignment is audited; employees cannot assign and foreign assignees are rejected", async () => {
    await runAsMember(ids.owner, ids.org, (ctx) => assignTask(ctx, ids.task(7), ids.emp2));
    const logs = await system((ctx) => ctx.db.query<{ action: string }>(`select action from public.activity_logs where resource_id=$1`, [ids.task(7)]));
    expect(logs.map((l) => l.action)).toContain("task.reassigned");
    await expect(employee((ctx) => assignTask(ctx, ids.task(7), ids.emp1))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(runAsMember(ids.owner, ids.org, (ctx) => assignTask(ctx, ids.task(8), ids.otherEmp))).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
  it("cannot obtain an upload grant for somebody else's task", async () => {
    const gateway = { createSignedUploadUrl: async () => { throw new Error("Must never mint a grant"); }, createSignedDownloadUrl: async () => "" };
    await expect(employee((ctx) => createEvidenceUpload(ctx, { taskId: ids.task(9), fileName: "photo.jpg", contentType: "image/jpeg" }, gateway))).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("does not register fictional evidence pointers at the public action boundary", async () => {
    await prepareScan();
    const input = { taskId: ids.task(7), evidenceType: "PACKAGING_PHOTO" as const, storagePath: `${ids.org}/tasks/${ids.task(7)}/physical-photo.jpg` };
    await expect(employee((ctx) => submitUploadedEvidence(ctx, input, async () => false))).rejects.toMatchObject({ code: "GUARD_FAILED" });
    expect(await employee((ctx) => submitUploadedEvidence(ctx, input, async () => true))).toHaveProperty("evidenceId");
  });

});
