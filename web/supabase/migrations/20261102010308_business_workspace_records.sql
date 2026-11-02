-- Additive operational CRM/document storage. Existing commerce tables/policies unchanged.
create table public.business_clients (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 display_name text not null check(char_length(display_name) between 2 and 200),
 service_line text not null check(service_line in ('TAX','INSURANCE','SERVICE')),
 status text not null default 'ACTIVE' check(status in ('ACTIVE','WAITING','COMPLETED','ARCHIVED')),
 notes text not null default '' check(char_length(notes)<=2000),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,organization_id)
);
create table public.business_documents (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 client_id uuid not null,
 name text not null check(char_length(name) between 2 and 200),
 status text not null default 'REQUESTED' check(status in ('REQUESTED','UPLOADED')),
 storage_path text,
 content_type text,
 size_bytes bigint check(size_bytes is null or size_bytes between 1 and 15728640),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(client_id,organization_id) references public.business_clients(id,organization_id),
 check((status='REQUESTED' and storage_path is null) or (status='UPLOADED' and storage_path like organization_id::text || '/documents/' || id::text || '/%'))
);
create index business_clients_org on public.business_clients(organization_id,created_at desc);
create index business_documents_org on public.business_documents(organization_id,client_id);
create trigger business_clients_updated_at before update on public.business_clients for each row execute function app.set_updated_at();
create trigger business_documents_updated_at before update on public.business_documents for each row execute function app.set_updated_at();
alter table public.business_clients enable row level security;
alter table public.business_documents enable row level security;
create policy business_clients_access on public.business_clients for all to authenticated,mbos_app
using (app.has_permission(organization_id,'members.read') and exists(select 1 from public.organizations o where o.id=organization_id and o.metadata->'enabled_modules' ?& array['CRM','CLIENTS'] and (service_line='SERVICE' or o.metadata->'enabled_modules' ? service_line)))
with check (app.has_permission(organization_id,'members.read') and exists(select 1 from public.organizations o where o.id=organization_id and o.metadata->'enabled_modules' ?& array['CRM','CLIENTS'] and (service_line='SERVICE' or o.metadata->'enabled_modules' ? service_line)));
create policy business_documents_access on public.business_documents for all to authenticated,mbos_app
using (app.has_permission(organization_id,'members.read') and exists(select 1 from public.organizations o where o.id=organization_id and o.metadata->'enabled_modules' ? 'DOCUMENTS') and exists(select 1 from public.business_clients c where c.id=client_id and c.organization_id=organization_id))
with check (app.has_permission(organization_id,'members.read') and exists(select 1 from public.organizations o where o.id=organization_id and o.metadata->'enabled_modules' ? 'DOCUMENTS') and exists(select 1 from public.business_clients c where c.id=client_id and c.organization_id=organization_id));
revoke all on public.business_clients,public.business_documents from public,anon,authenticated,mbos_app;
grant select on public.business_clients,public.business_documents to authenticated;
grant select,insert,update on public.business_clients,public.business_documents to mbos_app;
do $$ begin
 if to_regclass('storage.buckets') is null then return; end if;
 insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('business-documents','business-documents',false,15728640,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
 execute $p$create policy business_documents_read on storage.objects for select to authenticated using(bucket_id='business-documents' and exists(select 1 from public.business_documents d where d.storage_path=storage.objects.name and d.status='UPLOADED'))$p$;
end $$;
