-- ============================================================================
-- Mithoo Business OS — Foundation: tenancy, identity, roles & permissions.
--
-- Security model (see docs/ARCHITECTURE.md §Security):
--   * Every tenant-owned row carries organization_id.
--   * RLS is enabled on every table in `public`.
--   * Browser clients (Supabase `authenticated` role via PostgREST) are
--     READ-ONLY and RLS-scoped.
--   * Server code connects directly to Postgres and runs user requests as the
--     `mbos_app` role with the verified user id injected as JWT claims, so the
--     same RLS policies apply to server-side reads and writes.
--   * System jobs (webhooks, cron) run as the connection owner (bypasses RLS)
--     and must scope every statement by organization_id explicitly.
-- ============================================================================

create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Server application role
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'mbos_app') then
    create role mbos_app nologin noinherit;
  end if;
end
$$;

-- Allow the migration/connection role to SET ROLE mbos_app.
grant mbos_app to current_user;

grant usage on schema public to mbos_app;
grant usage on schema app to mbos_app, authenticated;
revoke all on schema app from anon;

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

-- The current end user, read from the same JWT-claims settings PostgREST uses.
create or replace function app.current_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Organizations (tenants)
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  timezone text not null default 'America/New_York',
  default_currency char(3) not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (full_name is null or char_length(full_name) <= 200),
  display_name text check (display_name is null or char_length(display_name) <= 100),
  avatar_url text,
  phone text,
  locale text not null default 'en',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function app.set_updated_at();

create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, display_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created_mbos on auth.users;
create trigger on_auth_user_created_mbos
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Platform administrators (Mithoo staff). Platform-level, NOT tenant-level.
-- Platform admins can list organizations and memberships for support, but do
-- NOT get blanket access to tenant operational data through RLS.
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id) on delete set null,
  notes text
);

-- ---------------------------------------------------------------------------
-- Roles & permissions
-- ---------------------------------------------------------------------------
create table public.role_permissions (
  role text not null check (role in ('OWNER', 'MANAGER', 'EMPLOYEE')),
  permission text not null check (permission ~ '^[a-z_]+\.[a-z_]+$'),
  primary key (role, permission)
);

-- Keep in sync with src/core/tenancy/permissions.ts (a test enforces parity).
insert into public.role_permissions (role, permission)
select 'OWNER', p from unnest(array[
  'org.manage', 'members.read', 'members.manage',
  'dashboard.read', 'revenue.read',
  'orders.read_all', 'orders.write', 'orders.transition',
  'customers.read', 'products.read', 'products.write',
  'shipments.read_all', 'shipments.write',
  'tasks.read_all', 'tasks.assign', 'tasks.work', 'tasks.verify',
  'exceptions.read', 'exceptions.report', 'exceptions.resolve',
  'approvals.read_all', 'approvals.request', 'approvals.decide',
  'evidence.read_all', 'evidence.submit', 'evidence.review',
  'activity.read',
  'integrations.read', 'integrations.manage',
  'settings.manage'
]) as p
union all
select 'MANAGER', p from unnest(array[
  'members.read',
  'dashboard.read',
  'orders.read_all', 'orders.write', 'orders.transition',
  'customers.read', 'products.read', 'products.write',
  'shipments.read_all', 'shipments.write',
  'tasks.read_all', 'tasks.assign', 'tasks.work', 'tasks.verify',
  'exceptions.read', 'exceptions.report', 'exceptions.resolve',
  'approvals.read_all', 'approvals.request', 'approvals.decide',
  'evidence.read_all', 'evidence.submit', 'evidence.review',
  'activity.read',
  'integrations.read'
]) as p
union all
select 'EMPLOYEE', p from unnest(array[
  'products.read',
  'tasks.work',
  'exceptions.report',
  'approvals.request',
  'evidence.submit'
]) as p;

-- ---------------------------------------------------------------------------
-- Organization membership
-- ---------------------------------------------------------------------------
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('OWNER', 'MANAGER', 'EMPLOYEE')),
  status text not null default 'ACTIVE' check (status in ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED')),
  -- Explicit grants on top of the role ("unless explicitly permitted").
  extra_permissions text[] not null default '{}',
  title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id) where status = 'ACTIVE';
create trigger organization_members_updated_at before update on public.organization_members
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Authorization helper functions (SECURITY DEFINER so policies can consult
-- membership without recursive RLS evaluation). All are read-only.
-- ---------------------------------------------------------------------------
create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = app.current_user_id()
  )
$$;

create or replace function app.member_role(org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.organization_id = org
    and m.user_id = app.current_user_id()
    and m.status = 'ACTIVE'
    and o.status = 'ACTIVE'
$$;

create or replace function app.is_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.member_role(org) is not null
$$;

create or replace function app.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = app.current_user_id()
    and m.status = 'ACTIVE'
    and o.status = 'ACTIVE'
$$;

create or replace function app.has_permission(org uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    left join public.role_permissions rp on rp.role = m.role and rp.permission = perm
    where m.organization_id = org
      and m.user_id = app.current_user_id()
      and m.status = 'ACTIVE'
      and o.status = 'ACTIVE'
      and (rp.permission is not null or perm = any (m.extra_permissions))
  )
$$;

-- Is `usr` an active member of `org`? Used to validate assignee columns.
create or replace function app.is_user_member(org uuid, usr uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = usr and m.status = 'ACTIVE'
  )
$$;

-- Generic trigger: every column named in TG_ARGV must reference an active
-- member of the row's organization (or be null). Prevents assigning work,
-- approvals or notifications to users of another tenant.
create or replace function app.assert_user_columns_are_members()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text;
  val uuid;
begin
  foreach col in array tg_argv loop
    val := (to_jsonb(new) ->> col)::uuid;
    if val is not null and not app.is_user_member(new.organization_id, val) then
      raise exception 'User % referenced by %.% is not an active member of organization %',
        val, tg_table_name, col, new.organization_id
        using errcode = '23514';
    end if;
  end loop;
  return new;
end
$$;

-- Only an OWNER may create/promote OWNER memberships; never remove the last owner.
create or replace function app.guard_membership_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  remaining_owners int;
begin
  if app.current_user_id() is not null then
    if (tg_op = 'INSERT' and new.role = 'OWNER')
       or (tg_op = 'UPDATE' and new.role = 'OWNER' and old.role <> 'OWNER') then
      if coalesce(app.member_role(new.organization_id), '') <> 'OWNER' then
        raise exception 'Only an owner can grant the OWNER role' using errcode = '42501';
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' and old.role = 'OWNER' and old.status = 'ACTIVE'
     and (new.role <> 'OWNER' or new.status <> 'ACTIVE') then
    select count(*) into remaining_owners
    from public.organization_members
    where organization_id = old.organization_id and role = 'OWNER' and status = 'ACTIVE' and id <> old.id;
    if remaining_owners = 0 then
      raise exception 'An organization must keep at least one active owner' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create trigger organization_members_guard before insert or update on public.organization_members
  for each row execute function app.guard_membership_change();

-- ---------------------------------------------------------------------------
-- RLS — tenancy tables
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organization_members enable row level security;

create policy organizations_select on public.organizations for select
  to authenticated, mbos_app
  using (id in (select app.user_org_ids()) or app.is_platform_admin());
create policy organizations_update on public.organizations for update
  to mbos_app
  using (app.has_permission(id, 'org.manage'))
  with check (app.has_permission(id, 'org.manage'));

create policy profiles_select on public.profiles for select
  to authenticated, mbos_app
  using (
    id = app.current_user_id()
    or app.is_platform_admin()
    or exists (
      select 1 from public.organization_members m
      where m.user_id = profiles.id
        and app.has_permission(m.organization_id, 'members.read')
    )
  );
create policy profiles_update_self on public.profiles for update
  to mbos_app
  using (id = app.current_user_id())
  with check (id = app.current_user_id());

create policy platform_admins_select on public.platform_admins for select
  to authenticated, mbos_app
  using (user_id = app.current_user_id() or app.is_platform_admin());

create policy role_permissions_select on public.role_permissions for select
  to authenticated, mbos_app
  using (true);

create policy organization_members_select on public.organization_members for select
  to authenticated, mbos_app
  using (
    user_id = app.current_user_id()
    or app.has_permission(organization_id, 'members.read')
    or app.is_platform_admin()
  );
create policy organization_members_insert on public.organization_members for insert
  to mbos_app
  with check (app.has_permission(organization_id, 'members.manage'));
create policy organization_members_update on public.organization_members for update
  to mbos_app
  using (app.has_permission(organization_id, 'members.manage'))
  with check (app.has_permission(organization_id, 'members.manage'));
