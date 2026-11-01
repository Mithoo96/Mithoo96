-- ============================================================================
-- Narrow SECURITY DEFINER operations used by the Exception Engine so that an
-- employee action (e.g. a failed label scan) can raise or clear a rule-based
-- exception atomically, without granting employees general UPDATE rights on
-- exceptions.
-- ============================================================================

create or replace function app.raise_exception(
  p_org uuid,
  p_type text,
  p_severity text,
  p_title text,
  p_description text,
  p_recommended_action text,
  p_order_state text,
  p_dedupe_key text,
  p_auto_resolvable boolean,
  p_source text,
  p_order_id uuid,
  p_shipment_id uuid,
  p_task_id uuid,
  p_deadline_at timestamptz,
  p_metadata jsonb
)
returns table (exception_id uuid, inserted boolean, escalated boolean, severity text, previous_severity text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := app.current_user_id();
  existing record;
  rank_new int := case p_severity when 'CRITICAL' then 4 when 'HIGH' then 3 when 'MEDIUM' then 2 else 1 end;
  rank_old int;
begin
  if me is not null and not app.has_permission(p_org, 'exceptions.report') then
    raise exception 'Insufficient permission to report exceptions' using errcode = '42501';
  end if;

  select e.id, e.severity into existing
  from public.exceptions e
  where e.organization_id = p_org and e.dedupe_key = p_dedupe_key
    and e.status in ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS')
  for update;

  if found then
    rank_old := case existing.severity when 'CRITICAL' then 4 when 'HIGH' then 3 when 'MEDIUM' then 2 else 1 end;
    update public.exceptions e
       set last_detected_at = now(),
           occurrences = e.occurrences + 1,
           severity = case when rank_new > rank_old then p_severity else e.severity end,
           description = coalesce(p_description, e.description),
           deadline_at = coalesce(p_deadline_at, e.deadline_at),
           metadata = e.metadata || coalesce(p_metadata, '{}'::jsonb)
     where e.id = existing.id;
    return query select existing.id, false, rank_new > rank_old,
      case when rank_new > rank_old then p_severity else existing.severity end, existing.severity::text;
    return;
  end if;

  return query
  insert into public.exceptions (
    organization_id, type, severity, title, description, recommended_action, order_exception_state,
    dedupe_key, auto_resolvable, source, order_id, shipment_id, task_id, deadline_at, metadata, created_by
  ) values (
    p_org, p_type, p_severity, p_title, p_description, p_recommended_action, p_order_state,
    p_dedupe_key, p_auto_resolvable, p_source, p_order_id, p_shipment_id, p_task_id, p_deadline_at,
    coalesce(p_metadata, '{}'::jsonb), me
  )
  returning id, true, false, p_severity, null::text;
end
$$;

-- Close rule-based, auto-resolvable exceptions whose condition the server has
-- re-evaluated as cleared. Returns the ids that were resolved.
create or replace function app.auto_resolve_exceptions(p_org uuid, p_dedupe_keys text[], p_note text)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := app.current_user_id();
begin
  if me is not null and not app.is_member(p_org) then
    raise exception 'Not a member' using errcode = '42501';
  end if;
  return query
  with closed as (
    update public.exceptions e
       set status = 'RESOLVED',
           resolved_at = now(),
           resolved_by = null,
           resolution_notes = p_note
     where e.organization_id = p_org
       and e.dedupe_key = any (p_dedupe_keys)
       and e.auto_resolvable
       and e.source = 'SYSTEM_RULE'
       and e.status in ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS')
    returning e.id, e.order_id, e.title
  ), logged as (
    insert into public.activity_logs (organization_id, actor_type, actor_id, action, resource_type, resource_id, order_id, summary, metadata)
    select p_org, case when me is null then 'SYSTEM' else 'USER' end, me, 'exception.auto_resolved', 'exception', c.id, c.order_id,
           format('Exception "%s" auto-resolved: %s', c.title, p_note), jsonb_build_object('note', p_note)
    from closed c
    returning resource_id
  )
  select resource_id from logged;
end
$$;

revoke all on function app.raise_exception(uuid, text, text, text, text, text, text, text, boolean, text, uuid, uuid, uuid, timestamptz, jsonb) from public;
revoke all on function app.auto_resolve_exceptions(uuid, text[], text) from public;
grant execute on function app.raise_exception(uuid, text, text, text, text, text, text, text, boolean, text, uuid, uuid, uuid, timestamptz, jsonb) to mbos_app;
grant execute on function app.auto_resolve_exceptions(uuid, text[], text) to mbos_app;

-- Duplicate-tracking lookup across the whole organization. Employees cannot
-- read other orders' shipments through RLS, but the verification engine must
-- still detect that "their" tracking number is used elsewhere.
create or replace function app.tracking_conflicts(p_org uuid, p_shipment uuid, p_tracking text)
returns table (shipment_id uuid, order_id uuid, order_number text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.order_id, o.order_number
  from public.shipments s
  join public.orders o on o.id = s.order_id
  where s.organization_id = p_org
    and (app.current_user_id() is null or app.is_member(p_org))
    and s.id <> p_shipment
    and s.status <> 'CANCELLED'
    and o.status <> 'CANCELLED'
    and s.tracking_number_normalized = app.normalize_tracking(p_tracking)
    and app.normalize_tracking(p_tracking) is not null
$$;
revoke all on function app.tracking_conflicts(uuid, uuid, text) from public;
grant execute on function app.tracking_conflicts(uuid, uuid, text) to mbos_app;

-- Employee pool: how many unassigned, claimable tasks exist (count only).
create or replace function app.claimable_task_count(p_org uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when app.has_permission(p_org, 'tasks.work') then (
    select count(*)::int from public.tasks t
    where t.organization_id = p_org and t.assigned_to is null and t.status = 'OPEN'
      and t.type in ('PACK_ORDER', 'REPRINT_LABEL', 'HAND_TO_CARRIER')
  ) else 0 end
$$;

-- Claim the most urgent unassigned task. Concurrency-safe: SKIP LOCKED means
-- two employees pressing "Start next order" never receive the same task.
create or replace function app.claim_next_task(p_org uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := app.current_user_id();
  target uuid;
begin
  if me is null or not app.has_permission(p_org, 'tasks.work') then
    raise exception 'Not allowed to claim tasks' using errcode = '42501';
  end if;
  select t.id into target
  from public.tasks t
  left join public.orders o on o.id = t.order_id
  where t.organization_id = p_org and t.assigned_to is null and t.status = 'OPEN'
    and t.type in ('PACK_ORDER', 'REPRINT_LABEL', 'HAND_TO_CARRIER')
  order by case t.priority when 'URGENT' then 0 when 'HIGH' then 1 when 'NORMAL' then 2 else 3 end,
           coalesce(o.ship_by_at, t.due_at) nulls last, t.created_at
  limit 1
  for update of t skip locked;
  if target is null then
    return null;
  end if;
  if app.claim_task(target) then
    return target;
  end if;
  return null;
end
$$;

revoke all on function app.claimable_task_count(uuid) from public;
revoke all on function app.claim_next_task(uuid) from public;
grant execute on function app.claimable_task_count(uuid) to mbos_app;
grant execute on function app.claim_next_task(uuid) to mbos_app;

-- Notify another member. Members cannot SELECT each other's notifications, so
-- INSERT ... ON CONFLICT (dedupe) cannot run under the caller's RLS. This
-- narrow function checks the caller is a member; the recipient-membership
-- trigger still applies. Returns true when a row was created.
create or replace function app.enqueue_notification(
  p_org uuid, p_recipient uuid, p_channel text, p_category text, p_priority text, p_title text, p_body text,
  p_resource_type text, p_resource_id uuid, p_action_url text, p_dedupe_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted int;
begin
  if app.current_user_id() is not null and not app.is_member(p_org) then
    raise exception 'Not a member of this organization' using errcode = '42501';
  end if;
  insert into public.notifications
    (organization_id, recipient_id, channel, category, priority, title, body, resource_type, resource_id, action_url, status, sent_at, dedupe_key)
  values
    (p_org, p_recipient, p_channel, p_category, p_priority, p_title, p_body, p_resource_type, p_resource_id, p_action_url,
     case when p_channel = 'IN_APP' then 'DELIVERED' else 'PENDING' end,
     case when p_channel = 'IN_APP' then now() else null end, p_dedupe_key)
  on conflict (recipient_id, channel, dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted = row_count;
  return inserted > 0;
end
$$;
revoke all on function app.enqueue_notification(uuid, uuid, text, text, text, text, text, text, uuid, text, text) from public;
grant execute on function app.enqueue_notification(uuid, uuid, text, text, text, text, text, text, uuid, text, text) to mbos_app;
