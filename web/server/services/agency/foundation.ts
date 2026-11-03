import { z } from "zod";
import { DomainError, notFound } from "@/core/errors";
import {
  AGENCY_MODULES,
  DEFAULT_STAGES,
  contactSchema,
  followUpSchema,
  leadSchema,
  moduleConfigurationSchema,
  stageSchema,
} from "@/core/agency/modules";
import {
  actorUserId,
  requirePermission,
  requireUser,
  type ServiceContext,
} from "@/server/context";
import { logActivity, getActivityTimeline } from "../activity";
import { createTask, assignTask, loadTask, recordCheck } from "../tasks-core";
import { startTask, completeTask } from "../tasks";
import { notify } from "../notifications";
const uuid = z.string().uuid();

export async function configureModules(
  ctx: ServiceContext,
  raw: z.input<typeof moduleConfigurationSchema>,
) {
  requirePermission(ctx, "agency.configure");
  const { modules } = moduleConfigurationSchema.parse(raw);
  // Serialize configuration to prevent inconsistent first-stage setup.
  await ctx.db.query(
    "select id from public.organizations where id=$1 for update",
    [ctx.organizationId],
  );
  for (const moduleKey of AGENCY_MODULES) {
    await ctx.db.query(
      `insert into public.agency_modules(organization_id,module,enabled) values($1,$2,$3)
   on conflict(organization_id,module) do update set enabled=excluded.enabled`,
      [ctx.organizationId, moduleKey, modules.includes(moduleKey)],
    );
    if (modules.includes(moduleKey))
      for (const [position, code] of DEFAULT_STAGES.entries()) {
        await ctx.db.query(
          `insert into public.agency_pipeline_stages(organization_id,module,code,label,position,is_initial,is_terminal)
    values($1,$2,$3,$4,$5,$6,$7) on conflict(organization_id,module,code) do nothing`,
          [
            ctx.organizationId,
            moduleKey,
            code,
            code
              .toLowerCase()
              .replaceAll("_", " ")
              .replace(/^./, (c) => c.toUpperCase()),
            position,
            code === "NEW",
            code === "COMPLETED" || code === "LOST",
          ],
        );
      }
  }
  await logActivity(ctx, {
    action: "agency.configured",
    resourceType: "organization",
    resourceId: ctx.organizationId,
    summary: "Agency modules configured",
    metadata: { modules },
  });
}
export async function configureStage(
  ctx: ServiceContext,
  raw: z.input<typeof stageSchema>,
) {
  requirePermission(ctx, "agency.configure");
  const s = stageSchema.parse(raw);
  await ctx.db.query(
    `insert into public.agency_pipeline_stages(organization_id,module,code,label,position,is_initial,is_terminal)
 values($1,$2,$3,$4,$5,$6,$7) on conflict(organization_id,module,code) do update set label=excluded.label,position=excluded.position,is_terminal=excluded.is_terminal`,
    [
      ctx.organizationId,
      s.module,
      s.code,
      s.label,
      s.position,
      s.isInitial,
      s.isTerminal,
    ],
  );
  await logActivity(ctx, {
    action: "pipeline.configured",
    resourceType: "organization",
    resourceId: ctx.organizationId,
    summary: "Lead pipeline configured",
    metadata: { module: s.module, code: s.code },
  });
}
export async function createContact(
  ctx: ServiceContext,
  raw: z.input<typeof contactSchema>,
) {
  requirePermission(ctx, "agency.manage");
  const c = contactSchema.parse(raw);
  // Reuse an exact contact email within this tenant. Names alone never establish identity.
  if (c.email) {
    await ctx.db.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      `${ctx.organizationId}:${c.email.toLowerCase()}`,
    ]);
    const existing = await ctx.db.query<{ id: string }>(
      "select id from public.customers where organization_id=$1 and lower(email)=lower($2)",
      [ctx.organizationId, c.email],
    );
    if (existing.length > 1)
      throw new DomainError(
        "CONFLICT",
        "Select the existing contact; multiple contacts share this email",
      );
    if (existing[0]) return existing[0].id;
  }
  const cRow = await ctx.db.one<{ id: string }>(
    `insert into public.customers(organization_id,display_name,email,phone,created_by) values($1,$2,$3,$4,$5) returning id`,
    [
      ctx.organizationId,
      c.name,
      c.email ?? null,
      c.phone ?? null,
      actorUserId(ctx),
    ],
  );
  return cRow.id;
}
export async function loadLead(ctx: ServiceContext, id: string, lock = false) {
  const l = await ctx.db.maybeOne<{
    id: string;
    customer_id: string;
    assigned_to: string | null;
    module: string;
    stage_id: string;
    converted_at: Date | null;
    client_id: string | null;
  }>(
    `select id,customer_id,assigned_to,module,stage_id,converted_at,client_id from public.agency_leads where id=$1 and organization_id=$2 ${lock ? "for update" : ""}`,
    [uuid.parse(id), ctx.organizationId],
  );
  if (!l) throw notFound("Lead");
  return l;
}
export async function createLead(
  ctx: ServiceContext,
  raw: z.input<typeof leadSchema>,
) {
  requirePermission(ctx, "agency.manage");
  const i = leadSchema.parse(raw);
  const c = await ctx.db.maybeOne(
    "select id from public.customers where id=$1 and organization_id=$2",
    [i.customerId, ctx.organizationId],
  );
  if (!c) throw notFound("Contact");
  const stage = await ctx.db.maybeOne<{ id: string }>(
    `select id from public.agency_pipeline_stages where organization_id=$1 and module=$2 and is_initial`,
    [ctx.organizationId, i.module],
  );
  if (!stage)
    throw new DomainError(
      "VALIDATION_FAILED",
      "Enable and configure the module first",
    );
  const l = await ctx.db.one<{ id: string }>(
    `insert into public.agency_leads(organization_id,customer_id,module,stage_id,source,priority,assigned_to,notes,tags,created_by)
 values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
    [
      ctx.organizationId,
      i.customerId,
      i.module,
      stage.id,
      i.source,
      i.priority,
      i.assignedTo ?? null,
      i.notes,
      i.tags,
      actorUserId(ctx),
    ],
  );
  await logActivity(ctx, {
    action: "lead.created",
    resourceType: "agency_lead",
    resourceId: l.id,
    summary: "Lead captured",
    metadata: { module: i.module },
  });
  if (i.assignedTo) await recordAssignment(ctx, l.id, i.assignedTo);
  if (i.followUpAt) {
    if (!i.assignedTo)
      throw new DomainError(
        "VALIDATION_FAILED",
        "Assign the lead before scheduling follow-up",
      );
    await scheduleFollowUp(ctx, {
      leadId: l.id,
      requestKey: crypto.randomUUID(),
      dueAt: i.followUpAt,
    });
  }
  return l.id;
}
async function recordAssignment(
  ctx: ServiceContext,
  id: string,
  assignee: string,
) {
  await logActivity(ctx, {
    action: "lead.assigned",
    resourceType: "agency_lead",
    resourceId: id,
    summary: "Lead assigned",
    metadata: { assigneeId: assignee },
  });
  await notify(ctx, {
    recipientIds: [assignee],
    category: "TASK_ASSIGNED",
    title: "Lead assigned",
    resource: { type: "agency_lead", id },
    actionUrl: "/leads",
    excludeActor: false,
  });
}
export async function assignLead(
  ctx: ServiceContext,
  id: string,
  assignee: string,
) {
  requirePermission(ctx, "agency.assign");
  uuid.parse(assignee);
  const l = await loadLead(ctx, id, true);
  if (l.converted_at)
    throw new DomainError("CONFLICT", "Assign the converted client instead");
  if (l.assigned_to === assignee) return;
  await ctx.db.query(
    "update public.agency_leads set assigned_to=$3 where id=$1 and organization_id=$2",
    [id, ctx.organizationId, assignee],
  );
  const tasks = await ctx.db.query<{ id: string }>(
    `select id from public.tasks where organization_id=$1 and agency_lead_id=$2 and status not in ('COMPLETED','CANCELLED')`,
    [ctx.organizationId, id],
  );
  for (const t of tasks)
    await assignTask(ctx, t.id, assignee, "Lead reassigned");
  await recordAssignment(ctx, id, assignee);
}
export async function moveLead(
  ctx: ServiceContext,
  id: string,
  stageId: string,
) {
  requirePermission(ctx, "agency.work");
  uuid.parse(stageId);
  const l = await loadLead(ctx, id, true);
  if (l.converted_at)
    throw new DomainError("CONFLICT", "Lead already converted");
  const stage = await ctx.db.maybeOne(
    "select id from public.agency_pipeline_stages where id=$1 and organization_id=$2 and module=$3",
    [stageId, ctx.organizationId, l.module],
  );
  if (!stage) throw notFound("Pipeline stage");
  if (l.stage_id === stageId) return;
  await ctx.db.query(
    "update public.agency_leads set stage_id=$3 where id=$1 and organization_id=$2",
    [id, ctx.organizationId, stageId],
  );
  await logActivity(ctx, {
    action: "lead.stage_changed",
    resourceType: "agency_lead",
    resourceId: id,
    summary: "Lead pipeline stage changed",
    changes: { stageId: { from: l.stage_id, to: stageId } },
  });
}
export async function scheduleFollowUp(
  ctx: ServiceContext,
  raw: z.input<typeof followUpSchema>,
) {
  requirePermission(ctx, "agency.work");
  const i = followUpSchema.parse(raw);
  const l = await loadLead(ctx, i.leadId, true);
  if (l.converted_at)
    throw new DomainError("CONFLICT", "Lead already converted");
  if (!l.assigned_to)
    throw new DomainError("VALIDATION_FAILED", "Assign the lead first");
  const previous = await ctx.db.maybeOne<{
    id: string;
    agency_lead_id: string;
  }>(
    `select id,agency_lead_id from public.tasks where organization_id=$1 and agency_follow_up_key=$2`,
    [ctx.organizationId, i.requestKey],
  );
  if (previous) {
    if (previous.agency_lead_id !== i.leadId)
      throw new DomainError("CONFLICT", "Follow-up request already used");
    return previous.id;
  }
  // Existing task engine requires tasks.assign. Agency employees get only this narrow
  // create path for a lead they are assigned; the DB policy enforces the same restriction.
  const scoped = {
    ...ctx,
    permissions: new Set([...ctx.permissions, "tasks.assign" as const]),
  };
  const task = await createTask(scoped, {
    type: "AGENCY_FOLLOW_UP",
    agencyLeadId: i.leadId,
    agencyFollowUpKey: i.requestKey,
    assignedTo: l.assigned_to,
    dueAt: new Date(i.dueAt),
    title: i.title,
  });
  await ctx.db.query(
    `update public.agency_leads set next_follow_up_at=(select min(due_at) from public.tasks where organization_id=$2 and agency_lead_id=$1 and status not in ('COMPLETED','CANCELLED')) where id=$1 and organization_id=$2`,
    [i.leadId, ctx.organizationId],
  );
  await logActivity(ctx, {
    action: "follow_up.created",
    resourceType: "agency_lead",
    resourceId: i.leadId,
    summary: "Follow-up scheduled",
    metadata: { taskId: task.taskId, dueAt: i.dueAt },
  });
  return task.taskId;
}
export async function finishFollowUp(
  ctx: ServiceContext,
  taskId: string,
  outcome: "CONTACTED" | "NO_RESPONSE",
) {
  z.enum(["CONTACTED", "NO_RESPONSE"]).parse(outcome);
  const initial = await loadTask(ctx, uuid.parse(taskId));
  if (!initial.agency_lead_id)
    throw new DomainError("FORBIDDEN", "Not an agency follow-up");
  // Lock the lead before its task, matching reassignment and scheduling.
  const l = await loadLead(ctx, initial.agency_lead_id, true);
  const t = await loadTask(ctx, taskId, { forUpdate: true });
  const u = requireUser(ctx);
  if (!t.agency_lead_id || t.assigned_to !== u.actor.userId)
    throw new DomainError("FORBIDDEN", "Follow-up is not assigned to you");
  if (t.status === "COMPLETED") return { completed: true };
  if (l.converted_at)
    throw new DomainError("CONFLICT", "Lead already converted");
  if (t.status === "OPEN") await startTask(ctx, taskId);
  await recordCheck(ctx, t, "CONTACT_OUTCOME_RECORDED", {
    passed: true,
    value: outcome,
  });
  return completeTask(ctx, taskId);
}
export async function convertLead(ctx: ServiceContext, id: string) {
  requirePermission(ctx, "agency.work");
  uuid.parse(id);
  // Finish outstanding work before conversion, so no orphaned follow-up queue remains.
  const l = await loadLead(ctx, id, true);
  if (l.client_id) return l.client_id;
  const pending = await ctx.db.one<{ n: number }>(
    `select count(*)::int n from public.tasks where organization_id=$1 and agency_lead_id=$2 and status not in ('COMPLETED','CANCELLED')`,
    [ctx.organizationId, id],
  );
  if (pending.n)
    throw new DomainError(
      "GUARD_FAILED",
      "Complete outstanding follow-ups before conversion",
    );
  const row = await ctx.db.one<{ id: string }>(
    "select app.convert_agency_lead($1,$2) id",
    [ctx.organizationId, id],
  );
  return row.id;
}
export async function assignClient(
  ctx: ServiceContext,
  clientId: string,
  userId: string,
  active = true,
) {
  requirePermission(ctx, "agency.assign");
  uuid.parse(clientId);
  uuid.parse(userId);
  z.boolean().parse(active);
  await ctx.db.query(
    `insert into public.agency_client_assignments(organization_id,client_id,user_id,assigned_by,active) values($1,$2,$3,$4,$5)
 on conflict(organization_id,client_id,user_id) do update set active=excluded.active,assigned_by=excluded.assigned_by,assigned_at=now()`,
    [ctx.organizationId, clientId, userId, actorUserId(ctx), active],
  );
  await logActivity(ctx, {
    action: active ? "client.assigned" : "client.unassigned",
    resourceType: "agency_client",
    resourceId: clientId,
    summary: active ? "Client assigned" : "Client assignment revoked",
    metadata: { assigneeId: userId },
  });
}
export async function leadTimeline(ctx: ServiceContext, id: string) {
  await loadLead(ctx, id);
  return getActivityTimeline(ctx, {
    resourceType: "agency_lead",
    resourceId: id,
  });
}
export async function clientTimeline(ctx: ServiceContext, clientId: string) {
  const client = await ctx.db.maybeOne(
    "select id from public.agency_client_profiles where id=$1 and organization_id=$2",
    [uuid.parse(clientId), ctx.organizationId],
  );
  if (!client) throw notFound("Client");
  const leads = await ctx.db.query<{ id: string }>(
    "select id from public.agency_leads where client_id=$1 and organization_id=$2",
    [clientId, ctx.organizationId],
  );
  const timeline = await getActivityTimeline(ctx, {
    resourceType: "agency_client",
    resourceId: clientId,
  });
  for (const l of leads)
    timeline.push(
      ...(await getActivityTimeline(ctx, {
        resourceType: "agency_lead",
        resourceId: l.id,
      })),
    );
  return timeline
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 100);
}
