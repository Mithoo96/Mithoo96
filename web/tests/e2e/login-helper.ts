import type { Page } from "@playwright/test";
export async function login(page: Page, password: string, email = "owner@zileboutik.demo") {
  await page.getByLabel("Email", { exact: true }).fill(email);
  // Keep the secret out of Playwright action logs and failure artifacts.
  await page.evaluate((password) => {
    const input = document.querySelector<HTMLInputElement>('input[name="password"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, password);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
