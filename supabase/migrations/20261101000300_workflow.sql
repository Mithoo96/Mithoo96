-- ============================================================================
-- Workflow engines: tasks, exceptions, approvals, evidence, notifications,
-- activity/audit log, employee actions.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Exceptions (declared before tasks; tasks may be created to resolve them)
-- ---------------------------------------------------------------------------
create table public.exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid,
  shipment_id uuid,
  task_id uuid,
  type text not null check (type ~ '^[A-Z_]+$'),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED')),
  title text not null,
  description text,
  recommended_action text,
  -- Overlay applied to the related order while this exception is open.
  order_exception_state text check (order_exception_state is null or order_exception_state in (
    'ACTION_REQUIRED', 'AT_RISK', 'TRACKING_ISSUE', 'LABEL_ISSUE',
    'CARRIER_ISSUE', 'CUSTOMER_ISSUE', 'REFUND_RISK'
  )),
  source text not null default 'SYSTEM_RULE' check (source in ('SYSTEM_RULE', 'EMPLOYEE', 'MANAGER', 'INTEGRATION')),
  -- Stable identity of the underlying condition, e.g. "TRACKING_MISSING:shipment:<id>".
  dedupe_key text not null,
  auto_resolvable boolean not null default true,
  detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  occurrences integer not null default 1,
  deadline_at timestamptz,
  assigned_to uuid references public.profiles (id) on delete set null,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (id, organization_id),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade,
  foreign key (shipment_id, organization_id) references public.shipments (id, organization_id) on delete cascade,
  check ((status in ('RESOLVED', 'DISMISSED')) = (resolved_at is not null))
);
-- One open exception per condition: detection is idempotent.
create unique index exceptions_open_dedupe_uq on public.exceptions (organization_id, dedupe_key)
  where status in ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS');
create index exceptions_org_status_idx on public.exceptions (organization_id, status, severity);
create index exceptions_order_idx on public.exceptions (order_id);
create trigger exceptions_updated_at before update on public.exceptions
  for each row execute function app.set_updated_at();
create trigger exceptions_assignee_member before insert or update of assigned_to on public.exceptions
  for each row execute function app.assert_user_columns_are_members('assigned_to');

-- Keep orders.exception_state / risk_level in sync with open exceptions.
create or replace function app.recompute_order_exception_overlay(target_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  top record;
begin
  if target_order is null then
    return;
  end if;
  select e.order_exception_state, e.severity
    into top
  from public.exceptions e
  where e.order_id = target_order
    and e.status in ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS')
  order by case e.severity when 'CRITICAL' then 4 when 'HIGH' then 3 when 'MEDIUM' then 2 else 1 end desc,
           e.detected_at asc
  limit 1;

  update public.orders o
     set exception_state = case when top is null then null else coalesce(top.order_exception_state, 'ACTION_REQUIRED') end,
         risk_level = case when top is null then 'NONE' else top.severity end
   where o.id = target_order
     and (o.exception_state is distinct from (case when top is null then null else coalesce(top.order_exception_state, 'ACTION_REQUIRED') end)
          or o.risk_level is distinct from (case when top is null then 'NONE' else top.severity end));
end
$$;

create or replace function app.exceptions_sync_order_overlay()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform app.recompute_order_exception_overlay(new.order_id);
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.order_id is distinct from coalesce(new.order_id, null) then
    perform app.recompute_order_exception_overlay(old.order_id);
  end if;
  return null;
end
$$;
create trigger exceptions_sync_order after insert or update or delete on public.exceptions
  for each row execute function app.exceptions_sync_order_overlay();

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid,
  shipment_id uuid,
  exception_id uuid,
  type text not null check (type ~ '^[A-Z_]+$'),
  title text not null,
  -- Ordered steps: [{ "key": "...", "text": "...", "check": "ITEMS_CONFIRMED" | null }]
  instructions jsonb not null default '[]'::jsonb,
  priority text not null default 'NORMAL' check (priority in ('URGENT', 'HIGH', 'NORMAL', 'LOW')),
  status text not null default 'OPEN' check (status in (
    'OPEN', 'IN_PROGRESS', 'BLOCKED', 'AWAITING_VERIFICATION', 'COMPLETED', 'CANCELLED'
  )),
  assigned_to uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  required_checks text[] not null default '{}',
  required_evidence text[] not null default '{}',
  -- { "LABEL_SCANNED": { "passed": true, "at": "...", "by": "...", "value": "..." } }
  checks_state jsonb not null default '{}'::jsonb,
  requires_signoff boolean not null default false,
  verification_status text not null default 'PENDING' check (verification_status in (
    'NOT_REQUIRED', 'PENDING', 'VERIFIED', 'FAILED'
  )),
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  cancelled_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (id, organization_id),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade,
  foreign key (shipment_id, organization_id) references public.shipments (id, organization_id) on delete cascade,
  foreign key (exception_id, organization_id) references public.exceptions (id, organization_id) on delete set null (exception_id),
  check (status <> 'COMPLETED' or completed_at is not null)
);
-- Idempotent task generation: one live task of a type per order.
create unique index tasks_live_per_order_uq on public.tasks (order_id, type)
  where order_id is not null and status not in ('COMPLETED', 'CANCELLED');
create index tasks_assignee_idx on public.tasks (organization_id, assigned_to, status);
create index tasks_org_status_idx on public.tasks (organization_id, status, due_at);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function app.set_updated_at();
create trigger tasks_assignee_member before insert or update of assigned_to on public.tasks
  for each row execute function app.assert_user_columns_are_members('assigned_to');

alter table public.exceptions
  add foreign key (task_id, organization_id) references public.tasks (id, organization_id) on delete set null (task_id);

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  task_id uuid not null,
  assigned_to uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  reason text,
  foreign key (task_id, organization_id) references public.tasks (id, organization_id) on delete cascade
);
create index task_assignments_task_idx on public.task_assignments (task_id, assigned_at desc);
create trigger task_assignments_member before insert on public.task_assignments
  for each row execute function app.assert_user_columns_are_members('assigned_to');

-- ---------------------------------------------------------------------------
-- Approvals
-- ---------------------------------------------------------------------------
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null, -- null = requested by the system
  approver_id uuid references public.profiles (id) on delete set null,   -- optional designated approver
  required_role text not null default 'MANAGER' check (required_role in ('MANAGER', 'OWNER')),
  action_type text not null check (action_type ~ '^[A-Z_]+$'),
  action_payload jsonb not null default '{}'::jsonb,
  resource_type text not null check (resource_type ~ '^[a-z_]+$'),
  resource_id uuid not null,
  order_id uuid,
  reason text not null check (char_length(reason) between 1 and 2000),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  decision_comment text,
  comments jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  executed_at timestamptz,
  execution_result jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade,
  check ((status = 'APPROVED') = (approved_at is not null)),
  check ((status = 'REJECTED') = (rejected_at is not null)),
  check ((status = 'CANCELLED') = (cancelled_at is not null))
);
create index approvals_org_status_idx on public.approvals (organization_id, status, requested_at desc);
create unique index approvals_pending_dedupe_uq on public.approvals (organization_id, action_type, resource_id)
  where status = 'PENDING';
create trigger approvals_updated_at before update on public.approvals
  for each row execute function app.set_updated_at();
create trigger approvals_members before insert or update on public.approvals
  for each row execute function app.assert_user_columns_are_members('requested_by', 'approver_id', 'decided_by');

-- Database backstop: nobody approves or rejects their own request, and decided
-- requests are immutable.
create or replace function app.guard_approval_decision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'PENDING' and new.status is distinct from old.status then
    raise exception 'Approval % is already %', old.id, old.status using errcode = '23514';
  end if;
  if new.status in ('APPROVED', 'REJECTED') and old.status = 'PENDING' then
    if new.decided_by is null then
      raise exception 'A decision requires decided_by' using errcode = '23514';
    end if;
    if new.decided_by = old.requested_by then
      raise exception 'Requesters cannot decide their own approval' using errcode = '42501';
    end if;
    if app.current_user_id() is not null and new.decided_by <> app.current_user_id() then
      raise exception 'decided_by must be the acting user' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
create trigger approvals_guard_decision before update on public.approvals
  for each row execute function app.guard_approval_decision();

-- ---------------------------------------------------------------------------
-- Evidence
-- ---------------------------------------------------------------------------
create table public.order_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid,
  shipment_id uuid,
  task_id uuid,
  exception_id uuid,
  evidence_type text not null check (evidence_type in (
    'PACKAGING_PHOTO', 'LABEL_PHOTO', 'TRACKING_SCREENSHOT', 'CARRIER_RECEIPT',
    'CUSTOMER_CONFIRMATION', 'DELIVERY_CONFIRMATION', 'OTHER'
  )),
  storage_bucket text not null default 'evidence',
  storage_path text not null,
  content_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  description text,
  submitted_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  -- Evidence is only ACCEPTED after a human review; never auto-verified.
  review_status text not null default 'PENDING_REVIEW' check (review_status in ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade,
  foreign key (shipment_id, organization_id) references public.shipments (id, organization_id) on delete cascade,
  foreign key (task_id, organization_id) references public.tasks (id, organization_id) on delete set null (task_id),
  foreign key (exception_id, organization_id) references public.exceptions (id, organization_id) on delete set null (exception_id),
  check (num_nonnulls(order_id, shipment_id, task_id, exception_id) >= 1),
  check (storage_path like organization_id::text || '/%'),
  check ((review_status = 'PENDING_REVIEW') = (reviewed_at is null)),
  check (reviewed_by is null or reviewed_by is distinct from submitted_by)
);
create index order_evidence_order_idx on public.order_evidence (order_id);
create index order_evidence_task_idx on public.order_evidence (task_id);
create trigger order_evidence_updated_at before update on public.order_evidence
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Notifications (channel-agnostic; providers deliver non in-app channels)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null default 'IN_APP' check (channel in ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH')),
  category text not null check (category ~ '^[A-Z_]+$'),
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  title text not null,
  body text,
  resource_type text,
  resource_id uuid,
  action_url text,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED')),
  dedupe_key text,
  read_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  error text,
  attempts integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index notifications_dedupe_uq on public.notifications (recipient_id, channel, dedupe_key)
  where dedupe_key is not null;
create index notifications_recipient_idx on public.notifications (recipient_id, organization_id, created_at desc);
create index notifications_pending_idx on public.notifications (channel, status) where status = 'PENDING';
create trigger notifications_updated_at before update on public.notifications
  for each row execute function app.set_updated_at();
create trigger notifications_recipient_member before insert on public.notifications
  for each row execute function app.assert_user_columns_are_members('recipient_id');

-- ---------------------------------------------------------------------------
-- Activity / audit log — append-only
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('USER', 'SYSTEM', 'INTEGRATION')),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_label text,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  resource_type text not null check (resource_type ~ '^[a-z_]+$'),
  resource_id uuid,
  order_id uuid, -- denormalized for order timelines
  summary text not null,
  changes jsonb, -- { "field": { "from": ..., "to": ... } }
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  check (actor_type <> 'USER' or actor_id is not null)
);
create index activity_logs_org_time_idx on public.activity_logs (organization_id, occurred_at desc);
create index activity_logs_order_idx on public.activity_logs (order_id, occurred_at desc) where order_id is not null;
create index activity_logs_resource_idx on public.activity_logs (resource_type, resource_id, occurred_at desc);

create or replace function app.prevent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end
$$;
create trigger activity_logs_append_only before update or delete on public.activity_logs
  for each row execute function app.prevent_mutation();

-- Every order status change is logged by the database itself, so no code path
-- can change a status without an audit record. Services pass a reason through
-- the transaction-local setting `app.change_reason`.
create or replace function app.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := app.current_user_id();
begin
  if new.status is distinct from old.status then
    insert into public.activity_logs (
      organization_id, actor_type, actor_id, actor_label, action, resource_type, resource_id,
      order_id, summary, changes, metadata
    ) values (
      new.organization_id,
      case when actor is null then 'SYSTEM' else 'USER' end,
      actor,
      nullif(current_setting('app.actor_label', true), ''),
      'order.status_changed',
      'order',
      new.id,
      new.id,
      format('Order %s moved from %s to %s', new.order_number, old.status, new.status),
      jsonb_build_object('status', jsonb_build_object('from', old.status, 'to', new.status)),
      jsonb_strip_nulls(jsonb_build_object(
        'reason', nullif(current_setting('app.change_reason', true), ''),
        'request_id', nullif(current_setting('app.request_id', true), '')
      ))
    );
  end if;
  return null;
end
$$;
create trigger orders_log_status_change after update of status on public.orders
  for each row execute function app.log_order_status_change();

-- ---------------------------------------------------------------------------
-- Employee actions — granular record of physical/operational steps
-- ---------------------------------------------------------------------------
create table public.employee_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_id uuid,
  order_id uuid,
  shipment_id uuid,
  action_type text not null check (action_type in (
    'TASK_STARTED', 'LABEL_RETRIEVED', 'LABEL_PRINTED', 'ITEMS_CONFIRMED', 'LABEL_SCANNED',
    'PACKAGE_CONFIRMED', 'EVIDENCE_SUBMITTED', 'TASK_COMPLETED', 'TASK_BLOCKED', 'ISSUE_REPORTED'
  )),
  result text not null default 'OK' check (result in ('OK', 'MISMATCH', 'REJECTED', 'ERROR')),
  payload jsonb not null default '{}'::jsonb,
  device_info jsonb,
  occurred_at timestamptz not null default now(),
  foreign key (task_id, organization_id) references public.tasks (id, organization_id) on delete cascade,
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade
);
create index employee_actions_user_idx on public.employee_actions (organization_id, user_id, occurred_at desc);
create index employee_actions_task_idx on public.employee_actions (task_id);
create trigger employee_actions_append_only before update or delete on public.employee_actions
  for each row execute function app.prevent_mutation();

-- ---------------------------------------------------------------------------
-- Integration events — inbound webhooks & sync runs; idempotency ledger
-- ---------------------------------------------------------------------------
create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  connection_id uuid not null,
  provider text not null,
  direction text not null check (direction in ('INBOUND_WEBHOOK', 'SYNC', 'OUTBOUND_CALL')),
  external_event_id text,
  event_type text not null,
  payload jsonb,
  payload_sha256 text,
  signature_valid boolean,
  status text not null default 'RECEIVED' check (status in (
    'RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED', 'DEAD_LETTER', 'REJECTED'
  )),
  attempts integer not null default 0,
  locked_at timestamptz,
  next_attempt_at timestamptz,
  last_error text,
  result jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (connection_id, organization_id) references public.integration_connections (id, organization_id) on delete cascade
);
create unique index integration_events_dedupe_uq on public.integration_events (connection_id, external_event_id)
  where external_event_id is not null;
create index integration_events_retry_idx on public.integration_events (status, next_attempt_at)
  where status in ('RECEIVED', 'FAILED');
create trigger integration_events_updated_at before update on public.integration_events
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- System settings: platform defaults (organization_id null) + per-org overrides
-- ---------------------------------------------------------------------------
create table public.system_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'),
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index system_settings_platform_uq on public.system_settings (key) where organization_id is null;
create unique index system_settings_org_uq on public.system_settings (organization_id, key) where organization_id is not null;
create trigger system_settings_updated_at before update on public.system_settings
  for each row execute function app.set_updated_at();

insert into public.system_settings (organization_id, key, value, description) values
  (null, 'risk.shipping_deadline_policy',
   '{"thresholds":[{"withinMinutes":1440,"severity":"LOW"},{"withinMinutes":480,"severity":"MEDIUM"},{"withinMinutes":240,"severity":"HIGH"},{"withinMinutes":60,"severity":"CRITICAL"}],"overdueSeverity":"CRITICAL"}',
   'Severity escalation as a shipping deadline approaches an unverified package.'),
  (null, 'risk.carrier_acceptance_grace_minutes', '240',
   'How long after READY_TO_SHIP we wait for a carrier acceptance scan before raising CARRIER_NOT_RECEIVED.'),
  (null, 'tasks.pack_order.required_evidence', '["PACKAGING_PHOTO"]',
   'Evidence an employee must submit before a PACK_ORDER task can be completed.'),
  (null, 'tasks.pack_order.requires_signoff', 'false',
   'When true, a manager must verify each completed PACK_ORDER task before the order is READY_TO_SHIP.'),
  (null, 'tasks.allow_self_claim', 'true',
   'Employees may pull unassigned tasks from the pool via "Start next order".'),
  (null, 'approvals.required_for', '{"TRACKING_CHANGE":true,"LABEL_REPRINT":true,"MANUAL_SHIP_OVERRIDE":true,"REFUND_ACTION":true,"CANCEL_ORDER":true}',
   'Which sensitive actions require an approval before execution.'),
  (null, 'notifications.channels', '["IN_APP"]',
   'Enabled notification channels. Non in-app channels require a configured provider.');
