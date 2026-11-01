import { test, expect } from "@playwright/test";
import { login } from "./login-helper";
const configured = !!process.env.DEMO_ACCOUNT_PASSWORD && !!process.env.NEXT_PUBLIC_SUPABASE_URL;
test.skip(!configured, "Configured staging OWNER is required");

test("OWNER searches real orders, opens minimal operational detail, and uses package lookup", async ({ page }, testInfo) => {
  let stage = "login";
  try {
    await page.goto("/login?next=/orders"); await login(page, process.env.DEMO_ACCOUNT_PASSWORD!);
    await expect(page).toHaveURL("/orders"); await page.keyboard.press("Escape");
    stage = "orders";
    await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
    await page.getByLabel("Search orders", { exact: true }).fill("ZB-1007");
    await page.getByRole("button", { name: "Filter orders" }).click();
    await expect(page.getByRole("link").filter({ hasText: "ZB-1007" }).first()).toBeVisible();
    await page.getByRole("link").filter({ hasText: "ZB-1007" }).first().click();
    stage = "detail";
    await expect(page.getByRole("heading", { name: "ZB-1007", exact: true })).toBeVisible();
    for (const heading of ["Products & quantities", "Employee responsibility", "Shipment & label verification", "Exceptions", "Approvals", "Activity timeline"]) await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save assignment" })).toBeVisible();
    await expect(page.getByText(/@example.com|555-|Demo Avenue/)).toHaveCount(0);
    await expect(page.locator(".launch")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("order-detail-mobile.png"), fullPage: true });
    stage = "lookup";
    await page.goto("/orders"); await page.keyboard.press("Escape");
    await page.getByLabel("Find a package", { exact: true }).fill("0007");
    await page.getByRole("button", { name: "Find package", exact: true }).click();
    await expect(page.getByRole("link", { name: /ZB-1007.*Open authorized order/ })).toBeVisible();
    await page.getByLabel("Find a package", { exact: true }).fill("0021");
    await page.getByRole("button", { name: "Find package", exact: true }).click();
    await expect(page.getByText(/Multiple authorized packages match/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Open authorized order/ })).toHaveCount(0);
    await page.getByLabel("Find a package", { exact: true }).fill("NW-0001");
    await page.getByRole("button", { name: "Find package", exact: true }).click();
    await expect(page.getByText(/No authorized package found/)).toBeVisible();
    stage = "foreign order";
    const foreign = await page.goto("/orders/e0000000-0000-4000-8000-000000000099");
    expect(foreign?.status()).toBe(404);
  } catch { throw new Error(`OWNER fulfillment browser check failed at ${stage}; authentication details suppressed.`); }
});
