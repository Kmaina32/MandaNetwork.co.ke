create table if not exists public.live_signals (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('host','student')),
  signal_type text not null check (signal_type in ('offer','answer','ice_candidate','hand_raised','hand_lowered')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists live_signals_session_created_idx on public.live_signals(session_id,created_at);
create index if not exists live_signals_recipient_idx on public.live_signals(recipient_id,created_at);
alter table public.live_signals enable row level security;
drop policy if exists live_signals_read_participants on public.live_signals;
create policy live_signals_read_participants on public.live_signals for select to authenticated
using (
  exists (select 1 from public.live_sessions s where s.id=session_id and s.status='live'
    and (s.host_id=auth.uid() or recipient_id=auth.uid() or (sender_role='host' and signal_type='offer')))
);
drop policy if exists live_signals_insert_participant on public.live_signals;
create policy live_signals_insert_participant on public.live_signals for insert to authenticated
with check (
  user_id=auth.uid() and exists (
    select 1 from public.live_sessions s where s.id=session_id and s.status='live'
    and ((s.host_id=auth.uid() and sender_role='host') or (s.host_id<>auth.uid() and sender_role='student'))
  )
);
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='live_signals') then
    alter publication supabase_realtime add table public.live_signals;
  end if;
end $$;
