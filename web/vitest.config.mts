import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^server-only$/, replacement: path.resolve(import.meta.dirname, "tests/helpers/server-only-stub.ts") },
      { find: /^@\/(.*)$/, replacement: path.resolve(import.meta.dirname, "$1") },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Integration tests share one database; run files sequentially.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
