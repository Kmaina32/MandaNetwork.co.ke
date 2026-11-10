drop policy if exists org_invitation_update on public.organization_invitations;
create policy org_invitation_update on public.organization_invitations for update to authenticated
using (
  invited_user_id=auth.uid()
  or lower(email)=lower(coalesce(auth.jwt()->>'email',''))
  or invited_by=auth.uid()
  or public.has_role(auth.uid(),array['admin','super_admin'])
)
with check (
  (invited_user_id=auth.uid() or lower(email)=lower(coalesce(auth.jwt()->>'email',''))) and status in ('accepted','declined')
  or invited_by=auth.uid()
  or public.has_role(auth.uid(),array['admin','super_admin'])
);

drop policy if exists organization_invitee_add_self on public.organization_members;
create policy organization_invitee_add_self on public.organization_members for insert to authenticated
with check (
  user_id=auth.uid() and exists (
    select 1 from public.organization_invitations i
    where i.organization_id=organization_id and i.status='accepted'
      and (i.invited_user_id=auth.uid() or lower(i.email)=lower(coalesce(auth.jwt()->>'email','')))
      and i.member_role=member_role
  )
);