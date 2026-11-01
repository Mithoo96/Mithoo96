import { expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Workspace } from "@/server/auth/workspace";
import { toWorkspaceProfile } from "@/server/adapters/prototype";
import { getSessionOrders, getSessionOrderDetail, getSessionWorkspaceActivity } from "@/server/adapters/fulfillment";

const id = "e0000000-0000-4000-8000-000000000007";
const order = { id, order_number: "TEST-7", status: "LABEL_READY", channel: "MANUAL", placed_at: "2026-11-01T12:00:00Z", ship_by_at: null, risk_level: "NONE", exception_state: null };
function workspace(role = "OWNER"): Workspace {
  return { profile: toWorkspaceProfile({ id: "org-a", name: "Test organization", slug: "test", timezone: "America/New_York", metadata: {} }, null, "user-a", role), memberships: [], extraPermissions: [] };
}
function client(rows: Record<string, unknown[]> = {}) {
  const calls: unknown[][] = [];
  const from = (table: string) => {
    let single = false;
    const chain: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: single ? rows[table]?.[0] ?? null : rows[table] ?? [], count: rows[table]?.length ?? 0, error: null }).then(resolve),
    };
    for (const method of ["select", "eq", "neq", "not", "in", "order", "range", "limit", "ilike", "gte", "lt", "or", "maybeSingle"]) {
      chain[method] = (...args: unknown[]) => { calls.push([table, method, ...args]); if (method === "maybeSingle") single = true; return chain; };
    }
    return chain;
  };
  return { supabase: { from } as unknown as SupabaseClient, calls };
}
it("keeps owner search, status, pagination and dashboard day filters organization scoped", async () => {
  const c = client({ orders: [order] });
  const result = await getSessionOrders(c.supabase, workspace(), { search: "TEST", status: "LABEL_READY", page: "1", filter: "today" }, new Date("2026-11-01T18:00:00Z"));
  expect(result.orders).toEqual([order]);
  expect(c.calls).toContainEqual(["orders", "eq", "organization_id", "org-a"]);
  expect(c.calls).toContainEqual(["orders", "eq", "status", "LABEL_READY"]);
  expect(c.calls).toContainEqual(["orders", "ilike", "order_number", "%TEST%"]);
  expect(c.calls).toContainEqual(["orders", "gte", "placed_at", "2026-11-01T04:00:00.000Z"]);
  expect(c.calls).toContainEqual(["orders", "lt", "placed_at", "2026-11-02T05:00:00.000Z"]);
  for (const table of ["orders", "shipments", "tasks"]) expect(c.calls).toContainEqual([table, "eq", "organization_id", "org-a"]);
});
it("returns detail and persisted audit entries with explicit tenant and order filters", async () => {
  const event = { id: "event", action: "label.scan_failed", summary: "Recorded rejected scan", occurred_at: "2026-11-01T12:00:00Z", order_id: id };
  const c = client({ orders: [order], activity_logs: [event] });
  const detail = await getSessionOrderDetail(c.supabase, workspace(), id);
  expect(detail.order.id).toBe(id);
  expect(detail.timeline[0]?.action).toBe("label.scan_failed");
  for (const table of ["order_items", "shipments", "shipping_labels", "tasks", "exceptions", "approvals", "activity_logs"]) {
    expect(c.calls).toContainEqual([table, "eq", "organization_id", "org-a"]);
    expect(c.calls).toContainEqual([table, "eq", "order_id", id]);
  }
  expect(await getSessionWorkspaceActivity(c.supabase, workspace())).toEqual([event]);
  expect(c.calls).toContainEqual(["activity_logs", "limit", 25]);
  expect(c.calls.some((c) => c[1] === "select" && String(c[2]).includes("customer"))).toBe(false);
});
it("returns not found for inaccessible order rows and blocks employee-wide reads before querying", async () => {
  const c = client();
  await expect(getSessionOrderDetail(c.supabase, workspace(), id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  c.calls.length = 0;
  await expect(getSessionOrders(c.supabase, workspace("EMPLOYEE"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(getSessionWorkspaceActivity(c.supabase, workspace("EMPLOYEE"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(c.calls).toHaveLength(0);
});
