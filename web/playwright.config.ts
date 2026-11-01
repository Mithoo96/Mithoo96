import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e", workers: 1, retries: 0, timeout: 120_000,
  reporter: "list", expect: { timeout: 30_000 },
  use: {
    baseURL: "http://127.0.0.1:3000", actionTimeout: 20_000, trace: "off", screenshot: "off", video: "off",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } : undefined },
  },
  webServer: { command: "npm run dev -- --hostname 127.0.0.1", url: "http://127.0.0.1:3000/login", reuseExistingServer: !process.env.CI, timeout: 120_000, env: { NODE_USE_ENV_PROXY: "1" } },
});
