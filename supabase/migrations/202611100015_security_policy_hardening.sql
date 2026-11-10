drop policy if exists activity_logs_admin_delete on public.activity_logs;
create policy activity_logs_admin_delete on public.activity_logs for delete to authenticated
using (public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists certificate_owner_insert on public.certificate_records;
create policy certificate_admin_insert on public.certificate_records for insert to authenticated
with check (public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists certificate_admin_update on public.certificate_records;
create policy certificate_admin_update on public.certificate_records for update to authenticated
using (public.has_role(auth.uid(),array['admin','super_admin']))
with check (public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists form_submissions_insert on public.form_submissions;
create policy form_submissions_insert on public.form_submissions for insert to anon,authenticated
with check (
  (user_id is null or user_id=auth.uid())
  and exists(select 1 from public.forms f where f.id=form_id and f.is_published=true)
);

drop policy if exists org_invitation_read on public.organization_invitations;
create policy org_invitation_read on public.organization_invitations for select to authenticated
using (
  invited_user_id=auth.uid() or lower(email)=lower(coalesce(auth.jwt()->>'email',''))
  or invited_by=auth.uid() or public.is_org_member(organization_id,auth.uid())
  or public.has_role(auth.uid(),array['admin','super_admin'])
);

create or replace function public.enforce_hackathon_submission_limit()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.hackathon_id),hashtext(new.user_id::text));
  if (select count(*) from public.hackathon_submissions where hackathon_id=new.hackathon_id and user_id=new.user_id) >= 3 then
    raise exception 'You have reached the maximum of 3 submissions for this hackathon.';
  end if;
  return new;
end;
$$;