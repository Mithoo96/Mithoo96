import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Opt-in live tests: no seed/reset, no server key, no persisted session artifacts.
const configured = !!process.env.DEMO_ACCOUNT_PASSWORD && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
test.skip(!configured, "Live staging credentials are required");
import { login } from "./login-helper";

test("all actual application routes redirect without a session", async ({ request }) => {
  for (const route of ["/", "/orders", "/orders/example", "/work", "/work/tasks/example", "/approvals", "/clients", "/clients/example", "/documents", "/inbox", "/appointments", "/create", "/create/campaign", "/insights", "/insights/revenue", "/apps", "/settings"]) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location, "http://127.0.0.1:3000").pathname).toBe("/login");
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("invalid login remains on the public form", async ({ page }) => {
  await page.goto("/login");
  await login(page, "intentionally-invalid-checkpoint-password");
  await expect(page.locator("p[role=alert]")).toHaveText("Email or password is incorrect.");
  await expect(page).toHaveURL(/\/login/);
});

test("OWNER login, persisted session, real dashboard, and logout", async ({ page }, testInfo) => {
  let stage = "login";
  try {
    await page.goto("/login");
    await login(page, process.env.DEMO_ACCOUNT_PASSWORD!);
    await expect(page).toHaveURL("/");
    stage = "workspace and dashboard";
    await expect(page.getByRole("heading", { name: "Your business is moving.", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Zile Boutik · OWNER", { exact: true })).toBeVisible();
    for (const label of ["Orders Today", "Processing", "Ready to Pack", "Awaiting Verification", "Shipped Today", "Delivered", "Need Attention", "At Risk", "Pending Approvals", "Employee Tasks"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("Dashboard data could not be loaded.", { exact: false })).toHaveCount(0);
    await expect(page.locator(".launch")).toHaveCount(0);
    stage = "persisted activity";
    await page.getByRole("button", { name: "See everything Mithoo handled today" }).click();
    const activity = page.getByRole("dialog");
    await expect(activity.getByRole("heading", { name: "Workspace activity", exact: true })).toBeVisible();
    await expect(activity.getByText("No activity has been recorded.")).toHaveCount(0);
    await expect(activity.getByText(/Activity is temporarily unavailable/)).toHaveCount(0);
    expect(await activity.locator("li a").count()).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await page.screenshot({ path: testInfo.outputPath("owner-dashboard.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("owner-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
    stage = "persistence";
    await page.reload();
    await expect(page.getByText("Zile Boutik · OWNER", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/login");
    await expect(page).toHaveURL("/");
    await page.keyboard.press("Escape");
    stage = "logout";
    await page.getByRole("button", { name: "Account menu" }).first().click();
    await page.getByRole("button", { name: "Sign Out", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Sign Out", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  } catch { throw new Error(`OWNER browser checkpoint failed at ${stage}; credential details intentionally suppressed.`); }
});

test("invalid session cookies redirect back to login", async ({ page, context }) => {
  await page.goto("/login"); await login(page, process.env.DEMO_ACCOUNT_PASSWORD!);
  await expect(page).toHaveURL("/");
  const names = (await context.cookies()).filter((c) => /^sb-.*-auth-token/.test(c.name)).map((c) => c.name);
  expect(names.length).toBeGreaterThan(0);
  await context.clearCookies();
  await context.addCookies([{ name: names[0].replace(/\.\d+$/, ""), value: "base64-invalid-session", url: "http://127.0.0.1:3000" }]);
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("employee login uses the existing assigned-work UI and excludes owner routes", async ({ page }) => {
  await page.goto("/login");
  await login(page, process.env.DEMO_ACCOUNT_PASSWORD!, "employee1@zileboutik.demo");
  await expect(page).toHaveURL("/work"); await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Today’s Work", exact: true })).toBeVisible();
  await expect(page.getByText("Zile Boutik · OWNER", { exact: true })).toHaveCount(0);
  await page.goto("/orders"); await expect(page).toHaveURL("/work"); await page.keyboard.press("Escape");
  const foreignTask = await page.goto("/work/tasks/10000000-0000-4000-8000-000000000009");
  expect(foreignTask?.status()).toBe(404);
  await page.goto("/work"); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Account menu" }).first().click();
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("OWNER JWT reads Zile data and excludes known foreign staging rows", async () => {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: "owner@zileboutik.demo", password: process.env.DEMO_ACCOUNT_PASSWORD! });
  expect(!!error).toBe(false);
  expect(data.user?.id).toBe("a0000000-0000-4000-8000-000000000002");
  try {
    const zile = "b0000000-0000-4000-8000-000000000001";
    const other = "b0000000-0000-4000-8000-000000000002";
    const membership = await client.from("organization_members").select("role,status").eq("user_id", data.user!.id).eq("organization_id", zile).single();
    expect(membership.data).toEqual({ role: "OWNER", status: "ACTIVE" });
    for (const table of ["orders", "products", "tasks", "approvals"]) {
      const own = await client.from(table).select("id", { count: "exact", head: true }).eq("organization_id", zile);
      expect(!!own.error).toBe(false); expect(own.count).toBeGreaterThan(0);
      const foreign = await client.from(table).select("id").eq("organization_id", other);
      expect(!!foreign.error).toBe(false); expect(foreign.data?.length).toBe(0);
    }
    const foreignOrg = await client.from("organizations").select("id").eq("id", other);
    expect(!!foreignOrg.error).toBe(false); expect(foreignOrg.data?.length).toBe(0);
  } finally { await client.auth.signOut({ scope: "local" }); }
});
