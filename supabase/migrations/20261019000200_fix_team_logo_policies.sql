-- Fix: in the first version of the team-logo policies, `name` inside the
-- subquery on public.teams resolved to teams.name instead of the uploaded
-- file's path, so uploads were always rejected. Qualify it as objects.name.

drop policy if exists "team owner uploads logo" on storage.objects;
drop policy if exists "team owner updates logo" on storage.objects;
drop policy if exists "team owner deletes logo" on storage.objects;

create policy "team owner uploads logo" on storage.objects for insert
  with check (
    bucket_id = 'team-logos'
    and exists (select 1 from public.teams t where t.id::text = (storage.foldername(objects.name))[1] and t.owner_id = auth.uid())
  );

create policy "team owner updates logo" on storage.objects for update
  using (
    bucket_id = 'team-logos'
    and exists (select 1 from public.teams t where t.id::text = (storage.foldername(objects.name))[1] and t.owner_id = auth.uid())
  );

create policy "team owner deletes logo" on storage.objects for delete
  using (
    bucket_id = 'team-logos'
    and exists (select 1 from public.teams t where t.id::text = (storage.foldername(objects.name))[1] and t.owner_id = auth.uid())
  );
