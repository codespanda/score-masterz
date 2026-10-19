-- Team logos: a public URL on the team, files in a public Storage bucket.
-- Apps resize logos to ≤512 px WebP before upload; the bucket rejects anything over 1 MB.

alter table teams add column logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-logos', 'team-logos', true, 1048576, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files live at <team id>/<file>. Anyone can view; only the team's creator can add, replace or remove.
create policy "team logos are public" on storage.objects for select
  using (bucket_id = 'team-logos');

create policy "team owner uploads logo" on storage.objects for insert
  with check (
    bucket_id = 'team-logos'
    and exists (select 1 from public.teams t where t.id::text = (storage.foldername(name))[1] and t.owner_id = auth.uid())
  );

create policy "team owner updates logo" on storage.objects for update
  using (
    bucket_id = 'team-logos'
    and exists (select 1 from public.teams t where t.id::text = (storage.foldername(name))[1] and t.owner_id = auth.uid())
  );

create policy "team owner deletes logo" on storage.objects for delete
  using (
    bucket_id = 'team-logos'
    and exists (select 1 from public.teams t where t.id::text = (storage.foldername(name))[1] and t.owner_id = auth.uid())
  );
