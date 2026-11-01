/**
 * Organization membership queries (owner/manager views) and the caller's own
 * organizations (org switcher).
 */
import { requirePermission, type ServiceContext } from "../context";
import { withUserTransaction } from "../db/client";

export interface MyOrganization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

/** Organizations the signed-in user belongs to. RLS returns nothing else. */
export async function getMyOrganizations(userId: string): Promise<MyOrganization[]> {
  return withUserTransaction(userId, async (db) => {
    const rows = await db.query<{ id: string; name: string; slug: string; role: string }>(
      `select o.id, o.name, o.slug, m.role
         from public.organization_members m join public.organizations o on o.id = m.organization_id
        where m.user_id = $1 and m.status = 'ACTIVE' and o.status = 'ACTIVE'
        order by o.name`,
      [userId],
    );
    return rows;
  });
}

export interface EmployeeView {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  title: string | null;
  status: string;
  openTasks: number;
  overdueTasks: number;
}

export async function getEmployees(ctx: ServiceContext): Promise<EmployeeView[]> {
  requirePermission(ctx, "members.read");
  const rows = await ctx.db.query<Record<string, unknown>>(
    `select m.user_id, coalesce(p.display_name, p.full_name) as name, p.email, m.role, m.title, m.status,
            (select count(*)::int from public.tasks t where t.assigned_to = m.user_id and t.organization_id = m.organization_id and t.status in ('OPEN','IN_PROGRESS','BLOCKED')) as open_tasks,
            (select count(*)::int from public.tasks t where t.assigned_to = m.user_id and t.organization_id = m.organization_id and t.status in ('OPEN','IN_PROGRESS','BLOCKED') and t.due_at < now()) as overdue_tasks
       from public.organization_members m join public.profiles p on p.id = m.user_id
      where m.organization_id = $1
      order by case m.role when 'OWNER' then 0 when 'MANAGER' then 1 else 2 end, name`,
    [ctx.organizationId],
  );
  return rows.map((r) => ({
    userId: r.user_id as string,
    name: (r.name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    role: r.role as string,
    title: (r.title as string | null) ?? null,
    status: r.status as string,
    openTasks: r.open_tasks as number,
    overdueTasks: r.overdue_tasks as number,
  }));
}
