drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.has_role(auth.uid(),array['admin','super_admin']))
with check (public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists enrollments_owner_delete on public.enrollments;
drop policy if exists enrollments_owner_insert on public.enrollments;
drop policy if exists enrollments_owner_select on public.enrollments;
drop policy if exists enrollments_owner_update on public.enrollments;
create policy enrollments_owner_delete on public.enrollments for delete to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy enrollments_owner_insert on public.enrollments for insert to authenticated
with check (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy enrollments_owner_select on public.enrollments for select to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy enrollments_owner_update on public.enrollments for update to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']))
with check (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists activity_logs_owner_read on public.activity_logs;
create policy activity_logs_owner_read on public.activity_logs for select to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists organizations_member_read on public.organizations;
create policy organizations_member_read on public.organizations for select to authenticated
using (owner_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists organizations_owner_update on public.organizations;
create policy organizations_owner_update on public.organizations for update to authenticated
using (owner_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']))
with check (owner_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));