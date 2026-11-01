import { Client } from "pg";
import { expect, it } from "vitest";
import { databasePoolConfig } from "@/server/db/pool-config";

it("keeps the verified CA and hostname verification despite URL SSL overrides", () => {
  const env = {
    DATABASE_URL: "postgresql://example:example@localhost/example?sslmode=no-verify&sslrootcert=/missing&application_name=tls-test",
    DATABASE_SSL: "require" as const,
    DATABASE_POOL_MAX: 5,
  };
  const config = databasePoolConfig(env);
  const client = new Client(config);
  expect(client.ssl).toMatchObject({ rejectUnauthorized: true });
  expect((client.ssl as unknown as { ca: string }).ca).toContain("-----BEGIN CERTIFICATE-----");
  expect(client.ssl).not.toHaveProperty("checkServerIdentity");
  expect(new URL(config.connectionString!).searchParams.get("application_name")).toBe("tls-test");
  expect(env.DATABASE_URL).toContain("sslmode=no-verify");
});
