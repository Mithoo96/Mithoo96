-- ============================================================================
-- Row Level Security for operational tables + column guards + grants.
--
-- Roles:
--   authenticated  — Supabase browser sessions (PostgREST/Realtime): SELECT only.
--   mbos_app       — server-side user requests: SELECT/INSERT/UPDATE scoped by RLS.
--   anon           — nothing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

-- Does the current user hold a live (non-cancelled) task on this order?
create or replace function app.has_task_on_order(target_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
    where t.order_id = target_order
      and t.assigned_to = app.current_user_id()
      and t.status <> 'CANCELLED'
      and app.is_member(t.organization_id)
  )
$$;

create or replace function app.can_read_order(org uuid, target_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.has_permission(org, 'orders.read_all') or app.has_task_on_order(target_order)
$$;

create or replace function app.can_read_shipment_data(org uuid, target_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.has_permission(org, 'shipments.read_all') or app.has_task_on_order(target_order)
$$;

-- Column guard: callers without TG_ARGV[0] permission may only change the
-- columns listed in TG_ARGV[1..]. System context (no user) is not restricted.
create or replace function app.guard_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  perm text := tg_argv[0];
  allowed text[] := tg_argv[1:];
  old_rest jsonb;
  new_rest jsonb;
  col text;
begin
  if app.current_user_id() is null or app.has_permission(new.organization_id, perm) then
    return new;
  end if;
  old_rest := to_jsonb(old);
  new_rest := to_jsonb(new);
  -- Stored generated columns are not yet computed in BEFORE triggers; ignore them.
  allowed := allowed || array['updated_at'] || coalesce((
    select array_agg(a.attname::text) from pg_catalog.pg_attribute a
     where a.attrelid = tg_relid and a.attgenerated <> '' and not a.attisdropped
  ), array[]::text[]);
  foreach col in array allowed loop
    old_rest := old_rest - col;
    new_rest := new_rest - col;
  end loop;
  if old_rest is distinct from new_rest then
    raise exception 'Insufficient permission to modify these % columns', tg_table_name
      using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger orders_guard_columns before update on public.orders
  for each row execute function app.guard_columns(
    'orders.write', 'status', 'status_changed_at', 'verified_at', 'ready_to_ship_at',
    'shipped_at', 'delivered_at', 'cancelled_at', 'exception_state', 'risk_level');

create trigger shipments_guard_columns before update on public.shipments
  for each row execute function app.guard_columns(
    'shipments.write', 'status', 'verification_status', 'verification_checks', 'verified_at', 'verified_by');

create trigger shipping_labels_guard_columns before update on public.shipping_labels
  for each row execute function app.guard_columns(
    'shipments.write', 'status', 'retrieved_at', 'retrieved_by', 'printed_at', 'printed_by');

create trigger tasks_guard_columns before update on public.tasks
  for each row execute function app.guard_columns(
    'tasks.assign', 'status', 'started_at', 'completed_at', 'completed_by', 'checks_state',
    'verification_status');

create trigger exceptions_guard_columns before update on public.exceptions
  for each row execute function app.guard_columns(
    'exceptions.resolve', 'status', 'acknowledged_at', 'acknowledged_by');

create trigger order_evidence_guard_columns before update on public.order_evidence
  for each row execute function app.guard_columns('evidence.review');

-- Non-resolvers can never close an exception (system rules still can).
create or replace function app.guard_exception_resolution()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.current_user_id() is not null
     and new.status in ('RESOLVED', 'DISMISSED')
     and old.status not in ('RESOLVED', 'DISMISSED')
     and not app.has_permission(new.organization_id, 'exceptions.resolve') then
    raise exception 'Insufficient permission to resolve exceptions' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger exceptions_guard_resolution before update on public.exceptions
  for each row execute function app.guard_exception_resolution();

-- Employees may claim an unassigned pool task. Narrow SECURITY DEFINER
-- operation instead of opening UPDATE on unassigned tasks to everyone.
create or replace function app.claim_task(target_task uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := app.current_user_id();
  t record;
  allow_claim boolean;
begin
  if me is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into t from public.tasks where id = target_task for update;
  if not found or not app.has_permission(t.organization_id, 'tasks.work') then
    return false;
  end if;

  select coalesce(
           (select s.value from public.system_settings s where s.organization_id = t.organization_id and s.key = 'tasks.allow_self_claim'),
           (select s.value from public.system_settings s where s.organization_id is null and s.key = 'tasks.allow_self_claim'),
           'false'::jsonb
         )::text::boolean
    into allow_claim;
  if not allow_claim then
    return false;
  end if;

  if t.assigned_to is not null or t.status <> 'OPEN' then
    return false;
  end if;

  update public.tasks set assigned_to = me, assigned_at = now() where id = target_task;
  insert into public.task_assignments (organization_id, task_id, assigned_to, assigned_by, reason)
  values (t.organization_id, target_task, me, me, 'SELF_CLAIM');
  insert into public.activity_logs (organization_id, actor_type, actor_id, action, resource_type, resource_id, order_id, summary)
  values (t.organization_id, 'USER', me, 'task.claimed', 'task', target_task, t.order_id, format('Claimed task "%s"', t.title));
  return true;
end
$$;
revoke all on function app.claim_task(uuid) from public;
grant execute on function app.claim_task(uuid) to mbos_app;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.products enable row level security;
alter table public.integration_connections enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments enable row level security;
alter table public.shipping_labels enable row level security;
alter table public.tracking_events enable row level security;
alter table public.exceptions enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.approvals enable row level security;
alter table public.order_evidence enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.employee_actions enable row level security;
alter table public.integration_events enable row level security;
alter table public.system_settings enable row level security;

-- Customers (PII) — employees never see customer records.
create policy customers_select on public.customers for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'customers.read'));
create policy customers_write on public.customers for all to mbos_app
  using (app.has_permission(organization_id, 'orders.write'))
  with check (app.has_permission(organization_id, 'orders.write'));

create policy customer_addresses_select on public.customer_addresses for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'customers.read'));
create policy customer_addresses_write on public.customer_addresses for all to mbos_app
  using (app.has_permission(organization_id, 'orders.write'))
  with check (app.has_permission(organization_id, 'orders.write'));

-- Products — every member can read (employees need bin locations).
create policy products_select on public.products for select to authenticated, mbos_app
  using (app.is_member(organization_id));
create policy products_write on public.products for all to mbos_app
  using (app.has_permission(organization_id, 'products.write'))
  with check (app.has_permission(organization_id, 'products.write'));

-- Integration connections
create policy integration_connections_select on public.integration_connections for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'integrations.read'));
create policy integration_connections_write on public.integration_connections for all to mbos_app
  using (app.has_permission(organization_id, 'integrations.manage'))
  with check (app.has_permission(organization_id, 'integrations.manage'));

-- Orders — managers see everything; employees only orders they have a task on.
create policy orders_select on public.orders for select to authenticated, mbos_app
  using (app.can_read_order(organization_id, id));
create policy orders_insert on public.orders for insert to mbos_app
  with check (app.has_permission(organization_id, 'orders.write'));
create policy orders_update on public.orders for update to mbos_app
  using (app.has_permission(organization_id, 'orders.transition') or app.has_task_on_order(id))
  with check (app.has_permission(organization_id, 'orders.transition') or app.has_task_on_order(id));

create policy order_items_select on public.order_items for select to authenticated, mbos_app
  using (app.can_read_order(organization_id, order_id));
create policy order_items_write on public.order_items for all to mbos_app
  using (app.has_permission(organization_id, 'orders.write'))
  with check (app.has_permission(organization_id, 'orders.write'));

-- Shipments / labels / tracking
create policy shipments_select on public.shipments for select to authenticated, mbos_app
  using (app.can_read_shipment_data(organization_id, order_id));
create policy shipments_insert on public.shipments for insert to mbos_app
  with check (app.has_permission(organization_id, 'shipments.write'));
create policy shipments_update on public.shipments for update to mbos_app
  using (app.has_permission(organization_id, 'shipments.write') or app.has_task_on_order(order_id))
  with check (app.has_permission(organization_id, 'shipments.write') or app.has_task_on_order(order_id));

create policy shipping_labels_select on public.shipping_labels for select to authenticated, mbos_app
  using (app.can_read_shipment_data(organization_id, order_id));
create policy shipping_labels_insert on public.shipping_labels for insert to mbos_app
  with check (app.has_permission(organization_id, 'shipments.write'));
create policy shipping_labels_update on public.shipping_labels for update to mbos_app
  using (app.has_permission(organization_id, 'shipments.write') or app.has_task_on_order(order_id))
  with check (app.has_permission(organization_id, 'shipments.write') or app.has_task_on_order(order_id));

create policy tracking_events_select on public.tracking_events for select to authenticated, mbos_app
  using (
    app.has_permission(organization_id, 'shipments.read_all')
    or exists (select 1 from public.shipments s where s.id = shipment_id and app.has_task_on_order(s.order_id))
  );
create policy tracking_events_insert on public.tracking_events for insert to mbos_app
  with check (app.has_permission(organization_id, 'shipments.write') and source = 'MANUAL' and created_by = app.current_user_id());

-- Exceptions
create policy exceptions_select on public.exceptions for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'exceptions.read') or assigned_to = app.current_user_id());
create policy exceptions_insert on public.exceptions for insert to mbos_app
  with check (
    app.has_permission(organization_id, 'exceptions.resolve')
    or (app.has_permission(organization_id, 'exceptions.report') and created_by = app.current_user_id()
        and (order_id is null or app.can_read_order(organization_id, order_id)))
  );
create policy exceptions_update on public.exceptions for update to mbos_app
  using (app.has_permission(organization_id, 'exceptions.resolve') or assigned_to = app.current_user_id())
  with check (app.has_permission(organization_id, 'exceptions.resolve') or assigned_to = app.current_user_id());

-- Tasks
create policy tasks_select on public.tasks for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'tasks.read_all') or assigned_to = app.current_user_id());
create policy tasks_insert on public.tasks for insert to mbos_app
  with check (app.has_permission(organization_id, 'tasks.assign'));
create policy tasks_update on public.tasks for update to mbos_app
  using (app.has_permission(organization_id, 'tasks.assign') or assigned_to = app.current_user_id())
  with check (app.has_permission(organization_id, 'tasks.assign') or assigned_to = app.current_user_id());

create policy task_assignments_select on public.task_assignments for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'tasks.read_all') or assigned_to = app.current_user_id());
create policy task_assignments_insert on public.task_assignments for insert to mbos_app
  with check (app.has_permission(organization_id, 'tasks.assign'));
create policy task_assignments_update on public.task_assignments for update to mbos_app
  using (app.has_permission(organization_id, 'tasks.assign'))
  with check (app.has_permission(organization_id, 'tasks.assign'));

-- Approvals
create policy approvals_select on public.approvals for select to authenticated, mbos_app
  using (
    app.has_permission(organization_id, 'approvals.read_all')
    or requested_by = app.current_user_id()
    or approver_id = app.current_user_id()
  );
create policy approvals_insert on public.approvals for insert to mbos_app
  with check (app.has_permission(organization_id, 'approvals.request') and requested_by = app.current_user_id());
create policy approvals_update on public.approvals for update to mbos_app
  using (app.has_permission(organization_id, 'approvals.decide') or requested_by = app.current_user_id())
  with check (app.has_permission(organization_id, 'approvals.decide') or requested_by = app.current_user_id());

-- Evidence — no DELETE policy: evidence is retained for disputes.
create policy order_evidence_select on public.order_evidence for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'evidence.read_all') or submitted_by = app.current_user_id());
create policy order_evidence_insert on public.order_evidence for insert to mbos_app
  with check (
    app.has_permission(organization_id, 'evidence.submit')
    and submitted_by = app.current_user_id()
    and review_status = 'PENDING_REVIEW'
    and (order_id is null or app.can_read_order(organization_id, order_id))
  );
create policy order_evidence_update on public.order_evidence for update to mbos_app
  using (app.has_permission(organization_id, 'evidence.review'))
  with check (app.has_permission(organization_id, 'evidence.review'));

-- Notifications — recipients only. Any member may notify another member of
-- the same organization (e.g. employee requests approval → managers).
create policy notifications_select on public.notifications for select to authenticated, mbos_app
  using (recipient_id = app.current_user_id() and app.is_member(organization_id));
create policy notifications_insert on public.notifications for insert to mbos_app
  with check (app.is_member(organization_id));
create policy notifications_update on public.notifications for update to mbos_app
  using (recipient_id = app.current_user_id())
  with check (recipient_id = app.current_user_id());

-- Activity log — append-only; users can only write entries as themselves.
create policy activity_logs_select on public.activity_logs for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'activity.read') or actor_id = app.current_user_id());
create policy activity_logs_insert on public.activity_logs for insert to mbos_app
  with check (app.is_member(organization_id) and actor_type = 'USER' and actor_id = app.current_user_id());

create policy employee_actions_select on public.employee_actions for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'activity.read') or user_id = app.current_user_id());
create policy employee_actions_insert on public.employee_actions for insert to mbos_app
  with check (app.is_member(organization_id) and user_id = app.current_user_id());

-- Integration events — readable by integration managers; written by system only.
create policy integration_events_select on public.integration_events for select to authenticated, mbos_app
  using (app.has_permission(organization_id, 'integrations.read'));

-- Settings — platform defaults readable by any signed-in user; org settings by members.
create policy system_settings_select on public.system_settings for select to authenticated, mbos_app
  using (organization_id is null or app.is_member(organization_id));
create policy system_settings_write on public.system_settings for all to mbos_app
  using (organization_id is not null and app.has_permission(organization_id, 'settings.manage'))
  with check (organization_id is not null and app.has_permission(organization_id, 'settings.manage'));

-- ---------------------------------------------------------------------------
-- Grants. Supabase grants ALL on new public tables to anon/authenticated by
-- default — revoke it explicitly. Re-run this block's pattern in every future
-- migration that adds tables.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;
grant select, insert, update on all tables in schema public to mbos_app;
-- Deletions are not part of the operational model (soft states instead).
revoke delete, truncate on all tables in schema public from mbos_app;

grant execute on all functions in schema app to mbos_app, authenticated;
revoke execute on function app.claim_task(uuid) from authenticated;

-- Member ids holding given roles — lets any member route notifications or
-- approvals to managers/owners without being able to read member PII.
create or replace function app.member_ids_with_roles(org uuid, roles text[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id
  from public.organization_members m
  where m.organization_id = org
    and m.status = 'ACTIVE'
    and m.role = any (roles)
    and app.is_member(org)
$$;
grant execute on function app.member_ids_with_roles(uuid, text[]) to mbos_app;
