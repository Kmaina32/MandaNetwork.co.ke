-- Final hardening for the Supabase-only academy cutover.
-- All data remains in Supabase; no Firebase records are imported.

create or replace function public.has_role(check_user_id uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path=public
as $$
  select check_user_id=(select auth.uid()) and exists (
    select 1 from public.user_roles where user_id=(select auth.uid()) and role=any(allowed_roles)
  );
$$;
create or replace function public.is_org_member(check_org_id text, check_user_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select check_user_id=(select auth.uid()) and (
    exists(select 1 from public.organization_members where organization_id=check_org_id and user_id=(select auth.uid()) and status='active')
    or exists(select 1 from public.organizations where id=check_org_id and owner_id=(select auth.uid()))
  );
$$;
revoke execute on function public.has_role(uuid,text[]) from public,anon;
grant execute on function public.has_role(uuid,text[]) to authenticated;
revoke execute on function public.is_org_member(text,uuid) from public,anon;
grant execute on function public.is_org_member(text,uuid) to authenticated;

alter table public.payment_transactions drop constraint if exists payment_transactions_provider_check;
alter table public.payment_transactions add constraint payment_transactions_provider_check check(provider in ('paystack','mpesa'));
alter table public.payment_transactions drop constraint if exists payment_transactions_status_check;
alter table public.payment_transactions add constraint payment_transactions_status_check check(status in ('initialized','pending','success','failed','reversed','review_required'));

drop policy if exists org_invitation_insert on public.organization_invitations;
create policy org_invitation_insert on public.organization_invitations for insert to authenticated
with check (
  invited_by=(select auth.uid()) and (
    public.has_role((select auth.uid()),array['admin','super_admin'])
    or exists(select 1 from public.organizations o where o.id=organization_invitations.organization_id and o.owner_id=(select auth.uid()))
    or exists(select 1 from public.organization_members m where m.organization_id=organization_invitations.organization_id
      and m.user_id=(select auth.uid()) and m.status='active' and m.member_role in ('owner','admin'))
  )
);
drop policy if exists organization_invitee_add_self on public.organization_members;
create policy organization_invitee_add_self on public.organization_members for insert to authenticated
with check (
  user_id=(select auth.uid()) and exists (
    select 1 from public.organization_invitations i
    where i.organization_id=organization_members.organization_id and i.status='accepted'
      and (i.invited_user_id=(select auth.uid()) or lower(i.email)=lower(coalesce(auth.jwt()->>'email','')))
      and i.member_role=organization_members.member_role
  )
);
drop policy if exists org_invitation_update on public.organization_invitations;
revoke update on public.organization_invitations from anon,authenticated;

drop policy if exists academy_records_read on public.academy_records;
create policy academy_records_read on public.academy_records for select to anon,authenticated
using (
  collection in ('publicProfiles','blog','programs','bundles','plans','pricingPlans','bootcamps','hackathons','teamMembers','advertisements','calendarEvents','forms','publicCertificates','leaderboard')
  or (select auth.uid())=owner_id
  or public.has_role((select auth.uid()),array['admin','super_admin'])
  or (collection='conversations' and exists(select 1 from public.organization_members m where m.organization_id=data->>'organizationId'
    and m.user_id=(select auth.uid()) and m.status='active' and m.member_role in ('owner','admin','instructor')))
  or (collection like 'webrtc-%' and exists(select 1 from public.live_sessions s where s.id=academy_records.record_id and s.status='live'))
  or (collection='assignments' and exists(select 1 from public.enrollments e where e.user_id=(select auth.uid())
    and e.course_id=coalesce(data->>'courseId',data->>'course_id')))
);
drop policy if exists academy_records_insert on public.academy_records;
create policy academy_records_insert on public.academy_records for insert to authenticated
with check (
  (select auth.uid())=owner_id or public.has_role((select auth.uid()),array['admin','super_admin'])
  or (collection='conversations' and exists(select 1 from public.organization_members m where m.organization_id=data->>'organizationId'
    and m.user_id=(select auth.uid()) and m.status='active' and m.member_role in ('owner','admin','instructor')))
  or (collection like 'webrtc-%' and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live'))
);
drop policy if exists academy_records_update on public.academy_records;
create policy academy_records_update on public.academy_records for update to authenticated
using (
  (select auth.uid())=owner_id or public.has_role((select auth.uid()),array['admin','super_admin'])
  or (collection='conversations' and exists(select 1 from public.organization_members m where m.organization_id=data->>'organizationId'
    and m.user_id=(select auth.uid()) and m.status='active' and m.member_role in ('owner','admin','instructor')))
  or (collection like 'webrtc-%' and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live'))
)
with check (
  (select auth.uid())=owner_id or public.has_role((select auth.uid()),array['admin','super_admin'])
  or (collection='conversations' and exists(select 1 from public.organization_members m where m.organization_id=data->>'organizationId'
    and m.user_id=(select auth.uid()) and m.status='active' and m.member_role in ('owner','admin','instructor')))
  or (collection like 'webrtc-%' and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live'))
);

grant select,insert,update on public.server_action_rate_limits to authenticated;
drop policy if exists server_action_rate_limits_owner_all on public.server_action_rate_limits;
create policy server_action_rate_limits_owner_all on public.server_action_rate_limits for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create or replace function public.consume_server_action_rate_limit(p_action text,p_max_calls integer,p_window_seconds integer)
returns boolean language plpgsql security invoker set search_path=public
as $$
declare v_count integer; v_limit integer;
begin
  if auth.uid() is null then raise exception 'Sign-in is required.'; end if;
  if p_action not in ('getLearningPath','runContentStrategy','courseTutor','generateApiKey','generateCourseContent',
    'generateExam','generateProject','gradeShortAnswerExam','siteHelp','studentHelp','textToSpeech','speechToText',
    'sendOrganizationInvite','generateFormalDocument','generateHackathonIdeas','getPortfolioFeedback') then
    raise exception 'Invalid rate limit action.';
  end if;
  v_limit:=case when p_action='courseTutor' then 60 else 12 end;
  insert into public.server_action_rate_limits(user_id,action_name,window_started_at,request_count)
  values(auth.uid(),p_action,now(),1)
  on conflict(user_id,action_name) do update set
    request_count=case when server_action_rate_limits.window_started_at<now()-interval '10 minutes' then 1 else server_action_rate_limits.request_count+1 end,
    window_started_at=case when server_action_rate_limits.window_started_at<now()-interval '10 minutes' then now() else server_action_rate_limits.window_started_at end
  returning request_count into v_count;
  return v_count<=v_limit;
end;
$$;
revoke all on function public.consume_server_action_rate_limit(text,integer,integer) from public,anon;
grant execute on function public.consume_server_action_rate_limit(text,integer,integer) to authenticated;
revoke all on function public.award_hackathon_submission_points() from public,anon,authenticated;
revoke all on function public.enforce_hackathon_submission_limit() from public,anon,authenticated;

create or replace function public.accept_organization_invitation(p_invite_id uuid)
returns text language plpgsql security definer set search_path=public
as $$
declare invite public.organization_invitations%rowtype; caller_email text;
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  select email into caller_email from auth.users where id=auth.uid();
  select * into invite from public.organization_invitations where id=p_invite_id for update;
  if not found then raise exception 'Invitation not found.'; end if;
  if invite.status='accepted' and invite.invited_user_id=auth.uid() then return invite.organization_id; end if;
  if invite.status<>'pending' then raise exception 'Invitation is no longer pending.'; end if;
  if invite.expires_at is not null and invite.expires_at<=now() then raise exception 'Invitation has expired.'; end if;
  if lower(coalesce(invite.email,''))<>lower(coalesce(caller_email,'')) then raise exception 'Invitation email does not match the signed-in account.'; end if;
  insert into public.organization_members(organization_id,user_id,member_role,status,joined_at)
  values(invite.organization_id,auth.uid(),coalesce(invite.member_role,'member'),'active',now())
  on conflict(organization_id,user_id) do update set member_role=excluded.member_role,status='active',
    joined_at=coalesce(public.organization_members.joined_at,now());
  update public.organization_invitations set status='accepted',invited_user_id=auth.uid(),
    content=coalesce(content,'{}'::jsonb)||jsonb_build_object('acceptedAt',now()) where id=p_invite_id and status='pending';
  update public.profiles set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('organizationId',invite.organization_id),updated_at=now()
    where id=auth.uid();
  return invite.organization_id;
end;
$$;
revoke all on function public.accept_organization_invitation(uuid) from public,anon;
grant execute on function public.accept_organization_invitation(uuid) to authenticated;

create or replace function public.delete_user_account(p_user_id uuid)
returns boolean language plpgsql security definer set search_path=public
as $$
declare caller_is_super boolean; target_is_super boolean;
begin
  if auth.uid() is null or not public.has_role(auth.uid(),array['admin','super_admin']) then raise exception 'Administrator access is required.'; end if;
  if p_user_id=auth.uid() then raise exception 'You cannot delete your own active account.'; end if;
  select public.has_role(auth.uid(),array['super_admin']) into caller_is_super;
  select exists(select 1 from public.user_roles where user_id=p_user_id and role='super_admin') into target_is_super;
  if target_is_super and not caller_is_super then raise exception 'Only a super administrator can delete another super administrator.'; end if;
  delete from auth.users where id=p_user_id;
  return found;
end;
$$;
revoke all on function public.delete_user_account(uuid) from public,anon;
grant execute on function public.delete_user_account(uuid) to authenticated;

drop function if exists public.validate_api_key_and_consume(text);
create function public.validate_api_key_and_consume(p_key_hash text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare owner uuid; current_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  select user_id into owner from public.user_api_keys where key_hash=p_key_hash and revoked_at is null limit 1;
  if owner is null then return false; end if;
  insert into public.api_rate_limits(user_id,usage_date,request_count,updated_at)
  values(owner,current_date,1,now())
  on conflict(user_id,usage_date) do update set request_count=public.api_rate_limits.request_count+1,updated_at=now()
  where public.api_rate_limits.request_count<1000 returning request_count into current_count;
  if current_count is null then return false; end if;
  insert into public.api_usage(user_id,endpoint) values(owner,'/api/courses');
  return true;
end;
$$;
revoke all on function public.validate_api_key_and_consume(text) from public;
grant execute on function public.validate_api_key_and_consume(text) to anon,authenticated;

grant select,insert on public.payment_transactions to authenticated;
revoke update,delete on public.payment_transactions from authenticated;
drop policy if exists payment_transactions_owner_insert on public.payment_transactions;
create policy payment_transactions_owner_insert on public.payment_transactions for insert to authenticated
with check(user_id=(select auth.uid()) and item_type='course'
  and ((provider='paystack' and status='initialized') or (provider='mpesa' and status='pending'))
  and exists(select 1 from public.courses c where c.id=item_id and c.is_published=true and c.price=amount_kes));
create or replace function public.set_paystack_checkout_status(p_reference text,p_status text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare changed integer;
begin
  if auth.uid() is null or p_status not in ('pending','failed') then raise exception 'Invalid checkout status update.'; end if;
  update public.payment_transactions set status=p_status,updated_at=now()
  where reference=p_reference and user_id=auth.uid() and provider='paystack' and status='initialized';
  get diagnostics changed=row_count;
  return changed=1;
end;
$$;
revoke all on function public.set_paystack_checkout_status(text,text) from public,anon;
grant execute on function public.set_paystack_checkout_status(text,text) to authenticated;

-- Public image uploads use a separate public bucket; documents remain in private academy-assets.
drop policy if exists "Academy admins delete media" on storage.objects;
drop policy if exists "Academy admins update media" on storage.objects;
drop policy if exists "Academy admins upload media" on storage.objects;
drop policy if exists "Academy media is publicly readable" on storage.objects;
drop policy if exists academy_media_public_read on storage.objects;
drop policy if exists academy_media_owner_insert on storage.objects;
drop policy if exists academy_media_owner_update on storage.objects;
drop policy if exists academy_media_owner_delete on storage.objects;
create policy academy_media_public_read on storage.objects for select to anon,authenticated using(bucket_id='academy-media');
create policy academy_media_owner_insert on storage.objects for insert to authenticated with check(bucket_id='academy-media' and (
  (storage.foldername(name))[1]=(select auth.uid())::text or public.has_role((select auth.uid()),array['admin','super_admin'])
));
create policy academy_media_owner_update on storage.objects for update to authenticated
using(bucket_id='academy-media' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.has_role((select auth.uid()),array['admin','super_admin'])))
with check(bucket_id='academy-media' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.has_role((select auth.uid()),array['admin','super_admin'])));
create policy academy_media_owner_delete on storage.objects for delete to authenticated
using(bucket_id='academy-media' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.has_role((select auth.uid()),array['admin','super_admin'])));
update storage.buckets set file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'] where id='academy-media';
update storage.buckets set file_size_limit=52428800 where id='academy-assets';
