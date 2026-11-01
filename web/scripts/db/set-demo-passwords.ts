/**
 * Sets a password for the seeded DEMO accounts only (emails ending in ".demo").
 * The password comes from the environment and is never committed.
 *
 *   DATABASE_URL=... DEMO_ACCOUNT_PASSWORD='choose-a-strong-one' npm run db:demo-passwords
 *
 * Refuses to run when APP_ENV=production.
 */
import { Client } from "pg";

export async function setDemoPasswords(connectionString: string, password: string): Promise<number> {
  if (password.length < 12) throw new Error("DEMO_ACCOUNT_PASSWORD must be at least 12 characters");
  const local = ["localhost", "127.0.0.1", "::1"].includes(new URL(connectionString).hostname);
  const client = new Client({ connectionString, ssl: local ? undefined : { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query(
      `update auth.users set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')), updated_at = now()
        where email like '%.demo'`,
      [password],
    );
    return res.rowCount ?? 0;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (process.env.APP_ENV === "production") {
    console.error("Refusing to set demo passwords in production");
    process.exit(1);
  }
  if (!url || !password) {
    console.error("DATABASE_URL and DEMO_ACCOUNT_PASSWORD are required");
    process.exit(1);
  }
  setDemoPasswords(url, password)
    .then((n) => console.log(`Updated ${n} demo account(s).`))
    .catch((err: unknown) => {
      console.error((err as Error).message);
      process.exit(1);
    });
}
