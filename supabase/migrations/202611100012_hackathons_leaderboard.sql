create table if not exists public.hackathons (
  id text primary key, title text not null, description text, is_published boolean not null default false,
  content jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.hackathon_participants (
  hackathon_id text not null references public.hackathons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Learner', avatar_path text,
  created_at timestamptz not null default now(),
  primary key(hackathon_id,user_id)
);
create table if not exists public.hackathon_submissions (
  id text primary key, hackathon_id text not null references public.hackathons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists hackathon_submissions_user_idx on public.hackathon_submissions(user_id,hackathon_id,created_at desc);
create table if not exists public.leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_name text not null default 'Learner', user_avatar text not null default '',
  score integer not null default 0, hackathon_count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.hackathons enable row level security;
alter table public.hackathon_participants enable row level security;
alter table public.hackathon_submissions enable row level security;
alter table public.leaderboard enable row level security;

drop policy if exists hackathons_public_read on public.hackathons;
create policy hackathons_public_read on public.hackathons for select to anon,authenticated
using (is_published or public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists hackathons_admin_write on public.hackathons;
create policy hackathons_admin_write on public.hackathons for all to authenticated
using (public.has_role(auth.uid(),array['admin','super_admin']))
with check (public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists hackathon_participants_read on public.hackathon_participants;
create policy hackathon_participants_read on public.hackathon_participants for select to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists hackathon_participants_insert_self on public.hackathon_participants;
create policy hackathon_participants_insert_self on public.hackathon_participants for insert to authenticated
with check (user_id=auth.uid());
drop policy if exists hackathon_participants_delete_self on public.hackathon_participants;
create policy hackathon_participants_delete_self on public.hackathon_participants for delete to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists hackathon_submissions_read on public.hackathon_submissions;
create policy hackathon_submissions_read on public.hackathon_submissions for select to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists hackathon_submissions_insert on public.hackathon_submissions;
create policy hackathon_submissions_insert on public.hackathon_submissions for insert to authenticated
with check (user_id=auth.uid());
drop policy if exists hackathon_submissions_delete on public.hackathon_submissions;
create policy hackathon_submissions_delete on public.hackathon_submissions for delete to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists leaderboard_public_read on public.leaderboard;
create policy leaderboard_public_read on public.leaderboard for select to anon,authenticated using (true);

create or replace function public.enforce_hackathon_submission_limit()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if (select count(*) from public.hackathon_submissions where hackathon_id=new.hackathon_id and user_id=new.user_id) >= 3 then
    raise exception 'You have reached the maximum of 3 submissions for this hackathon.';
  end if;
  return new;
end;
$$;
drop trigger if exists hackathon_submission_limit on public.hackathon_submissions;
create trigger hackathon_submission_limit before insert on public.hackathon_submissions
for each row execute function public.enforce_hackathon_submission_limit();

create or replace function public.award_hackathon_submission_points()
returns trigger language plpgsql security definer set search_path=public
as $$
declare first_for_hackathon boolean;
begin
  select not exists(select 1 from public.hackathon_submissions s
    where s.hackathon_id=new.hackathon_id and s.user_id=new.user_id and s.id<>new.id)
  into first_for_hackathon;
  insert into public.leaderboard(user_id,user_name,user_avatar,score,hackathon_count,updated_at)
  select new.user_id,coalesce(p.display_name,'Learner'),coalesce(p.avatar_path,''),10,
    case when first_for_hackathon then 1 else 0 end,now()
  from public.profiles p where p.id=new.user_id
  on conflict(user_id) do update set score=leaderboard.score+10,
    hackathon_count=leaderboard.hackathon_count+case when first_for_hackathon then 1 else 0 end,
    user_name=excluded.user_name,user_avatar=excluded.user_avatar,updated_at=now();
  return new;
end;
$$;
drop trigger if exists hackathon_submission_points on public.hackathon_submissions;
create trigger hackathon_submission_points after insert on public.hackathon_submissions
for each row execute function public.award_hackathon_submission_points();