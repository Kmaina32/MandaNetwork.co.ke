create table if not exists public.server_action_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action_name text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  primary key(user_id,action_name)
);
alter table public.server_action_rate_limits enable row level security;

create or replace function public.consume_server_action_rate_limit(p_action text,p_max_calls integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Sign-in is required.'; end if;
  if p_action is null or length(p_action)>100 or p_max_calls<1 or p_max_calls>1000 or p_window_seconds<1 or p_window_seconds>86400 then
    raise exception 'Invalid rate limit parameters.';
  end if;
  insert into public.server_action_rate_limits(user_id,action_name,window_started_at,request_count)
  values(auth.uid(),p_action,now(),1)
  on conflict(user_id,action_name) do update set
    request_count=case when server_action_rate_limits.window_started_at < now()-make_interval(secs=>p_window_seconds) then 1 else server_action_rate_limits.request_count+1 end,
    window_started_at=case when server_action_rate_limits.window_started_at < now()-make_interval(secs=>p_window_seconds) then now() else server_action_rate_limits.window_started_at end
  returning request_count into v_count;
  return v_count<=p_max_calls;
end $$;
revoke all on function public.consume_server_action_rate_limit(text,integer,integer) from public,anon;
grant execute on function public.consume_server_action_rate_limit(text,integer,integer) to authenticated;

create or replace function public.award_manual_leaderboard_points(p_target_user_id uuid,p_points integer)
returns void language plpgsql security definer set search_path=public
as $$
declare v_profile public.profiles%rowtype;
begin
  if not public.has_role(auth.uid(),array['admin','super_admin']) then raise exception 'Administrator access is required.'; end if;
  if p_points<1 or p_points>1000 then raise exception 'Points must be between 1 and 1000.'; end if;
  select * into v_profile from public.profiles where id=p_target_user_id;
  if not found then raise exception 'The selected learner no longer exists.'; end if;
  insert into public.leaderboard(user_id,user_name,user_avatar,score,hackathon_count,updated_at)
  values(p_target_user_id,coalesce(v_profile.display_name,'Learner'),coalesce(v_profile.avatar_path,''),p_points,0,now())
  on conflict(user_id) do update set score=leaderboard.score+excluded.score,user_name=excluded.user_name,user_avatar=excluded.user_avatar,updated_at=now();
end $$;
revoke all on function public.award_manual_leaderboard_points(uuid,integer) from public,anon;
grant execute on function public.award_manual_leaderboard_points(uuid,integer) to authenticated;

create or replace function public.grade_submission_and_issue_certificate(
  p_submission_id text,p_points numeric,p_feedback text,p_certificate jsonb default null
) returns void language plpgsql security definer set search_path=public
as $$
declare v_submission public.submissions%rowtype; v_content jsonb;
begin
  if not public.has_role(auth.uid(),array['admin','super_admin']) then raise exception 'Administrator access is required.'; end if;
  if p_points<0 or p_feedback is null or length(p_feedback)>50000 then raise exception 'Invalid grade payload.'; end if;
  select * into v_submission from public.submissions where id=p_submission_id for update;
  if not found then raise exception 'Submission not found.'; end if;
  if coalesce((v_submission.content->>'graded')::boolean,false) or v_submission.graded_at is not null then raise exception 'This submission has already been graded.'; end if;
  v_content=coalesce(v_submission.content,'{}'::jsonb)||jsonb_build_object('graded',true,'pointsAwarded',p_points,'feedback',p_feedback,'gradedAt',now());
  update public.submissions set content=v_content,graded_at=now(),updated_at=now() where id=p_submission_id;
  if p_certificate is not null then
    if p_certificate->>'courseId' is distinct from v_submission.course_id
      or coalesce(p_certificate->>'certificateId','') !~ '^[A-Za-z0-9_-]{1,128}$'
      or coalesce(p_certificate->>'studentName','')='' then raise exception 'Certificate does not match this submission.'; end if;
    insert into public.certificate_records(id,user_id,course_id,certificate_code,content)
    values(p_certificate->>'certificateId',v_submission.user_id,v_submission.course_id,p_certificate->>'certificateId',p_certificate||jsonb_build_object('status','valid'))
    on conflict(id) do update set content=excluded.content,certificate_code=excluded.certificate_code;
    update public.enrollments set content=coalesce(content,'{}'::jsonb)||jsonb_build_object('certificateAvailable',true,'certificateId',p_certificate->>'certificateId'),updated_at=now()
    where user_id=v_submission.user_id and course_id=v_submission.course_id;
  end if;
end $$;
revoke all on function public.grade_submission_and_issue_certificate(text,numeric,text,jsonb) from public,anon;
grant execute on function public.grade_submission_and_issue_certificate(text,numeric,text,jsonb) to authenticated;

drop policy if exists organizations_member_read on public.organizations;
create policy organizations_member_read on public.organizations for select to authenticated
using (owner_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']) or public.is_org_member(id,auth.uid()));