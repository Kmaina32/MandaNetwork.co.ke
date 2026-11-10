drop policy if exists notifications_owner_select on public.notifications;
drop policy if exists notifications_owner_insert on public.notifications;
drop policy if exists notifications_owner_update on public.notifications;
drop policy if exists notifications_owner_delete on public.notifications;
create policy notifications_owner_select on public.notifications for select to authenticated
using (
  user_id=auth.uid()
  or public.has_role(auth.uid(),array['admin','super_admin'])
  or exists (
    select 1 from public.organization_members m
    where m.user_id=auth.uid() and m.organization_id=content->>'cohort'
      and m.status='active' and m.member_role in ('owner','admin','instructor')
  )
);
create policy notifications_owner_insert on public.notifications for insert to authenticated
with check (
  user_id=auth.uid()
  or public.has_role(auth.uid(),array['admin','super_admin'])
  or exists (
    select 1 from public.organization_members m
    where m.user_id=auth.uid() and m.organization_id=content->>'cohort'
      and m.status='active' and m.member_role in ('owner','admin','instructor')
  )
);
create policy notifications_owner_update on public.notifications for update to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']))
with check (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy notifications_owner_delete on public.notifications for delete to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));