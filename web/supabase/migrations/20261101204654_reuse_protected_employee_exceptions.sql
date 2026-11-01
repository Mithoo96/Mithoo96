-- Reuse an existing exception for repeated non-resolver reports.
-- No RLS policy, grant, trigger or historical migration changes.
-- CREATE OR REPLACE preserves the existing restricted function privileges.

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
    -- A repeated employee scan must retain the existing exception. Its attempt
    -- is recorded in activity_logs/employee_actions by the packing service.
    -- Do not update protected exception columns or grant employees resolution rights.
    if me is not null and not app.has_permission(p_org, 'exceptions.resolve') then
      return query select existing.id, false, false, existing.severity::text, existing.severity::text;
      return;
    end if;
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
