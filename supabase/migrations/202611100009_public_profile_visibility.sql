drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to anon,authenticated
using (coalesce(metadata->>'isPublic','false')='true');