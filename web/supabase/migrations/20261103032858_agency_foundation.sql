-- Agency Batch 1. Additive: commerce tables, permissions and workflows remain intact.
begin;
insert into public.role_permissions(role, permission)
select r, p from unnest(array['OWNER','MANAGER']) r cross join unnest(array[
 'agency.read_all','agency.manage','agency.assign','agency.configure','agency.work'
]) p where r = 'OWNER' or p <> 'agency.configure';
insert into public.role_permissions values ('EMPLOYEE','agency.work');

create table public.agency_modules (
 organization_id uuid not null references public.organizations(id),
 module text not null check(module in ('TAX','LIFE_INSURANCE','HEALTH_INSURANCE')),
 enabled boolean not null default true,
 primary key(organization_id,module)
);
create table public.agency_pipeline_stages (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null,
 module text not null, code text not null check(code ~ '^[A-Z_]+$'),
 label text not null check(length(label) between 1 and 100), position integer not null check(position >= 0),
 is_initial boolean not null default false, is_terminal boolean not null default false,
 unique(id,organization_id,module), unique(organization_id,module,code),
 foreign key(organization_id,module) references public.agency_modules(organization_id,module)
);
create unique index agency_initial_stage on public.agency_pipeline_stages(organization_id,module) where is_initial;
create index agency_stage_order on public.agency_pipeline_stages(organization_id,module,position);
create table public.agency_client_profiles (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 customer_id uuid not null, status text not null default 'ACTIVE' check(status in ('ACTIVE','INACTIVE')),
 created_at timestamptz not null default now(), created_by uuid references public.profiles(id),
 unique(id,organization_id), unique(organization_id,customer_id),
 foreign key(customer_id,organization_id) references public.customers(id,organization_id)
);
create table public.agency_client_assignments (
 organization_id uuid not null, client_id uuid not null, user_id uuid not null,
 assigned_at timestamptz not null default now(), assigned_by uuid references public.profiles(id),
 active boolean not null default true,
 primary key(organization_id,client_id,user_id),
 foreign key(client_id,organization_id) references public.agency_client_profiles(id,organization_id),
 foreign key(organization_id,user_id) references public.organization_members(organization_id,user_id)
);
create index agency_client_assignee on public.agency_client_assignments(organization_id,user_id,client_id) where active;
create table public.agency_leads (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 customer_id uuid not null, module text not null, stage_id uuid not null,
 source text not null default 'MANUAL' check(length(source) between 1 and 100),
 priority text not null default 'NORMAL' check(priority in ('LOW','NORMAL','HIGH','URGENT')),
 assigned_to uuid, last_contact_at timestamptz, next_follow_up_at timestamptz,
 notes text not null default '' check(length(notes) <= 4000), tags text[] not null default '{}',
 client_id uuid, converted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references public.profiles(id), unique(id,organization_id),
 foreign key(customer_id,organization_id) references public.customers(id,organization_id),
 foreign key(organization_id,module) references public.agency_modules(organization_id,module),
 foreign key(stage_id,organization_id,module) references public.agency_pipeline_stages(id,organization_id,module),
 foreign key(organization_id,assigned_to) references public.organization_members(organization_id,user_id),
 foreign key(client_id,organization_id) references public.agency_client_profiles(id,organization_id),
 check((client_id is null) = (converted_at is null))
);
create index agency_leads_queue on public.agency_leads(organization_id,assigned_to,module,stage_id);
create index agency_leads_follow_up on public.agency_leads(organization_id,next_follow_up_at) where converted_at is null;
create index customers_agency_email on public.customers(organization_id,lower(email)) where email is not null;
create index agency_leads_customer on public.agency_leads(organization_id,customer_id);
create trigger agency_leads_updated_at before update on public.agency_leads for each row execute function app.set_updated_at();
create trigger agency_leads_member before insert or update of assigned_to on public.agency_leads
 for each row execute function app.assert_user_columns_are_members('assigned_to');
create trigger agency_client_assignment_member before insert or update on public.agency_client_assignments
 for each row execute function app.assert_user_columns_are_members('user_id');

alter table public.tasks add column agency_lead_id uuid;
alter table public.tasks add foreign key(agency_lead_id,organization_id) references public.agency_leads(id,organization_id);
create index tasks_agency_lead on public.tasks(organization_id,agency_lead_id);
-- Scheduling requests carry a stable key: retries must not create a second task.
alter table public.tasks add column agency_follow_up_key uuid;
create unique index tasks_agency_follow_up_key on public.tasks(organization_id,agency_follow_up_key) where agency_follow_up_key is not null;
alter table public.tasks add constraint agency_follow_up_link check (
 (agency_follow_up_key is null or agency_lead_id is not null) and
 (agency_lead_id is null or (type = 'AGENCY_FOLLOW_UP' and order_id is null and shipment_id is null))
);

create function app.agency_enabled(org uuid, mod text) returns boolean language sql stable security definer set search_path = '' as $$
 select app.is_member(org) and exists(select 1 from public.agency_modules where organization_id=org and module=mod and enabled)
$$;
create function app.agency_can_read_client(org uuid, client uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select app.is_member(org) and (app.has_permission(org,'agency.read_all') or (app.has_permission(org,'agency.work') and exists(
 select 1 from public.agency_client_assignments a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.user_id
 where a.organization_id=org and a.client_id=client and a.user_id=app.current_user_id() and a.active and m.status='ACTIVE')))
$$;
create function app.agency_can_read_lead(org uuid, lead uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select app.is_member(org) and exists(select 1 from public.agency_leads l where l.id=lead and l.organization_id=org
 and app.agency_enabled(org,l.module) and (app.has_permission(org,'agency.read_all') or (app.has_permission(org,'agency.work') and ((l.client_id is null and l.assigned_to=app.current_user_id()) or (l.client_id is not null and app.agency_can_read_client(org,l.client_id))))))
$$;
create function app.agency_can_read_contact(org uuid, contact uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select app.is_member(org) and (exists(select 1 from public.agency_leads l where l.organization_id=org and l.customer_id=contact and app.agency_can_read_lead(org,l.id))
 or exists(select 1 from public.agency_client_profiles c where c.organization_id=org and c.customer_id=contact and app.agency_can_read_client(org,c.id)))
$$;

-- Guard fields and operation types even for SQL callers using the server role.
create function app.guard_agency_lead() returns trigger language plpgsql set search_path = '' as $$
begin
 if not exists(select 1 from public.agency_modules where organization_id=new.organization_id and module=new.module and enabled) then
  raise exception 'Agency module is disabled' using errcode='23514'; end if;
 if tg_op='UPDATE' then
  if (new.organization_id,new.customer_id,new.module,new.created_by) is distinct from (old.organization_id,old.customer_id,old.module,old.created_by) then
   raise exception 'Lead identity is immutable' using errcode='23514'; end if;
  if old.converted_at is not null and new is distinct from old then
   raise exception 'Converted lead history is immutable' using errcode='23514'; end if;
  if (new.client_id,new.converted_at) is distinct from (old.client_id,old.converted_at) and current_user='mbos_app' then
   raise exception 'Use the conversion operation' using errcode='42501'; end if;
 end if;
 return new;
end $$;
create trigger agency_lead_guard before insert or update on public.agency_leads for each row execute function app.guard_agency_lead();
create trigger agency_lead_columns before update on public.agency_leads for each row execute function app.guard_columns(
 'agency.manage','stage_id','last_contact_at','next_follow_up_at','notes','tags','client_id','converted_at');

-- New tables are secured at introduction, including explicit Supabase default revocations.
alter table public.agency_modules enable row level security;
alter table public.agency_pipeline_stages enable row level security;
alter table public.agency_client_profiles enable row level security;
alter table public.agency_client_assignments enable row level security;
alter table public.agency_leads enable row level security;
create policy agency_modules_read on public.agency_modules for select to authenticated,mbos_app using(app.is_member(organization_id));
create policy agency_modules_write on public.agency_modules for all to mbos_app using(app.has_permission(organization_id,'agency.configure')) with check(app.has_permission(organization_id,'agency.configure'));
create policy agency_stages_read on public.agency_pipeline_stages for select to authenticated,mbos_app using(app.agency_enabled(organization_id,module));
create policy agency_stages_write on public.agency_pipeline_stages for all to mbos_app using(app.has_permission(organization_id,'agency.configure')) with check(app.has_permission(organization_id,'agency.configure'));
create policy agency_clients_read on public.agency_client_profiles for select to authenticated,mbos_app using(app.agency_can_read_client(organization_id,id));
create policy agency_clients_insert on public.agency_client_profiles for insert to mbos_app with check(app.has_permission(organization_id,'agency.manage'));
create policy agency_clients_update on public.agency_client_profiles for update to mbos_app using(app.has_permission(organization_id,'agency.manage')) with check(app.has_permission(organization_id,'agency.manage'));
create policy agency_assignments_read on public.agency_client_assignments for select to authenticated,mbos_app using(app.is_member(organization_id) and (app.has_permission(organization_id,'agency.read_all') or user_id=app.current_user_id()));
create policy agency_assignments_write on public.agency_client_assignments for all to mbos_app using(app.has_permission(organization_id,'agency.assign')) with check(app.has_permission(organization_id,'agency.assign'));
create policy agency_leads_read on public.agency_leads for select to authenticated,mbos_app using(
 app.is_member(organization_id) and app.agency_enabled(organization_id,module) and
 (app.has_permission(organization_id,'agency.read_all') or (app.has_permission(organization_id,'agency.work') and ((client_id is null and assigned_to=app.current_user_id()) or (client_id is not null and app.agency_can_read_client(organization_id,client_id))))));
create policy agency_leads_insert on public.agency_leads for insert to mbos_app with check(app.has_permission(organization_id,'agency.manage') and app.agency_enabled(organization_id,module) and client_id is null and converted_at is null);
create policy agency_leads_update on public.agency_leads for update to mbos_app using(app.agency_can_read_lead(organization_id,id)) with check(app.agency_can_read_lead(organization_id,id));
create policy agency_contact_read on public.customers for select to authenticated,mbos_app using(app.agency_can_read_contact(organization_id,id));
create policy agency_contact_insert on public.customers for insert to mbos_app with check(app.has_permission(organization_id,'agency.manage'));
-- Restrictive policy supplements Phase 1 task access without widening commerce access.
create policy agency_task_scope on public.tasks as restrictive for all to authenticated,mbos_app
 using(agency_lead_id is null or app.agency_can_read_lead(organization_id,agency_lead_id))
 with check(agency_lead_id is null or app.agency_can_read_lead(organization_id,agency_lead_id));
create policy agency_timeline_read on public.activity_logs for select to authenticated,mbos_app
 using((resource_type='agency_lead' and app.agency_can_read_lead(organization_id,resource_id)) or (resource_type='agency_client' and app.agency_can_read_client(organization_id,resource_id)));

-- Narrow employee follow-up generation: never arbitrary assignment or commerce tasks.
create policy agency_follow_up_insert on public.tasks for insert to mbos_app with check(
 type='AGENCY_FOLLOW_UP' and agency_lead_id is not null and assigned_to=app.current_user_id()
 and app.has_permission(organization_id,'agency.work') and app.agency_can_read_lead(organization_id,agency_lead_id));
create policy agency_follow_up_assignment_insert on public.task_assignments for insert to mbos_app with check(
 assigned_to=app.current_user_id() and assigned_by=app.current_user_id() and exists(
 select 1 from public.tasks t where t.id=task_id and t.organization_id=task_assignments.organization_id
 and t.type='AGENCY_FOLLOW_UP' and t.agency_lead_id is not null and t.assigned_to=app.current_user_id()
 and app.agency_can_read_lead(t.organization_id,t.agency_lead_id)));
create function app.guard_agency_task() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.type='AGENCY_FOLLOW_UP') <> (new.agency_lead_id is not null) then
 raise exception 'Agency follow-up requires a lead' using errcode='23514'; end if;
 if tg_op='UPDATE' and (new.agency_lead_id,new.agency_follow_up_key,new.organization_id) is distinct from
 (old.agency_lead_id,old.agency_follow_up_key,old.organization_id) then
 raise exception 'Task resource identity is immutable' using errcode='23514'; end if;
 if new.agency_lead_id is not null then
  if not exists(select 1 from public.agency_leads l where l.id=new.agency_lead_id and l.organization_id=new.organization_id
   and l.assigned_to=new.assigned_to and l.converted_at is null) then
   raise exception 'Follow-up assignee must match the active lead assignment' using errcode='23514'; end if;
 end if;
 return new;
end $$;
create trigger agency_task_guard before insert or update on public.tasks for each row execute function app.guard_agency_task();
create function app.guard_agency_client_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.id,new.organization_id,new.customer_id) is distinct from (old.id,old.organization_id,old.customer_id) then
 raise exception 'Client identity is immutable' using errcode='23514'; end if;
 return new;
end $$;
create trigger agency_client_identity before update on public.agency_client_profiles for each row execute function app.guard_agency_client_identity();

-- Atomic, idempotent conversion. Narrow definer is needed to preserve an employee's
-- assignment without granting employees arbitrary client/assignment INSERT rights.
create function app.convert_agency_lead(org uuid, lead uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare l public.agency_leads; c uuid; actor uuid := app.current_user_id();
begin
 if actor is null or not app.agency_can_read_lead(org,lead) or not app.has_permission(org,'agency.work') then
  raise exception 'Lead not accessible' using errcode='42501'; end if;
 select * into l from public.agency_leads where id=lead and organization_id=org for update;
 if l.client_id is not null then return l.client_id; end if;
 if exists(select 1 from public.tasks where organization_id=org and agency_lead_id=lead and status not in ('COMPLETED','CANCELLED')) then
 raise exception 'Complete outstanding follow-ups before conversion' using errcode='23514'; end if;
 insert into public.agency_client_profiles(organization_id,customer_id,created_by) values(org,l.customer_id,actor)
 on conflict(organization_id,customer_id) do update set status='ACTIVE' returning id into c;
 if l.assigned_to is not null then
  insert into public.agency_client_assignments(organization_id,client_id,user_id,assigned_by) values(org,c,l.assigned_to,actor)
  on conflict(organization_id,client_id,user_id) do update set active=true;
 end if;
 update public.agency_leads set client_id=c,converted_at=now() where id=lead and organization_id=org;
 insert into public.activity_logs(organization_id,actor_type,actor_id,action,resource_type,resource_id,summary,metadata)
 values(org,'USER',actor,'lead.converted','agency_lead',lead,'Lead converted to client',jsonb_build_object('clientId',c));
 if l.assigned_to is not null then
 insert into public.activity_logs(organization_id,actor_type,actor_id,action,resource_type,resource_id,summary)
 values(org,'USER',actor,'client.assigned','agency_client',c,'Client assignment preserved during conversion'); end if;
 return c;
end $$;

revoke all on public.agency_modules,public.agency_pipeline_stages,public.agency_client_profiles,public.agency_client_assignments,public.agency_leads from anon,authenticated,mbos_app;
grant select on public.agency_modules,public.agency_pipeline_stages,public.agency_client_profiles,public.agency_client_assignments,public.agency_leads to authenticated;
grant select,insert,update on public.agency_modules,public.agency_pipeline_stages,public.agency_client_profiles,public.agency_client_assignments,public.agency_leads to mbos_app;
revoke all on function app.agency_enabled(uuid,text),app.agency_can_read_lead(uuid,uuid),app.agency_can_read_client(uuid,uuid),app.agency_can_read_contact(uuid,uuid),app.convert_agency_lead(uuid,uuid) from public,anon,authenticated;
grant execute on function app.agency_enabled(uuid,text),app.agency_can_read_lead(uuid,uuid),app.agency_can_read_client(uuid,uuid),app.agency_can_read_contact(uuid,uuid) to authenticated,mbos_app;
grant execute on function app.convert_agency_lead(uuid,uuid) to mbos_app;
commit;
