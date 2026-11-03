import { afterAll, beforeAll, expect, it } from "vitest";
import { ORDER_STATUSES, ORDER_TRANSITIONS } from "@/core/orders/state-machine";
import { ROLE_PERMISSIONS } from "@/core/tenancy/permissions";
import { runAsMember, runAsSystem } from "@/server/context";
import { getPool, withUserTransaction } from "@/server/db/client";
import { getDashboardSummary } from "@/server/services/dashboard";
import { resolveException } from "@/server/services/exceptions";
import { getOrderDetails, getOrders, transitionOrder } from "@/server/services/orders";
import { closeDatabase, describeDb, freshDatabase, ids } from "../helpers/db";

describeDb("tenant isolation & authorization", () => {
  beforeAll(freshDatabase);
  afterAll(closeDatabase);

  it("rejects members of another organization", async () => {
    await expect(runAsMember(ids.otherOwner, ids.org, async () => 1)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(runAsMember(ids.emp1, ids.orgB, async () => 1)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("RLS shows each owner only their own organization's data", async () => {
    const count = (user: string, table: string) =>
      withUserTransaction(user, async (db) => (await db.one<{ n: number }>(`select count(*)::int as n from public.${table}`)).n);
    expect(await count(ids.otherOwner, "orders")).toBe(1);
    expect(await count(ids.owner, "orders")).toBe(25);
    expect(await count(ids.otherOwner, "organizations")).toBe(1);
    expect(await count(ids.otherOwner, "customers")).toBe(1);
    const own = await runAsMember(ids.otherOwner, ids.orgB, (ctx) => getOrders(ctx));
    expect(own.map((o) => o.orderNumber)).toEqual(["NW-0001"]);
  });

  it("employees only see orders they have a task on, and no customers", async () => {
    const visible = await withUserTransaction(ids.emp1, (db) => db.query<{ order_number: string }>(`select order_number from public.orders order by order_number`));
    expect(visible.map((r) => r.order_number)).toEqual(["TEST-1007", "TEST-1008", "TEST-1014", "TEST-1016", "TEST-1018"]);
    const customers = await withUserTransaction(ids.emp1, (db) => db.one<{ n: number }>(`select count(*)::int as n from public.customers`));
    expect(customers.n).toBe(0);
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => getOrders(ctx))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => getOrderDetails(ctx, ids.order(1)))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => getDashboardSummary(ctx))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("another tenant's record is indistinguishable from a missing one", async () => {
    await expect(runAsMember(ids.owner, ids.org, (ctx) => getOrderDetails(ctx, ids.order(99)))).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("browser role (authenticated) is read-only", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await client.query("set local role authenticated");
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: ids.owner })]);
      await expect(client.query(`update public.orders set notes = 'x' where id = $1`, [ids.order(1)])).rejects.toThrow(/permission denied/);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("employees cannot change protected order columns even on their own orders", async () => {
    await expect(
      withUserTransaction(ids.emp1, (db) => db.query(`update public.orders set total_amount = 0 where id = $1`, [ids.order(7)])),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("composite keys block cross-tenant links and foreign assignees", async () => {
    await expect(
      runAsSystem(ids.org, "test", (ctx) =>
        ctx.db.query(`insert into public.order_items (organization_id, order_id, sku, name, quantity) values ($1, $2, 'X', 'X', 1)`, [ids.org, ids.order(99)]),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(
      runAsSystem(ids.org, "test", (ctx) => ctx.db.query(`update public.tasks set assigned_to = $2 where id = $1`, [ids.task(7), ids.otherEmp])),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("role checks: employees cannot verify orders or resolve exceptions", async () => {
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => transitionOrder(ctx, { orderId: ids.order(16), to: "READY_TO_SHIP" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(runAsMember(ids.emp1, ids.org, (ctx) => transitionOrder(ctx, { orderId: ids.order(1), to: "VERIFIED" }))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      runAsMember(ids.emp1, ids.org, (ctx) => resolveException(ctx, { exceptionId: "20000000-0000-4000-8000-000000000001", notes: "done" })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("the database rejects illegal transitions even for the system", async () => {
    await expect(
      runAsSystem(ids.org, "test", (ctx) => ctx.db.query(`update public.orders set status = 'SHIPPED' where id = $1`, [ids.order(1)])),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED", message: expect.stringMatching(/Illegal order status transition NEW -> SHIPPED/) });
    await expect(runAsMember(ids.owner, ids.org, (ctx) => transitionOrder(ctx, { orderId: ids.order(1), to: "SHIPPED" }))).rejects.toMatchObject({ code: "ILLEGAL_TRANSITION" });
  });

  it("valid transitions succeed and are audited by the database", async () => {
    await runAsMember(ids.manager, ids.org, (ctx) => transitionOrder(ctx, { orderId: ids.order(1), to: "VERIFIED", reason: "Checked items and address" }));
    const log = await runAsSystem(ids.org, "test", (ctx) =>
      ctx.db.one<{ actor_id: string; metadata: { reason: string } }>(
        `select actor_id, metadata from public.activity_logs where order_id = $1 and action = 'order.status_changed' order by occurred_at desc limit 1`,
        [ids.order(1)],
      ),
    );
    expect(log.actor_id).toBe(ids.manager);
    expect(log.metadata.reason).toBe("Checked items and address");
  });

  it("activity log is append-only", async () => {
    await expect(runAsSystem(ids.org, "test", (ctx) => ctx.db.query(`delete from public.activity_logs`))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("TS state machine and SQL backstop agree on every transition", async () => {
    const pairs = await runAsSystem(ids.org, "test", (ctx) =>
      ctx.db.query<{ f: string; t: string }>(
        `select f, t from unnest($1::text[]) f, unnest($1::text[]) t where app.is_valid_order_transition(f, t) order by 1, 2`,
        [ORDER_STATUSES],
      ),
    );
    const sql = pairs.map((p) => `${p.f}->${p.t}`).sort();
    const ts = ORDER_TRANSITIONS.map((t) => `${t.from}->${t.to}`).sort();
    expect(sql).toEqual(ts);
  });

  it("TS role permissions match the role_permissions table", async () => {
    const rows = await runAsSystem(ids.org, "test", (ctx) => ctx.db.query<{ role: string; permission: string }>(`select role, permission from public.role_permissions`));
    for (const role of ["OWNER", "MANAGER", "EMPLOYEE"] as const) {
      expect(rows.filter((r) => r.role === role).map((r) => r.permission).sort()).toEqual([...ROLE_PERMISSIONS[role]].sort());
    }
  });
});
