-- Keep authorization decisions in the database-backed role table.
revoke execute on function public.has_role(uuid, text[]) from public, anon;
revoke execute on function public.is_org_member(text, uuid) from public, anon;
grant execute on function public.has_role(uuid, text[]) to authenticated;
grant execute on function public.is_org_member(text, uuid) to authenticated;

drop policy if exists courses_admin_delete on public.courses;
drop policy if exists courses_admin_insert on public.courses;
drop policy if exists courses_admin_update on public.courses;
drop policy if exists courses_public_read on public.courses;
create policy courses_admin_delete on public.courses for delete to authenticated
using (public.has_role(auth.uid(), array['admin','super_admin']));
create policy courses_admin_insert on public.courses for insert to authenticated
with check (public.has_role(auth.uid(), array['admin','super_admin']));
create policy courses_admin_update on public.courses for update to authenticated
using (public.has_role(auth.uid(), array['admin','super_admin']))
with check (public.has_role(auth.uid(), array['admin','super_admin']));
create policy courses_public_read on public.courses for select to anon, authenticated
using (is_published = true or public.has_role(auth.uid(), array['admin','super_admin']));

drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles for select to authenticated
using (public.has_role(auth.uid(), array['admin','super_admin']));