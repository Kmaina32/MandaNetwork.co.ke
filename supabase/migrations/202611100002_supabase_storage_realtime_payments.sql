-- Supabase-native payment, media and live-session foundations.
-- No Firebase records are imported.

create unique index if not exists payment_transactions_reference_key
  on public.payment_transactions(reference);

create table if not exists public.live_sessions (
  id text primary key,
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists live_sessions_status_created_idx
  on public.live_sessions(status, created_at desc);

create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 4000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists live_messages_session_created_idx
  on public.live_messages(session_id, created_at);

create table if not exists public.live_reactions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (char_length(reaction) between 1 and 16),
  created_at timestamptz not null default now()
);
create index if not exists live_reactions_session_created_idx
  on public.live_reactions(session_id, created_at desc);

alter table public.live_sessions enable row level security;
alter table public.live_messages enable row level security;
alter table public.live_reactions enable row level security;

drop policy if exists live_sessions_read_authenticated on public.live_sessions;
create policy live_sessions_read_authenticated on public.live_sessions
for select to authenticated using (status = 'live' or host_id = auth.uid() or public.has_role(auth.uid(), array['admin','super_admin']));

drop policy if exists live_sessions_host_manage on public.live_sessions;
create policy live_sessions_host_manage on public.live_sessions
for all to authenticated using (host_id = auth.uid() or public.has_role(auth.uid(), array['admin','super_admin']))
with check (host_id = auth.uid() or public.has_role(auth.uid(), array['admin','super_admin']));

drop policy if exists live_messages_read_live on public.live_messages;
create policy live_messages_read_live on public.live_messages
for select to authenticated using (
  exists (select 1 from public.live_sessions s where s.id = session_id and s.status = 'live')
  or public.has_role(auth.uid(), array['admin','super_admin'])
);

drop policy if exists live_messages_insert_self on public.live_messages;
create policy live_messages_insert_self on public.live_messages
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.live_sessions s where s.id = session_id and s.status = 'live')
);

drop policy if exists live_reactions_read_live on public.live_reactions;
create policy live_reactions_read_live on public.live_reactions
for select to authenticated using (
  exists (select 1 from public.live_sessions s where s.id = session_id and s.status = 'live')
  or public.has_role(auth.uid(), array['admin','super_admin'])
);

drop policy if exists live_reactions_insert_self on public.live_reactions;
create policy live_reactions_insert_self on public.live_reactions
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.live_sessions s where s.id = session_id and s.status = 'live')
);

-- Private bucket: object paths begin with the authenticated owner's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academy-assets', 'academy-assets', false, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','video/webm'])
on conflict (id) do update set public = false, file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists academy_assets_read_owner_or_admin on storage.objects;
create policy academy_assets_read_owner_or_admin on storage.objects
for select to authenticated using (
  bucket_id = 'academy-assets'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), array['admin','super_admin']))
);

drop policy if exists academy_assets_insert_owner on storage.objects;
create policy academy_assets_insert_owner on storage.objects
for insert to authenticated with check (
  bucket_id = 'academy-assets' and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists academy_assets_update_owner on storage.objects;
create policy academy_assets_update_owner on storage.objects
for update to authenticated using (
  bucket_id = 'academy-assets' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'academy-assets' and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists academy_assets_delete_owner on storage.objects;
create policy academy_assets_delete_owner on storage.objects
for delete to authenticated using (
  bucket_id = 'academy-assets' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), array['admin','super_admin']))
);

-- Supabase Realtime must publish these tables for browser subscriptions.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_messages'
  ) then alter publication supabase_realtime add table public.live_messages; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_reactions'
  ) then alter publication supabase_realtime add table public.live_reactions; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_sessions'
  ) then alter publication supabase_realtime add table public.live_sessions; end if;
end $$;
