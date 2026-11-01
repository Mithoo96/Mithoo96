-- ============================================================================
-- Private evidence + label storage buckets (Supabase Storage).
-- Object paths MUST start with the organization id: "<org_id>/...".
-- Guarded so the migration is a no-op on plain Postgres (local tests).
-- ============================================================================
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema not present; skipping bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('evidence', 'evidence', false), ('labels', 'labels', false)
  on conflict (id) do nothing;

  -- Members may read objects of their organization's folder only if they can
  -- read the corresponding evidence row; uploads are done server-side with the
  -- service role after authorization, so no INSERT policy for end users.
  execute $p$
    create policy "evidence_read_own_org" on storage.objects for select to authenticated
    using (
      bucket_id = 'evidence'
      and exists (
        select 1 from public.order_evidence e
        where e.storage_bucket = 'evidence'
          and e.storage_path = storage.objects.name
      )
    )
  $p$;

  execute $p$
    create policy "labels_read_own_org" on storage.objects for select to authenticated
    using (
      bucket_id = 'labels'
      and exists (
        select 1 from public.shipping_labels l
        where l.storage_bucket = 'labels'
          and l.storage_path = storage.objects.name
      )
    )
  $p$;
exception
  when duplicate_object then
    raise notice 'storage policies already exist';
end
$$;
