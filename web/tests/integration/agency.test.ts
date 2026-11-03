import { afterAll, beforeAll, expect, it } from "vitest";
import { closeDatabase, describeDb, freshDatabase, ids } from "../helpers/db";
import { runAsMember, runAsSystem } from "@/server/context";
import { withUserTransaction } from "@/server/db/client";
import * as a from "@/server/services/agency/foundation";
import { getAgencyWorkspace } from "@/server/services/agency/workspace";
import { completeTask, createManualTask } from "@/server/services/tasks";
const owner = <T>(fn: Parameters<typeof runAsMember<T>>[2]) =>
  runAsMember(ids.owner, ids.org, fn);
const employee = <T>(fn: Parameters<typeof runAsMember<T>>[2]) =>
  runAsMember(ids.emp1, ids.org, fn);
let lead: string,
  otherLead: string,
  contact: string,
  followUp: string,
  stage: string,
  foreignStage: string,
  client: string;
describeDb("agency foundation and RLS", () => {
  beforeAll(async () => {
    await freshDatabase();
    await owner((ctx) =>
      a.configureModules(ctx, {
        modules: ["TAX", "LIFE_INSURANCE", "HEALTH_INSURANCE"],
      }),
    );
    await runAsMember(ids.otherOwner, ids.orgB, (ctx) =>
      a.configureModules(ctx, { modules: ["TAX"] }),
    );
    contact = await owner((ctx) =>
      a.createContact(ctx, {
        name: "Sample Prospect 01",
        email: "prospect01@example.test",
      }),
    );
    lead = await owner((ctx) =>
      a.createLead(ctx, {
        customerId: contact,
        module: "TAX",
        assignedTo: ids.emp1,
      }),
    );
    otherLead = await owner(async (ctx) =>
      a.createLead(ctx, {
        customerId: await a.createContact(ctx, { name: "Sample Prospect 02" }),
        module: "HEALTH_INSURANCE",
        assignedTo: ids.emp2,
      }),
    );
    stage = (
      await owner((ctx) =>
        ctx.db.one<{ id: string }>(
          `select id from public.agency_pipeline_stages where organization_id=$1 and module='TAX' and code='QUALIFIED'`,
          [ids.org],
        ),
      )
    ).id;
    foreignStage = (
      await runAsMember(ids.otherOwner, ids.orgB, (ctx) =>
        ctx.db.one<{ id: string }>(
          `select id from public.agency_pipeline_stages where organization_id=$1 and code='QUALIFIED'`,
          [ids.orgB],
        ),
      )
    ).id;
  });
  afterAll(closeDatabase);
  it("module configuration creates independent modules and default stages", async () => {
    const w = await owner(getAgencyWorkspace);
    expect(w.modules).toEqual(["HEALTH_INSURANCE", "LIFE_INSURANCE", "TAX"]);
    expect(w.stages).toHaveLength(39);
    await expect(
      employee((ctx) => a.configureModules(ctx, { modules: ["TAX"] })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      runAsMember(ids.manager, ids.org, (ctx) =>
        a.configureModules(ctx, { modules: ["TAX"] }),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("owner and manager see organization-wide leads; employee sees only assigned contacts", async () => {
    expect((await owner(getAgencyWorkspace)).leads).toHaveLength(2);
    expect(
      (await runAsMember(ids.manager, ids.org, getAgencyWorkspace)).leads,
    ).toHaveLength(2);
    const w = await employee(getAgencyWorkspace);
    expect(w.leads.map((l) => l.id)).toEqual([lead]);
    expect(w.contacts).toEqual([]);
    const records = await withUserTransaction(ids.emp1, (db) =>
      db.query<{ id: string }>(`select id from public.customers`),
    );
    expect(records.map((c) => c.id)).toEqual([contact]);
  });
  it("denies cross-tenant reads and membership escalation", async () => {
    expect(
      (await runAsMember(ids.otherOwner, ids.orgB, getAgencyWorkspace)).leads,
    ).toHaveLength(0);
    await expect(
      runAsMember(ids.otherOwner, ids.orgB, (ctx) => a.loadLead(ctx, lead)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      runAsMember(ids.emp1, ids.orgB, getAgencyWorkspace),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("reuses exact email identity and preserves separate interests", async () => {
    expect(
      await owner((ctx) =>
        a.createContact(ctx, {
          name: "Alternate entered name",
          email: "PROSPECT01@example.test",
        }),
      ),
    ).toBe(contact);
    await expect(
      employee((ctx) => a.createContact(ctx, { name: "Not allowed" })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects foreign-tenant contact and assignment references", async () => {
    const foreignContact = await runAsMember(ids.otherOwner, ids.orgB, (ctx) =>
      a.createContact(ctx, { name: "Other Tenant Prospect" }),
    );
    await expect(
      owner((ctx) =>
        a.createLead(ctx, { customerId: foreignContact, module: "TAX" }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      owner((ctx) => a.assignLead(ctx, lead, ids.otherEmp)),
    ).rejects.toBeDefined();
    await expect(
      employee((ctx) => a.assignLead(ctx, lead, ids.emp2)),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("moves pipeline by configured stage ID and rejects unrelated stages", async () => {
    await employee((ctx) => a.moveLead(ctx, lead, stage));
    expect((await employee(getAgencyWorkspace)).leads[0].stageId).toBe(stage);
    await expect(
      employee((ctx) => a.moveLead(ctx, lead, foreignStage)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      employee((ctx) => a.moveLead(ctx, otherLead, stage)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const wrongModule = (await owner(getAgencyWorkspace)).stages.find(
      (s) => s.module === "LIFE_INSURANCE",
    )!.id;
    await expect(
      owner((ctx) => a.moveLead(ctx, lead, wrongModule)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("custom pipeline labels/stages work without hardcoded stage logic", async () => {
    await owner((ctx) =>
      a.configureStage(ctx, {
        module: "TAX",
        code: "CONSULTATION_REVIEW",
        label: "Consultation review",
        position: 14,
      }),
    );
    const custom = (await employee(getAgencyWorkspace)).stages.find(
      (s) => s.code === "CONSULTATION_REVIEW",
    )!;
    await employee((ctx) => a.moveLead(ctx, lead, custom.id));
    expect((await employee(getAgencyWorkspace)).leads[0].stageId).toBe(
      custom.id,
    );
  });
  it("employee schedules an idempotent follow-up using the existing task engine", async () => {
    const input = {
      leadId: lead,
      requestKey: crypto.randomUUID(),
      dueAt: new Date(Date.now() - 3600000).toISOString(),
      title: "Call new lead",
    };
    followUp = await employee((ctx) => a.scheduleFollowUp(ctx, input));
    expect(await employee((ctx) => a.scheduleFollowUp(ctx, input))).toBe(
      followUp,
    );
    const w = await employee(getAgencyWorkspace);
    expect(w.tasks[0]).toMatchObject({
      id: followUp,
      leadId: lead,
      overdue: true,
      assignedTo: ids.emp1,
    });
    expect(w.metrics.overdueFollowUps).toBe(1);
    await expect(
      employee((ctx) =>
        a.scheduleFollowUp(ctx, {
          ...input,
          leadId: otherLead,
          requestKey: crypto.randomUUID(),
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      employee((ctx) =>
        createManualTask(ctx, { type: "GENERIC", title: "Arbitrary task" }),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("completion requires a recorded outcome; conversion waits for unfinished follow-ups", async () => {
    await expect(
      employee((ctx) => a.convertLead(ctx, lead)),
    ).rejects.toMatchObject({ code: "GUARD_FAILED" });
    const result = await employee((ctx) => completeTask(ctx, followUp));
    expect(result.completed).toBe(false);
    await expect(
      runAsMember(ids.emp2, ids.org, (ctx) =>
        a.finishFollowUp(ctx, followUp, "CONTACTED"),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(
      (await employee((ctx) => a.finishFollowUp(ctx, followUp, "CONTACTED")))
        .completed,
    ).toBe(true);
    const w = await employee(getAgencyWorkspace);
    expect(w.tasks[0].status).toBe("COMPLETED");
    expect(w.leads[0].lastContactAt).not.toBeNull();
    expect(w.leads[0].nextFollowUpAt).toBeNull();
  });
  it("records next follow-up and preserves workflow on reassignment", async () => {
    const task = await employee((ctx) =>
      a.scheduleFollowUp(ctx, {
        leadId: lead,
        requestKey: crypto.randomUUID(),
        dueAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    );
    await runAsMember(ids.manager, ids.org, (ctx) =>
      a.assignLead(ctx, lead, ids.emp2),
    );
    expect((await employee(getAgencyWorkspace)).tasks).toHaveLength(0);
    const w = await runAsMember(ids.emp2, ids.org, getAgencyWorkspace);
    expect(w.tasks.find((t) => t.id === task)?.assignedTo).toBe(ids.emp2);
    await runAsMember(ids.emp2, ids.org, (ctx) =>
      a.finishFollowUp(ctx, task, "NO_RESPONSE"),
    );
    await owner((ctx) => a.assignLead(ctx, lead, ids.emp1));
  });
  it("conversion preserves contact, lead, assignment and is repeat-safe", async () => {
    client = await employee((ctx) => a.convertLead(ctx, lead));
    expect(await employee((ctx) => a.convertLead(ctx, lead))).toBe(client);
    const w = await employee(getAgencyWorkspace);
    expect(w.clients).toHaveLength(1);
    expect(w.clients[0]).toMatchObject({
      id: client,
      customerId: contact,
      assignedTo: [ids.emp1],
    });
    expect(w.leads[0].convertedAt).not.toBeNull();
    const count = await owner((ctx) =>
      ctx.db.one<{ n: number }>(
        `select count(*)::int n from public.agency_client_profiles where organization_id=$1 and customer_id=$2`,
        [ids.org, contact],
      ),
    );
    expect(count.n).toBe(1);
    await expect(
      employee((ctx) => a.moveLead(ctx, lead, stage)),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("client assignment can be granted/revoked without broad customer access", async () => {
    await expect(
      runAsMember(ids.emp2, ids.org, (ctx) =>
        a.assignClient(ctx, client, ids.emp2),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await owner((ctx) => a.assignClient(ctx, client, ids.emp2));
    expect(
      (await runAsMember(ids.emp2, ids.org, getAgencyWorkspace)).clients,
    ).toHaveLength(1);
    await owner((ctx) => a.assignClient(ctx, client, ids.emp2, false));
    expect(
      (await runAsMember(ids.emp2, ids.org, getAgencyWorkspace)).clients,
    ).toHaveLength(0);
  });
  it("timeline contains meaningful events without contact PII and is append-only", async () => {
    const timeline = await employee((ctx) => a.leadTimeline(ctx, lead));
    for (const action of [
      "lead.created",
      "lead.assigned",
      "lead.stage_changed",
      "follow_up.created",
      "follow_up.completed",
      "lead.converted",
    ])
      expect(timeline.some((t) => t.action === action)).toBe(true);
    expect(timeline.filter((t) => t.action === "lead.converted")).toHaveLength(
      1,
    );
    expect(JSON.stringify(timeline)).not.toContain("prospect01@example.test");
    expect(
      await owner((ctx) =>
        ctx.db.query(
          "update public.activity_logs set summary=$1 where organization_id=$2 returning id",
          ["forged", ids.org],
        ),
      ),
    ).toHaveLength(0);
    await expect(
      runAsSystem(ids.org, "test", (ctx) =>
        ctx.db.query(
          "update public.activity_logs set summary=$1 where organization_id=$2",
          ["forged", ids.org],
        ),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("raw server-role writes cannot bypass assignment, stage FK or conversion", async () => {
    await expect(
      withUserTransaction(ids.emp1, (db) =>
        db.query("update public.agency_leads set assigned_to=$1 where id=$2", [
          ids.emp2,
          lead,
        ]),
      ),
    ).rejects.toBeDefined();
    await expect(
      withUserTransaction(ids.owner, (db) =>
        db.query("update public.agency_leads set stage_id=$1 where id=$2", [
          foreignStage,
          otherLead,
        ]),
      ),
    ).rejects.toBeDefined();
    await expect(
      withUserTransaction(ids.emp2, (db) =>
        db.query(
          "update public.agency_leads set client_id=$1,converted_at=now() where id=$2",
          [client, otherLead],
        ),
      ),
    ).rejects.toBeDefined();
  });
  it("browser is read-only; platform admin has no agency operational access", async () => {
    const result = await runAsSystem(ids.org, "test", async (ctx) => {
      const tables = await ctx.db.query<{
        relname: string;
        relrowsecurity: boolean;
      }>(
        `select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname like 'agency_%' and relkind='r'`,
      );
      const grants = await ctx.db.one<{ can_insert: boolean }>(
        `select has_table_privilege('authenticated','public.agency_leads','INSERT') can_insert`,
      );
      return { tables, grants };
    });
    expect(result.tables).toHaveLength(5);
    expect(result.tables.every((t) => t.relrowsecurity)).toBe(true);
    expect(result.grants.can_insert).toBe(false);
    const conversionGrant = await runAsSystem(ids.org, "test", (ctx) =>
      ctx.db.one<{ allowed: boolean }>(
        `select has_function_privilege('authenticated','app.convert_agency_lead(uuid,uuid)','EXECUTE') allowed`,
      ),
    );
    expect(conversionGrant.allowed).toBe(false);
    const admin = "a0000000-0000-4000-8000-000000000001";
    expect(
      await withUserTransaction(admin, (db) =>
        db.query("select id from public.agency_leads"),
      ),
    ).toHaveLength(0);
  });
  it("browser RLS isolates tenant and employee assignments, with no mutation grants", async () => {
    const browser = async (user: string) =>
      runAsSystem(ids.org, "test", async (ctx) => {
        await ctx.db.query(
          `select set_config('request.jwt.claims',$1,true), set_config('request.jwt.claim.sub',$2,true)`,
          [JSON.stringify({ sub: user }), user],
        );
        await ctx.db.query("set local role authenticated");
        return ctx.db.query<{ id: string }>(
          "select id from public.agency_leads",
        );
      });
    expect((await browser(ids.emp1)).map((l) => l.id)).toEqual([lead]);
    expect(await browser(ids.otherEmp)).toHaveLength(0);
    await expect(
      runAsSystem(ids.org, "test", async (ctx) => {
        await ctx.db.query(
          `select set_config('request.jwt.claims',$1,true), set_config('request.jwt.claim.sub',$2,true)`,
          [JSON.stringify({ sub: ids.owner }), ids.owner],
        );
        await ctx.db.query("set local role authenticated");
        await ctx.db.query("update public.agency_leads set notes=notes");
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("concurrent conversion returns one client and one conversion event", async () => {
    const id = await owner((ctx) =>
      a.createLead(ctx, {
        customerId: contact,
        module: "LIFE_INSURANCE",
        assignedTo: ids.emp1,
      }),
    );
    const converted = await Promise.all([
      employee((ctx) => a.convertLead(ctx, id)),
      employee((ctx) => a.convertLead(ctx, id)),
    ]);
    expect(new Set(converted).size).toBe(1);
    expect(converted[0]).toBe(client);
    expect(
      (await employee((ctx) => a.leadTimeline(ctx, id))).filter(
        (e) => e.action === "lead.converted",
      ),
    ).toHaveLength(1);
  });
  it("revoked client access removes converted leads and their shared contact", async () => {
    await owner((ctx) => a.assignClient(ctx, client, ids.emp1, false));
    expect((await employee(getAgencyWorkspace)).clients).toHaveLength(0);
    expect((await employee(getAgencyWorkspace)).leads).toHaveLength(0);
    expect(
      await withUserTransaction(ids.emp1, (db) =>
        db.query("select id from public.customers where id=$1", [contact]),
      ),
    ).toHaveLength(0);
    await owner((ctx) => a.assignClient(ctx, client, ids.emp1));
  });
  it("disabled modules reject new leads and hide their lead queues", async () => {
    await owner((ctx) =>
      a.configureModules(ctx, { modules: ["LIFE_INSURANCE"] }),
    );
    await expect(
      owner((ctx) => a.createLead(ctx, { customerId: contact, module: "TAX" })),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(
      (await owner(getAgencyWorkspace)).leads.every(
        (l) => l.module === "LIFE_INSURANCE",
      ),
    ).toBe(true);
  });
});
