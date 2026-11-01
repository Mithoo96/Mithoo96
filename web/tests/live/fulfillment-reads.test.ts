import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { resolveWorkspace } from "@/server/auth/workspace";
import { getSessionOrders, getSessionOrderDetail, getSessionEmployees, lookupSessionPackages, getSessionWorkspaceActivity } from "@/server/adapters/fulfillment";
import { getSessionDashboardSummary } from "@/server/services/dashboard";
const live = process.env.RUN_LIVE_FULFILLMENT_READS === "1" ? describe : describe.skip;
live("live read-only fulfillment with OWNER JWT", () => {
  it("reads/filter/details/lookup and excludes foreign data without customer fields", async () => {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await client.auth.signInWithPassword({ email: "owner@zileboutik.demo", password: process.env.DEMO_ACCOUNT_PASSWORD! });
    expect(!!auth.error).toBe(false);
    try {
      const workspace = await resolveWorkspace(client);
      expect(workspace?.profile.viewer.role).toBe("OWNER");
      const dashboard = await getSessionDashboardSummary(client, workspace!);
      expect(dashboard.orders.today).toBeGreaterThanOrEqual(0);
      for (const [filter, expected] of Object.entries({ today: dashboard.orders.today, processing: dashboard.orders.inPacking, "shipped-today": dashboard.orders.shippedToday, "delivered-today": dashboard.orders.deliveredToday, attention: dashboard.orders.needAttention, "at-risk": dashboard.orders.atRisk })) {
        expect((await getSessionOrders(client, workspace!, { filter })).total).toBe(expected);
      }
      const activity = await getSessionWorkspaceActivity(client, workspace!);
      expect(activity.length).toBeGreaterThan(0);
      expect(activity.every((entry) => !!entry.action && !!entry.summary && !!entry.occurred_at)).toBe(true);
      const orders = await getSessionOrders(client, workspace!);
      expect(orders.total).toBeGreaterThan(0);
      expect(orders.orders.every((o) => o.order_number.startsWith("ZB-"))).toBe(true);
      expect((await getSessionEmployees(client, workspace!)).length).toBeGreaterThan(0);
      const detail = await getSessionOrderDetail(client, workspace!, "e0000000-0000-4000-8000-000000000007");
      expect(detail.items.length).toBeGreaterThan(0); expect(detail.shipments.length).toBeGreaterThan(0);
      expect(detail.timeline.length).toBeGreaterThan(0);
      expect(Object.keys(detail)).not.toContain("customer");
      expect(JSON.stringify(detail)).not.toMatch(/@example.com|555-|shipping_address|unit_price|total_amount/);
      const filtered = await getSessionOrders(client, workspace!, { search: "ZB-1007" }); expect(filtered.orders).toHaveLength(1);
      expect(await lookupSessionPackages(client, workspace!, { value: "0007" })).toMatchObject({ kind: "UNIQUE" });
      expect(await lookupSessionPackages(client, workspace!, { value: "9400000000000000000021" })).toMatchObject({ kind: "AMBIGUOUS" });
      expect(await lookupSessionPackages(client, workspace!, { value: "NW-0001" })).toMatchObject({ kind: "NONE" });
      await expect(getSessionOrderDetail(client, workspace!, "e0000000-0000-4000-8000-000000000099")).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally { await client.auth.signOut({ scope: "local" }); }
  });
});
