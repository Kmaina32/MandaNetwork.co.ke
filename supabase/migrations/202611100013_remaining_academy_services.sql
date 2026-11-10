create table if not exists public.course_feedback (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade, rating integer check (rating between 1 and 5),
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.learning_goals (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active', content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.permission_requests (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null, status text not null default 'pending',
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.documents (
  id text primary key, user_id uuid references auth.users(id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private','public')),
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.certificate_records (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null, certificate_code text not null unique,
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.bootcamp_registrations (
  id uuid primary key default gen_random_uuid(), bootcamp_id text not null references public.bootcamps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique(bootcamp_id,user_id)
);
create table if not exists public.advertisements (
  id text primary key, title text not null, is_active boolean not null default false,
  content jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.team_members (
  id text primary key, content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0, updated_at timestamptz not null default now()
);
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null,
  message text not null, read_at timestamptz, content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.forms (
  id text primary key, slug text unique, title text not null, is_published boolean not null default false,
  content jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(), form_id text not null references public.forms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(), affiliate_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null, content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.discussion_threads (
  id text primary key, course_id text not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.discussion_replies (
  id text primary key, thread_id text not null references public.discussion_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.conversations (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(), conversation_id text not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, key_hash text not null, key_prefix text not null, revoked_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['course_feedback','learning_goals','permission_requests','documents','certificate_records','bootcamp_registrations','advertisements','team_members','contact_messages','forms','form_submissions','referrals','discussion_threads','discussion_replies','conversations','conversation_messages','user_api_keys'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

create policy course_feedback_read on public.course_feedback for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy course_feedback_insert on public.course_feedback for insert to authenticated with check (user_id=auth.uid());

create policy learning_goals_owner_all on public.learning_goals for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy permission_requests_read on public.permission_requests for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy permission_requests_insert on public.permission_requests for insert to authenticated with check (user_id=auth.uid());
create policy permission_requests_admin_update on public.permission_requests for update to authenticated using (public.has_role(auth.uid(),array['admin','super_admin'])) with check (public.has_role(auth.uid(),array['admin','super_admin']));

create policy documents_owner_or_public_read on public.documents for select to anon,authenticated using (visibility='public' or user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy documents_owner_all on public.documents for all to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin'])) with check (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy certificate_public_verify on public.certificate_records for select to anon,authenticated using (true);
create policy certificate_owner_insert on public.certificate_records for insert to authenticated with check (user_id=auth.uid());
create policy bootcamp_registrations_read on public.bootcamp_registrations for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy bootcamp_registrations_insert on public.bootcamp_registrations for insert to authenticated with check (user_id=auth.uid());

create policy advertisements_public_read on public.advertisements for select to anon,authenticated using (is_active or public.has_role(auth.uid(),array['admin','super_admin']));
create policy advertisements_admin_write on public.advertisements for all to authenticated using (public.has_role(auth.uid(),array['admin','super_admin'])) with check (public.has_role(auth.uid(),array['admin','super_admin']));
create policy team_members_public_read on public.team_members for select to anon,authenticated using (true);
create policy team_members_admin_write on public.team_members for all to authenticated using (public.has_role(auth.uid(),array['admin','super_admin'])) with check (public.has_role(auth.uid(),array['admin','super_admin']));

create policy contact_messages_public_insert on public.contact_messages for insert to anon,authenticated with check (true);
create policy contact_messages_admin_read on public.contact_messages for select to authenticated using (public.has_role(auth.uid(),array['admin','super_admin']));
create policy contact_messages_admin_update on public.contact_messages for update to authenticated using (public.has_role(auth.uid(),array['admin','super_admin'])) with check (public.has_role(auth.uid(),array['admin','super_admin']));
create policy contact_messages_admin_delete on public.contact_messages for delete to authenticated using (public.has_role(auth.uid(),array['admin','super_admin']));

create policy forms_public_read on public.forms for select to anon,authenticated using (is_published or public.has_role(auth.uid(),array['admin','super_admin']));
create policy forms_admin_write on public.forms for all to authenticated using (public.has_role(auth.uid(),array['admin','super_admin'])) with check (public.has_role(auth.uid(),array['admin','super_admin']));
create policy form_submissions_insert on public.form_submissions for insert to anon,authenticated with check (user_id is null or user_id=auth.uid());
create policy form_submissions_read on public.form_submissions for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));

create policy referrals_owner_read on public.referrals for select to authenticated using (affiliate_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy referrals_owner_insert on public.referrals for insert to authenticated with check (affiliate_id=auth.uid());

create policy discussion_threads_read on public.discussion_threads for select to authenticated using (true);
create policy discussion_threads_insert on public.discussion_threads for insert to authenticated with check (user_id=auth.uid());
create policy discussion_threads_update on public.discussion_threads for update to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin'])) with check (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
create policy discussion_replies_read on public.discussion_replies for select to authenticated using (true);
create policy discussion_replies_insert on public.discussion_replies for insert to authenticated with check (user_id=auth.uid());

create policy conversations_owner_all on public.conversations for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy conversation_messages_owner_all on public.conversation_messages for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy user_api_keys_owner_all on public.user_api_keys for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());