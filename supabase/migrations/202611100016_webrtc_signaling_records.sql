create table if not exists public.academy_records (
  collection text not null check (collection in ('webrtc-offers','webrtc-answers','webrtc-candidates')),
  record_id text not null, owner_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), primary key(collection,record_id)
);
create index if not exists academy_records_owner_idx on public.academy_records(owner_id);
alter table public.academy_records enable row level security;

drop policy if exists academy_live_signals_read on public.academy_records;
create policy academy_live_signals_read on public.academy_records for select to authenticated
using (
  collection in ('webrtc-offers','webrtc-answers','webrtc-candidates')
  and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live')
);
drop policy if exists academy_live_signals_insert on public.academy_records;
create policy academy_live_signals_insert on public.academy_records for insert to authenticated
with check (
  owner_id=auth.uid()
  and (
    (collection='webrtc-offers' and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live' and s.host_id=auth.uid()))
    or (collection in ('webrtc-answers','webrtc-candidates') and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live'))
  )
);
drop policy if exists academy_live_signals_update on public.academy_records;
create policy academy_live_signals_update on public.academy_records for update to authenticated
using (
  (collection='webrtc-offers' and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live' and s.host_id=auth.uid()))
  or (collection in ('webrtc-answers','webrtc-candidates') and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live'))
)
with check (
  owner_id=auth.uid()
  and (
    (collection='webrtc-offers' and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live' and s.host_id=auth.uid()))
    or (collection in ('webrtc-answers','webrtc-candidates') and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live'))
  )
);
drop policy if exists academy_live_signals_delete on public.academy_records;
create policy academy_live_signals_delete on public.academy_records for delete to authenticated
using (
  (collection='webrtc-offers' and exists(select 1 from public.live_sessions s where s.id=record_id and (s.host_id=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']))))
  or (collection in ('webrtc-answers','webrtc-candidates') and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live' and (s.host_id=auth.uid() or owner_id=auth.uid())))
);

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='academy_records') then
    alter publication supabase_realtime add table public.academy_records;
  end if;
end $$;