/**
 * Phase 1 backend readiness checks not already covered elsewhere.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { exceptionDedupeKey } from "@/core/exceptions/catalog";
import { getCommerceProvider } from "@/integrations/registry";
import { runAsMember, runAsSystem } from "@/server/context";
import { withUserTransaction } from "@/server/db/client";
import { submitEvidence } from "@/server/services/evidence";
import { raiseException } from "@/server/services/exceptions";
import { getIntegrationConnections } from "@/server/services/integrations";
import { getEmployees } from "@/server/services/members";
import { confirmItems, confirmPackage, retrieveLabel, verifyLabel } from "@/server/services/packing";
import { updateOrganizationSetting } from "@/server/services/settings";
import { assignTask, completeTask, createTask, getEmployeeTasks, getTaskDetail, startTask } from "@/server/services/tasks";
import { closeDatabase, describeDb, freshDatabase, ids, tracking } from "../helpers/db";

const PLATFORM_ADMIN = "a0000000-0000-4000-8000-000000000001";
const sys = <T>(sql: string, params: unknown[] = []) => runAsSystem(ids.org, "test", (ctx) => ctx.db.query<T & Record<string, unknown>>(sql, params));

describeDb("phase 1 readiness", () => {
  beforeAll(freshDatabase);
  afterAll(closeDatabase);

  it("employee task restrictions", async () => {
    // Another employee's task is invisible (RLS) — cannot start or complete it.
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => startTask(ctx, ids.task(9)))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => completeTask(ctx, ids.task(9)))).rejects.toMatchObject({ code: "NOT_FOUND" });
    // Cannot create or (re)assign work.
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => createTask(ctx, { type: "GENERIC", title: "x" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => assignTask(ctx, ids.task(7), ids.emp1))).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Only sees own tasks.
    const mine = await runAsMember(ids.emp1, ids.org, (ctx) => getEmployeeTasks(ctx));
    expect(mine.every((t) => t.assignedTo === ids.emp1)).toBe(true);
    // Cannot skip steps: scanning before retrieving the label is refused.
    await runAsMember(ids.emp1, ids.org, (ctx) => startTask(ctx, ids.task(7)));
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => verifyLabel(ctx, { taskId: ids.task(7), scannedValue: tracking(7) }))).rejects.toMatchObject({ code: "GUARD_FAILED" });
    // Cannot change task assignment directly in the DB either (column guard).
    await expect(withUserTransaction(ids.emp1, (db) => db.query(`update public.tasks set priority = 'LOW' where id = $1`, [ids.task(7)]))).rejects.toMatchObject({ code: "FORBIDDEN" });
    // No employee-visible PII/prices in the task view.
    const detail = await runAsMember(ids.emp1, ids.org, (ctx) => getTaskDetail(ctx, ids.task(7)));
    expect(JSON.stringify(detail)).not.toMatch(/example\.com|555-|Demo Avenue|unitPrice/);
  });

  it("owner vs manager vs employee permissions", async () => {
    await expect(runAsMember(ids.manager, ids.org, (ctx) => updateOrganizationSetting(ctx, "tasks.allow_self_claim", false))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await runAsMember(ids.owner, ids.org, (ctx) => updateOrganizationSetting(ctx, "tasks.pack_order.requires_signoff", false));
    await expect(
      runAsMember(ids.owner, ids.org, (ctx) => updateOrganizationSetting(ctx, "risk.shipping_deadline_policy", { thresholds: [] })),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    const team = await runAsMember(ids.manager, ids.org, (ctx) => getEmployees(ctx));
    expect(team).toHaveLength(4);
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => getEmployees(ctx))).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Integrations: manager can view status, never secret values or references.
    const conns = await runAsMember(ids.manager, ids.org, (ctx) => getIntegrationConnections(ctx));
    expect(conns[0]).toMatchObject({ provider: "TIKTOK_SHOP_MOCK", isMock: true });
    expect(JSON.stringify(conns)).not.toMatch(/ZILE_TIKTOK_MOCK|credentials/);
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => getIntegrationConnections(ctx))).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Membership changes: managers cannot grant roles.
    await expect(
      withUserTransaction(ids.manager, (db) => db.query(`update public.organization_members set role = 'OWNER' where user_id = $1`, [ids.emp1])),
    ).resolves.toHaveLength(0); // RLS: no rows updatable
    // The last owner cannot be demoted.
    await expect(sys(`update public.organization_members set role = 'MANAGER' where user_id = $1 and organization_id = $2`, [ids.owner, ids.org])).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("platform admin sees organizations but no tenant operational data", async () => {
    const [orgs, orders, customers] = await withUserTransaction(PLATFORM_ADMIN, async (db) => [
      (await db.one<{ n: number }>(`select count(*)::int as n from public.organizations`)).n,
      (await db.one<{ n: number }>(`select count(*)::int as n from public.orders`)).n,
      (await db.one<{ n: number }>(`select count(*)::int as n from public.customers`)).n,
    ]);
    expect(orgs).toBe(2);
    expect(orders).toBe(0);
    expect(customers).toBe(0);
  });

  it("audit trail records who did what, when, to which resource", async () => {
    const taskId = ids.task(7);
    await runAsMember(ids.emp1, ids.org, async (ctx) => {
      const d = await getTaskDetail(ctx, taskId);
      await confirmItems(ctx, { taskId, items: d.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })) });
    });
    await runAsMember(ids.emp1, ids.org, (ctx) => retrieveLabel(ctx, taskId));
    await runAsMember(ids.emp1, ids.org, (ctx) => verifyLabel(ctx, { taskId, scannedValue: tracking(7) }));
    await runAsMember(ids.emp1, ids.org, (ctx) => submitEvidence(ctx, { evidenceType: "PACKAGING_PHOTO", storagePath: `${ids.org}/tasks/${taskId}/p.jpg`, taskId }));
    await runAsMember(ids.emp1, ids.org, (ctx) => confirmPackage(ctx, taskId));
    expect((await runAsMember(ids.emp1, ids.org, (ctx) => completeTask(ctx, taskId))).completed).toBe(true);

    const logs = await sys<{ action: string; actor_id: string | null; resource_type: string }>(
      `select action, actor_id, resource_type from public.activity_logs where order_id = $1 and occurred_at > now() - interval '5 minutes'`,
      [ids.order(7)],
    );
    const actions = logs.map((l) => l.action);
    for (const a of ["task.started", "label.printed", "label.scan_passed", "evidence.submitted", "task.completed", "order.status_changed", "shipment.verification_changed"]) {
      expect(actions).toContain(a);
    }
    expect(logs.filter((l) => l.action === "order.status_changed").every((l) => l.actor_id === ids.emp1)).toBe(true);
    const steps = await sys<{ action_type: string }>(`select action_type from public.employee_actions where task_id = $1 order by occurred_at`, [taskId]);
    expect(steps.map((s) => s.action_type)).toEqual(["TASK_STARTED", "ITEMS_CONFIRMED", "LABEL_PRINTED", "LABEL_SCANNED", "EVIDENCE_SUBMITTED", "PACKAGE_CONFIRMED", "TASK_COMPLETED"]);
    // Employees cannot forge entries for someone else.
    await expect(
      withUserTransaction(ids.emp1, (db) =>
        db.query(`insert into public.activity_logs (organization_id, actor_type, actor_id, action, resource_type, summary) values ($1,'USER',$2,'x.y','order','forged')`, [ids.org, ids.manager]),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exception creation is idempotent and escalates with notification", async () => {
    const key = exceptionDedupeKey("SHIPMENT_DEADLINE_APPROACHING", "order", ids.order(6));
    const base = { type: "SHIPMENT_DEADLINE_APPROACHING" as const, dedupeKey: key, orderId: ids.order(6), shipmentId: null, taskId: null, description: "d", deadlineAt: null };
    const a = await runAsSystem(ids.org, "test", (ctx) => raiseException(ctx, { ...base, severity: "MEDIUM" }));
    const b = await runAsSystem(ids.org, "test", (ctx) => raiseException(ctx, { ...base, severity: "MEDIUM" }));
    const c = await runAsSystem(ids.org, "test", (ctx) => raiseException(ctx, { ...base, severity: "CRITICAL" }));
    const d = await runAsSystem(ids.org, "test", (ctx) => raiseException(ctx, { ...base, severity: "LOW" }));
    expect([a.inserted, b.inserted, b.escalated, c.escalated, d.escalated]).toEqual([true, false, false, true, false]);
    expect(d.severity).toBe("CRITICAL"); // never de-escalates silently
    const [row] = await sys<{ occurrences: number; risk_level: string }>(
      `select e.occurrences, o.risk_level from public.exceptions e join public.orders o on o.id = e.order_id where e.id = $1`,
      [a.exceptionId],
    );
    expect(row).toMatchObject({ occurrences: 4, risk_level: "CRITICAL" });
    const notes = await sys<{ n: number }>(`select count(*)::int as n from public.notifications where resource_id = $1 and title like 'Critical:%'`, [a.exceptionId]);
    expect(notes[0]!.n).toBeGreaterThan(0);
  });

  it("MOCK TikTok Shop is separated from production integration code", () => {
    expect(getCommerceProvider("TIKTOK_SHOP_MOCK").isMock).toBe(true);
    const official = getCommerceProvider("TIKTOK_SHOP");
    expect(official.isMock).toBe(false);
    return expect(official.importOrders({} as never, { since: null })).rejects.toMatchObject({ code: "INTEGRATION_NOT_CONFIGURED" });
  });

  it("no production module imports the MOCK providers (only the registry may)", () => {
    const root = path.resolve(__dirname, "../..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = path.join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f) && /mock[-/]provider|shipping\/mock/.test(readFileSync(p, "utf8")) && !p.endsWith("registry.ts") && !p.includes(`${path.sep}mock${path.sep}`) && !p.endsWith("mock-provider.ts")) {
          offenders.push(path.relative(root, p));
        }
      }
    };
    for (const d of ["core", "server", "app/api", "lib/supabase"]) walk(path.join(root, d));
    expect(offenders).toEqual([]);
  });
});
