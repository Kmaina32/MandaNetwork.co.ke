-- Replace legacy JWT app_metadata role checks with database-backed roles.
do $$
declare t text;
begin
  foreach t in array array['programs','bootcamps','blog_posts','assignments'] loop
    execute format('drop policy if exists %I on public.%I', t||'_admin_delete', t);
    execute format('drop policy if exists %I on public.%I', t||'_admin_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_role(auth.uid(), array[''admin'',''super_admin'']))', t||'_admin_delete', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_role(auth.uid(), array[''admin'',''super_admin'']))', t||'_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_role(auth.uid(), array[''admin'',''super_admin''])) with check (public.has_role(auth.uid(), array[''admin'',''super_admin'']))', t||'_admin_update', t);
  end loop;
end $$;

drop policy if exists profiles_org_member_read on public.profiles;
create policy profiles_org_member_read on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.user_id=profiles.id and public.is_org_member(m.organization_id,auth.uid()) and m.status='active'
  )
);

drop policy if exists organization_owner_add_self on public.organization_members;
create policy organization_owner_add_self on public.organization_members for insert to authenticated
with check (
  user_id=auth.uid() and member_role='owner'
  and exists (select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid())
);

drop policy if exists organizations_owner_delete on public.organizations;
create policy organizations_owner_delete on public.organizations for delete to authenticated
using (owner_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));