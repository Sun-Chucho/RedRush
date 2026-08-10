-- RedRush Migration 017: private vendor/rider verification document storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "verification documents owner insert" on storage.objects;
create policy "verification documents owner insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "verification documents owner read" on storage.objects;
create policy "verification documents owner read" on storage.objects
for select to authenticated
using (
  bucket_id = 'verification-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "verification documents owner update" on storage.objects;
create policy "verification documents owner update" on storage.objects
for update to authenticated
using (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "verification documents owner delete" on storage.objects;
create policy "verification documents owner delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'verification-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
