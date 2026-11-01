import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/supabase/navigation";
import { organizationDayStart, getSessionDashboardSummary } from "@/server/services/dashboard";
import { resolveWorkspace, type Workspace } from "@/server/auth/workspace";
import type { SupabaseClient } from "@supabase/supabase-js";

const mock = vi.hoisted(() => ({ user: null as null | { id: string }, refresh: false }));
vi.mock("@supabase/ssr", () => ({ createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[], headers: Record<string, string>) => void } }) => ({ auth: { getUser: async () => {
  if (mock.refresh) options.cookies.setAll([{ name: "session", value: "refreshed", options: { path: "/", httpOnly: true } }], { "Cache-Control": "private, no-store", Pragma: "no-cache" });
  return { data: { user: mock.user } };
} } }) }));
import { proxy } from "@/proxy";

beforeEach(() => { mock.user = null; mock.refresh = false; vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key"); });
it("blocks external return destinations and login loops", () => {
  for (const path of ["//evil.example", "/\\evil.example", "https://evil.example", "/login", "/api/health", "/\nevil"]) expect(safeReturnPath(path)).toBe("/");
  expect(safeReturnPath("/work?filter=today")).toBe("/work?filter=today");
});
it("protects actual routes and preserves query strings", async () => {
  for (const path of ["/", "/work", "/approvals", "/settings"]) {
    const response = await proxy(new NextRequest("https://app.example" + path + "?filter=open"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).searchParams.get("next")).toBe(path + "?filter=open");
  }
});
it("preserves refreshed cookies and cache headers across login redirects", async () => {
  mock.user = { id: "owner" }; mock.refresh = true;
  const response = await proxy(new NextRequest("https://app.example/login?next=/work"));
  expect(response.headers.get("location")).toBe("https://app.example/work");
  expect(response.cookies.get("session")?.value).toBe("refreshed");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
});
it("keeps authenticated users on their route and fails closed without config", async () => {
  mock.user = { id: "owner" };
  expect((await proxy(new NextRequest("https://app.example/work"))).status).toBe(200);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  expect((await proxy(new NextRequest("https://app.example/work"))).status).toBe(503);
});
it("uses local midnight through DST and UTC boundaries", () => {
  expect(organizationDayStart(new Date("2026-11-01T18:00:00Z"), "America/New_York")).toBe("2026-11-01T04:00:00.000Z");
  expect(organizationDayStart(new Date("2026-11-02T18:00:00Z"), "America/New_York")).toBe("2026-11-02T05:00:00.000Z");
  expect(organizationDayStart(new Date("2026-03-08T18:00:00Z"), "America/New_York")).toBe("2026-03-08T05:00:00.000Z");
  expect(organizationDayStart(new Date("2026-11-01T02:00:00Z"), "America/New_York")).toBe("2026-10-31T04:00:00.000Z");
});

function workspaceClient(rows: unknown[], user: { id: string } | null = { id: "owner" }) {
  const from = vi.fn((table: string) => {
    const result = { data: table === "organization_members" ? rows : table === "profiles" ? { display_name: "Zile Owner" } : null, error: null };
    const chain: Record<string, unknown> = { then: (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    for (const method of ["select", "eq", "order", "maybeSingle"]) chain[method] = vi.fn(() => chain);
    return chain;
  });
  return { auth: { getUser: async () => ({ data: { user }, error: null }) }, from } as unknown as SupabaseClient;
}
const member = (role = "OWNER", status = "ACTIVE") => ({ organization_id: "zile", role, status: "ACTIVE", extra_permissions: [], organizations: { id: "zile", name: "Zile Boutik", slug: "zile", timezone: "America/New_York", status, metadata: {} } });
it("resolves active organization and role from verified membership rows", async () => {
  const w = await resolveWorkspace(workspaceClient([member()]));
  expect(w?.profile.viewer.userId).toBe("owner"); expect(w?.profile.viewer.role).toBe("OWNER");
  expect(w?.profile.organization.id).toBe("zile"); expect(w?.profile.viewer.firstName).toBe("Zile");
});
it("does not grant tenant authority for inactive organizations or forged roles", async () => {
  expect((await resolveWorkspace(workspaceClient([member("OWNER", "SUSPENDED")])))?.memberships).toEqual([]);
  expect((await resolveWorkspace(workspaceClient([member("PLATFORM_ADMIN")])))?.profile.viewer.role).toBe("NO_MEMBERSHIP");
  expect(await resolveWorkspace(workspaceClient([], null))).toBeNull();
});
it("refuses employee dashboard reads before any data request", async () => {
  const client = workspaceClient([member("EMPLOYEE")]);
  const w = await resolveWorkspace(client);
  vi.mocked(client.from).mockClear();
  await expect(getSessionDashboardSummary(client, w!)).rejects.toThrow("not permitted");
  expect(client.from).not.toHaveBeenCalled();
});
it("counts under the selected organization and sums only stored monetary values", async () => {
  const w = (await resolveWorkspace(workspaceClient([member()]))) as Workspace;
  const filters: unknown[][] = [];
  const client = { from: (table: string) => {
    let revenue = false;
    const chain: Record<string, unknown> = { then: (resolve: (r: unknown) => unknown) => Promise.resolve(revenue ? { data: [{ currency: "USD", total_amount: "0.10" }, { currency: "USD", total_amount: "0.20" }, { currency: "USD", total_amount: null }], error: null } : { count: 3, error: null }).then(resolve) };
    for (const method of ["select", "eq", "not", "or", "gte", "lt", "in", "is", "order", "range"]) chain[method] = (...args: unknown[]) => { filters.push([table, method, ...args]); if (method === "select" && args[0] === "id,currency,total_amount") revenue = true; return chain; };
    return chain;
  } } as unknown as SupabaseClient;
  const summary = await getSessionDashboardSummary(client, w, new Date("2026-11-01T18:00:00Z"));
  expect(summary.orders.today).toBe(3); expect(summary.tasks.open).toBe(3);
  expect(summary.revenueAtRisk).toEqual([{ currency: "USD", amount: "0.30", orderCount: 2 }]);
  expect(summary.revenueAtRiskOrdersWithoutAmount).toBe(1);
  expect(filters.filter((r) => r[1] === "eq" && r[2] === "organization_id").every((r) => r[3] === "zile")).toBe(true);
  expect(filters).toContainEqual(["orders", "lt", "placed_at", "2026-11-02T05:00:00.000Z"]);
});

it("does not read revenue for managers and fails on unavailable counts", async () => {
  const w = (await resolveWorkspace(workspaceClient([member("MANAGER")]))) as Workspace;
  const selections: unknown[] = [];
  let failed = false;
  const client = { from: () => {
    const chain: Record<string, unknown> = { then: (resolve: (r: unknown) => unknown) => Promise.resolve({ count: failed ? null : 0, error: failed ? { message: "internal diagnostic" } : null }).then(resolve) };
    for (const method of ["select", "eq", "not", "or", "gte", "lt", "in", "is"]) chain[method] = (...args: unknown[]) => { if (method === "select") selections.push(args[0]); return chain; };
    return chain;
  } } as unknown as SupabaseClient;
  expect((await getSessionDashboardSummary(client, w)).revenueAtRisk).toBeNull();
  expect(selections.every((s) => s === "id")).toBe(true);
  failed = true;
  await expect(getSessionDashboardSummary(client, w)).rejects.toThrow("Dashboard data is temporarily unavailable.");
});
