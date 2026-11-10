create table if not exists public.app_settings (
  key text primary key, value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now()
);
create table if not exists public.user_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  notes text not null default '', updated_at timestamptz not null default now(),
  primary key(user_id,course_id)
);
create table if not exists public.tutor_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null, lesson_id text not null,
  messages jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now(),
  primary key(user_id,course_id,lesson_id)
);
alter table public.submissions add column if not exists updated_at timestamptz not null default now();

alter table public.app_settings enable row level security;
alter table public.calendar_events enable row level security;
alter table public.user_notes enable row level security;
alter table public.tutor_history enable row level security;
alter table public.submissions enable row level security;

drop policy if exists app_settings_public_read on public.app_settings;
create policy app_settings_public_read on public.app_settings for select to anon,authenticated using (key in ('hero','tutor_settings','certificate_settings'));
drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings for all to authenticated
using (public.has_role(auth.uid(),array['admin','super_admin']))
with check (public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists calendar_events_public_read on public.calendar_events;
create policy calendar_events_public_read on public.calendar_events for select to anon,authenticated using (true);
drop policy if exists calendar_events_admin_write on public.calendar_events;
create policy calendar_events_admin_write on public.calendar_events for all to authenticated
using (public.has_role(auth.uid(),array['admin','super_admin']))
with check (public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists user_notes_owner_all on public.user_notes;
create policy user_notes_owner_all on public.user_notes for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists tutor_history_owner_all on public.tutor_history;
create policy tutor_history_owner_all on public.tutor_history for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists submissions_owner_read on public.submissions;
create policy submissions_owner_read on public.submissions for select to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists submissions_owner_insert on public.submissions;
create policy submissions_owner_insert on public.submissions for insert to authenticated
with check (user_id=auth.uid());
drop policy if exists submissions_owner_update on public.submissions;
create policy submissions_owner_update on public.submissions for update to authenticated
using (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']))
with check (user_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists submissions_admin_delete on public.submissions;
create policy submissions_admin_delete on public.submissions for delete to authenticated
using (public.has_role(auth.uid(),array['admin','super_admin']));