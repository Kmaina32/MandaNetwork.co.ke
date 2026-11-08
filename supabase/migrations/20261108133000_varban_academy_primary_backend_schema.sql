-- Varban Academy Supabase-first schema (additive migration).
-- Legacy Firebase IDs remain text during data transfer.
create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists email text,
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.courses (
  id text primary key default gen_random_uuid()::text, slug text unique, title text not null,
  description text, category text, price numeric(12,2) not null default 0, image_url text,
  is_published boolean not null default false, content jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.programs (
  id text primary key default gen_random_uuid()::text, title text not null, description text,
  is_published boolean not null default false, content jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bootcamps (
  id text primary key default gen_random_uuid()::text, title text not null, description text,
  start_date timestamptz, is_published boolean not null default false,
  content jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.organizations (
  id text primary key default gen_random_uuid()::text, name text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.enrollments (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  completed boolean not null default false, content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, course_id)
);
create table if not exists public.assignments (
  id text primary key default gen_random_uuid()::text,
  course_id text references public.courses(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null, title text not null,
  content jsonb not null default '{}'::jsonb, due_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.submissions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id text references public.assignments(id) on delete set null,
  course_id text references public.courses(id) on delete set null,
  content jsonb not null default '{}'::jsonb, submitted_at timestamptz not null default now(),
  graded_at timestamptz
);
create table if not exists public.blog_posts (
  id text primary key default gen_random_uuid()::text, slug text unique, title text not null,
  is_published boolean not null default false, content jsonb not null default '{}'::jsonb,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.calendar_events (
  id text primary key default gen_random_uuid()::text, title text not null, starts_at timestamptz,
  content jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text, user_id uuid references auth.users(id) on delete cascade,
  title text not null, body jsonb not null default '{}'::jsonb, read_at timestamptz,
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.activity_logs (
  id text primary key default gen_random_uuid()::text, user_id uuid references auth.users(id) on delete cascade,
  event_type text not null, content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists enrollments_user_id_idx on public.enrollments(user_id);
create index if not exists submissions_user_id_idx on public.submissions(user_id);
create index if not exists notifications_user_id_created_at_idx on public.notifications(user_id, created_at desc);
create index if not exists activity_logs_user_id_created_at_idx on public.activity_logs(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.programs enable row level security;
alter table public.bootcamps enable row level security;
alter table public.organizations enable row level security;
alter table public.enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.blog_posts enable row level security;
alter table public.calendar_events enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists profile_select_own on public.profiles;
create policy profile_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists profile_insert_own on public.profiles;
create policy profile_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists profile_update_own on public.profiles;
create policy profile_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare t text;
begin
 foreach t in array array['courses','programs','bootcamps','blog_posts'] loop
  execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
  execute format('create policy %I on public.%I for select to anon, authenticated using (is_published = true or (auth.jwt()->''app_metadata''->>''role'') = ''admin'')', t || '_public_read', t);
  execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
  execute format('create policy %I on public.%I for all to authenticated using ((auth.jwt()->''app_metadata''->>''role'') = ''admin'') with check ((auth.jwt()->''app_metadata''->>''role'') = ''admin'')', t || '_admin_write', t);
 end loop;
end $$;

drop policy if exists organizations_member_read on public.organizations;
create policy organizations_member_read on public.organizations for select to authenticated
using (owner_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists organizations_owner_insert on public.organizations;
create policy organizations_owner_insert on public.organizations for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists organizations_owner_update on public.organizations;
create policy organizations_owner_update on public.organizations for update to authenticated
using (owner_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin')
with check (owner_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists enrollments_owner_access on public.enrollments;
create policy enrollments_owner_access on public.enrollments for all to authenticated
using (user_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin')
with check (user_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists assignments_read_signed_in on public.assignments;
create policy assignments_read_signed_in on public.assignments for select to authenticated using (true);
drop policy if exists assignments_admin_write on public.assignments;
create policy assignments_admin_write on public.assignments for all to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists submissions_owner_access on public.submissions;
create policy submissions_owner_access on public.submissions for all to authenticated
using (user_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin')
with check (user_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists calendar_events_read_signed_in on public.calendar_events;
create policy calendar_events_read_signed_in on public.calendar_events for select to authenticated using (true);
drop policy if exists calendar_events_admin_write on public.calendar_events;
create policy calendar_events_admin_write on public.calendar_events for all to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists notifications_owner_access on public.notifications;
create policy notifications_owner_access on public.notifications for all to authenticated
using (user_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin')
with check (user_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists activity_logs_owner_read on public.activity_logs;
create policy activity_logs_owner_read on public.activity_logs for select to authenticated
using (user_id = (select auth.uid()) or (auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists activity_logs_owner_insert on public.activity_logs;
create policy activity_logs_owner_insert on public.activity_logs for insert to authenticated with check (user_id = (select auth.uid()));

insert into storage.buckets (id,name,public) values
 ('course-materials','course-materials',false),('user-files','user-files',false),('avatars','avatars',true)
on conflict (id) do nothing;
drop policy if exists course_materials_authenticated_read on storage.objects;
create policy course_materials_authenticated_read on storage.objects for select to authenticated using (bucket_id='course-materials');
drop policy if exists course_materials_admin_write on storage.objects;
create policy course_materials_admin_write on storage.objects for all to authenticated
using (bucket_id='course-materials' and (auth.jwt()->'app_metadata'->>'role')='admin')
with check (bucket_id='course-materials' and (auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists user_files_owner_access on storage.objects;
create policy user_files_owner_access on storage.objects for all to authenticated
using (bucket_id='user-files' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='user-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects for select to anon,authenticated using (bucket_id='avatars');
drop policy if exists avatars_owner_write on storage.objects;
create policy avatars_owner_write on storage.objects for all to authenticated
using (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
