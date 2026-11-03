import type { AgencyModule } from "@/core/agency/modules";
import { requirePermission, type ServiceContext } from "@/server/context";
import type {
  AgencySnapshot,
  AgencyLead,
  AgencyStage,
  AgencyClient,
  AgencyTask,
} from "@/server/adapters/agency";
import { getNotifications } from "../notifications";
import { iso } from "@/server/adapters/agency";
export async function getAgencyWorkspace(
  ctx: ServiceContext,
): Promise<AgencySnapshot> {
  requirePermission(ctx, "agency.work");
  const modules = (
    await ctx.db.query<{ module: AgencyModule }>(
      "select module from public.agency_modules where organization_id=$1 and enabled order by module",
      [ctx.organizationId],
    )
  ).map((m) => m.module);
  const stages = await ctx.db.query<AgencyStage>(
    `select id,module,code,label,position,is_terminal as "isTerminal" from public.agency_pipeline_stages where organization_id=$1 order by position,id`,
    [ctx.organizationId],
  );
  const leadRows = await ctx.db.query<{
    id: string;
    customer_id: string;
    display_name: string;
    email: string | null;
    phone: string | null;
    module: AgencyModule;
    stage_id: string;
    source: string;
    priority: string;
    assigned_to: string | null;
    created_at: Date;
    last_contact_at: Date | null;
    next_follow_up_at: Date | null;
    converted_at: Date | null;
    client_id: string | null;
    notes: string;
    tags: string[];
  }>(
    `select l.*,c.display_name,c.email,c.phone from public.agency_leads l join public.customers c on c.id=l.customer_id and c.organization_id=l.organization_id where l.organization_id=$1 order by l.created_at desc,l.id`,
    [ctx.organizationId],
  );
  const leads: AgencyLead[] = leadRows.map((l) => ({
    id: l.id,
    customerId: l.customer_id,
    name: l.display_name,
    email: l.email,
    phone: l.phone,
    module: l.module,
    stageId: l.stage_id,
    source: l.source,
    priority: l.priority,
    assignedTo: l.assigned_to,
    createdAt: iso(l.created_at)!,
    lastContactAt: iso(l.last_contact_at),
    nextFollowUpAt: iso(l.next_follow_up_at),
    convertedAt: iso(l.converted_at),
    clientId: l.client_id,
    notes: l.notes,
    tags: l.tags,
  }));
  const clients = await ctx.db.query<AgencyClient>(
    `select p.id,p.customer_id as "customerId",c.display_name as name,c.email,c.phone,p.status,
 array(select distinct l.module from public.agency_leads l where l.client_id=p.id and l.organization_id=p.organization_id) as modules,
 array(select a.user_id from public.agency_client_assignments a where a.client_id=p.id and a.organization_id=p.organization_id and a.active) as "assignedTo"
 from public.agency_client_profiles p join public.customers c on c.id=p.customer_id and c.organization_id=p.organization_id where p.organization_id=$1 order by p.created_at desc`,
    [ctx.organizationId],
  );
  const taskRows = await ctx.db.query<{
    id: string;
    lead_id: string;
    title: string;
    status: string;
    due_at: Date | null;
    assigned_to: string | null;
  }>(
    `select id,agency_lead_id as lead_id,title,status,due_at,assigned_to from public.tasks where organization_id=$1 and agency_lead_id is not null order by due_at nulls last,id`,
    [ctx.organizationId],
  );
  const now = ctx.now();
  const tasks: AgencyTask[] = taskRows.map((t) => ({
    id: t.id,
    leadId: t.lead_id,
    title: t.title,
    status: t.status,
    dueAt: iso(t.due_at),
    assignedTo: t.assigned_to,
    overdue:
      !!t.due_at &&
      t.due_at < now &&
      !["COMPLETED", "CANCELLED"].includes(t.status),
  }));
  const team = ctx.permissions.has("agency.assign")
    ? await ctx.db.query<{ id: string; name: string }>(
        `select m.user_id as id,coalesce(p.display_name,p.full_name,'Team member') as name from public.organization_members m join public.profiles p on p.id=m.user_id where m.organization_id=$1 and m.status='ACTIVE' order by name`,
        [ctx.organizationId],
      )
    : [];
  const contacts = ctx.permissions.has("agency.manage")
    ? await ctx.db.query<{ id: string; name: string; email: string | null }>(
        `select id,display_name as name,email from public.customers where organization_id=$1 order by display_name`,
        [ctx.organizationId],
      )
    : [];
  const day = await ctx.db.one<{ start: Date }>(
    `select date_trunc('day', $2::timestamptz at time zone timezone) at time zone timezone as start from public.organizations where id=$1`,
    [ctx.organizationId, now],
  );
  return {
    notifications: await getNotifications(ctx),
    modules,
    stages,
    leads,
    clients,
    tasks,
    team,
    contacts,
    metrics: {
      newLeads: leads.filter(
        (l) => new Date(l.createdAt) >= day.start && !l.convertedAt,
      ).length,
      waitingFollowUp: leads.filter(
        (l) =>
          !l.convertedAt &&
          l.nextFollowUpAt &&
          !stages.find((s) => s.id === l.stageId)?.isTerminal,
      ).length,
      overdueFollowUps: tasks.filter((t) => t.overdue).length,
      activeClients: clients.filter((c) => c.status === "ACTIVE").length,
      tasksDue: tasks.filter(
        (t) =>
          !["COMPLETED", "CANCELLED"].includes(t.status) &&
          t.dueAt &&
          new Date(t.dueAt) <= now,
      ).length,
    },
  };
}
