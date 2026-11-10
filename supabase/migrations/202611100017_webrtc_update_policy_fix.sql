drop policy if exists academy_live_signals_update on public.academy_records;
create policy academy_live_signals_update on public.academy_records for update to authenticated
using (
  (collection='webrtc-offers' and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live' and s.host_id=auth.uid()))
  or (collection in ('webrtc-answers','webrtc-candidates') and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live'))
)
with check (
  (collection='webrtc-offers' and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live' and s.host_id=auth.uid()))
  or (collection in ('webrtc-answers','webrtc-candidates') and exists(select 1 from public.live_sessions s where s.id=record_id and s.status='live'))
);