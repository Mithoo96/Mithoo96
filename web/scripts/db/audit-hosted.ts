/** Read-only hosted gate. Never applies migrations, seeds, or changes Auth/Storage. */
import { readdirSync } from "node:fs";
import { Client } from "pg";

async function main() {
  const required = ["DATABASE_URL", "DATABASE_SSL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;
  let blocked = false;
  for (const key of required) {
    const value = process.env[key];
    let valid = !!value;
    if (value) {
      if (key.endsWith("_URL")) {
        try {
          const url = new URL(value);
          valid = !!url.hostname && (key === "DATABASE_URL" ? ["postgres:", "postgresql:"].includes(url.protocol) : url.protocol === "https:");
          if (key === "NEXT_PUBLIC_SUPABASE_URL" && valid) console.log("Project hostname:", url.hostname);
        } catch { valid = false; }
      } else if (key === "DATABASE_SSL") valid = value === "require";
      else valid = /^(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sb_(publishable|secret)_[A-Za-z0-9_-]+)$/.test(value);
    }
    console.log(key, !value ? "MISSING" : valid ? "PRESENT / VALID FORMAT" : "PRESENT / INVALID FORMAT");
    if (!valid) blocked = true;
  }
  if (blocked) {
    console.log("HOSTED GATE BLOCKED");
    process.exitCode = 1;
    return;
  }
  const endpoint = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  if (endpoint.username || endpoint.password || endpoint.pathname !== "/" || endpoint.search || endpoint.hash) {
    console.log("Project endpoint must be an HTTPS origin without credentials.");
    process.exitCode = 1;
    return;
  }
  // Do not send credentials through redirects or expose response bodies/errors.
  for (const route of ["/auth/v1/settings", "/storage/v1/bucket"]) {
    try {
      const key = route.startsWith("/storage") ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const response = await fetch(new URL(route, endpoint), {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        redirect: "error", signal: AbortSignal.timeout(10000),
      });
      console.log(route, "HTTP", response.status);
      if (!response.ok) blocked = true;
      if (response.ok && route.startsWith("/storage")) {
        const buckets = await response.json() as { name: string; public: boolean }[];
        console.log("Private buckets:", buckets.filter((b) => !b.public).map((b) => b.name).join(", ") || "none");
      }
    } catch { console.log(route, "CONNECTIVITY FAILED"); blocked = true; }
  }
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  // pg connection-string SSL options can override the explicit TLS object.
  // Enforce certificate verification for this audit regardless of URI options.
  for (const option of ["sslmode", "sslcert", "sslkey", "sslrootcert", "ssl", "uselibpqcompat"]) databaseUrl.searchParams.delete(option);
  const client = new Client({
    connectionString: databaseUrl.toString(),
    ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const tls = await client.query("select ssl from pg_stat_ssl where pid=pg_backend_pid()");
    console.log("Database TLS:", tls.rows[0]?.ssl === true ? "ACTIVE" : "NOT VERIFIED");
    if (tls.rows[0]?.ssl !== true) blocked = true;
    const history = await client.query("select version from supabase_migrations.schema_migrations order by version");
    const applied = new Set(history.rows.map((r: { version: string }) => r.version));
    const migrations = readdirSync(new URL("../../supabase/migrations/", import.meta.url)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of migrations) console.log(file, applied.has(file.split("_")[0]) ? "APPLIED" : "MISSING");
    console.log("Hosted migration versions:", [...applied].join(", "));
    await client.query("ROLLBACK");
  } catch (error) {
    const code = (error as { code?: string }).code;
    console.log("Database audit failed; code:", code && /^[A-Z0-9_]+$/.test(code) ? code : "UNKNOWN");
    blocked = true;
  } finally { await client.end().catch(() => undefined); }
  console.log(blocked ? "HOSTED GATE BLOCKED" : "READ-ONLY CONNECTIVITY AND MIGRATION AUDIT COMPLETE; AUTH ROLES AND STORAGE POLICIES STILL REQUIRE REVIEW");
  if (blocked) process.exitCode = 1;
}
main().catch(() => { console.log("HOSTED GATE BLOCKED: audit failed"); process.exitCode = 1; });
