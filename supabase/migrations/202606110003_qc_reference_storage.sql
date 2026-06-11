insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qc-references',
  'qc-references',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "QC references read authenticated" on storage.objects;
create policy "QC references read authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'qc-references');

drop policy if exists "QC references upload authenticated" on storage.objects;
create policy "QC references upload authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'qc-references'
  and owner_id = auth.uid()::text
);

drop policy if exists "QC references update owner" on storage.objects;
create policy "QC references update owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'qc-references'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'qc-references'
  and owner_id = auth.uid()::text
);

drop policy if exists "QC references delete admin" on storage.objects;
create policy "QC references delete admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'qc-references'
  and exists (
    select 1
    from public.profiles
    where profiles.auth_user_id = auth.uid()
      and profiles.role = 'Admin'
  )
);
