/** Fictional demo only. Never run against production. Does not reset a database. */
import { Client } from "pg";
import { runAsMember } from "../../server/context";
import { getPool } from "../../server/db/client";
import {
  configureModules,
  createContact,
  createLead,
  moveLead,
  scheduleFollowUp,
  finishFollowUp,
  convertLead,
} from "../../server/services/agency/foundation";
const org = "c0000000-0000-4000-8000-000000000001";
const users = [
  "c1000000-0000-4000-8000-000000000001",
  "c1000000-0000-4000-8000-000000000002",
  "c1000000-0000-4000-8000-000000000003",
  "c1000000-0000-4000-8000-000000000004",
];
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  if (process.env.APP_ENV === "production")
    throw new Error("Refusing to seed production");
  const local = ["localhost", "127.0.0.1", "::1"].includes(
    new URL(url).hostname,
  );
  if (!local || process.env.APP_ENV !== "development")
    throw new Error(
      "Agency demo seeding is restricted to a local development database",
    );
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("begin");
    for (const [index, id] of users.entries()) {
      const role =
        index === 0 ? "owner" : index === 1 ? "manager" : `agent${index - 1}`;
      const email = `${role}@agency.demo`;
      await db.query(
        `insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
   values('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,extensions.crypt(gen_random_uuid()::text,extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',$3,now(),now(),'','','','') on conflict(id) do nothing`,
        [
          id,
          email,
          JSON.stringify({
            full_name: `Demo ${role}`,
            display_name: `Demo ${role}`,
          }),
        ],
      );
      await db.query(
        `insert into auth.identities(id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at) values($1::uuid,$1::text,$1::uuid,$2,'email',now(),now(),now()) on conflict do nothing`,
        [id, JSON.stringify({ sub: id, email, email_verified: true })],
      );
    }
    await db.query(
      `insert into public.organizations(id,name,slug,timezone) values($1,'Sample Agency','sample-agency','America/New_York') on conflict(id) do nothing`,
      [org],
    );
    for (const [i, id] of users.entries())
      await db.query(
        `insert into public.organization_members(organization_id,user_id,role) values($1,$2,$3) on conflict(organization_id,user_id) do nothing`,
        [org, id, i === 0 ? "OWNER" : i === 1 ? "MANAGER" : "EMPLOYEE"],
      );
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
  await runAsMember(users[0], org, async (ctx) => {
    await configureModules(ctx, {
      modules: ["TAX", "LIFE_INSURANCE", "HEALTH_INSURANCE"],
    });
    const names = [
      "New inquiry",
      "Assigned prospect",
      "Overdue follow-up",
      "Qualified prospect",
      "Follow up later",
      "Converted client",
    ];
    for (const [i, name] of names.entries()) {
      if (
        await ctx.db.maybeOne(
          "select id from public.agency_leads where organization_id=$1 and $2=any(tags)",
          [org, `DEMO_${i}`],
        )
      )
        continue;
      const contact = await createContact(ctx, {
        name: `Sample ${name}`,
        email: `prospect${i + 1}@example.test`,
      });
      const moduleKey = (
        ["TAX", "LIFE_INSURANCE", "HEALTH_INSURANCE"] as const
      )[i % 3];
      const id = await createLead(ctx, {
        customerId: contact,
        module: moduleKey,
        source: "DEMO",
        assignedTo: i === 0 ? undefined : users[2 + (i % 2)],
        tags: [`DEMO_${i}`],
      });
      if (i === 3 || i === 4) {
        const stage = await ctx.db.one<{ id: string }>(
          "select id from public.agency_pipeline_stages where organization_id=$1 and module=$2 and code=$3",
          [org, moduleKey, i === 3 ? "QUALIFIED" : "FOLLOW_UP_LATER"],
        );
        await moveLead(ctx, id, stage.id);
      }
      if (i > 0)
        await scheduleFollowUp(ctx, {
          leadId: id,
          requestKey: crypto.randomUUID(),
          title: "Call prospect and record outcome",
          dueAt: new Date(
            Date.now() + (i === 2 ? -3600000 : 86400000),
          ).toISOString(),
        });
    }
  });
  // Convert the last demo lead through the real employee workflow.
  await runAsMember(users[3], org, async (ctx) => {
    const lead = await ctx.db.maybeOne<{
      id: string;
      converted_at: Date | null;
    }>(
      `select id,converted_at from public.agency_leads where organization_id=$1 and 'DEMO_5'=any(tags)`,
      [org],
    );
    if (lead && !lead.converted_at) {
      const task = await ctx.db.one<{ id: string }>(
        "select id from public.tasks where agency_lead_id=$1",
        [lead.id],
      );
      await finishFollowUp(ctx, task.id, "CONTACTED");
      await convertLead(ctx, lead.id);
    }
  });
  console.log(
    "Fictional agency demo ready. Set demo passwords separately; no password was committed.",
  );
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Demo seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool().end();
  });
