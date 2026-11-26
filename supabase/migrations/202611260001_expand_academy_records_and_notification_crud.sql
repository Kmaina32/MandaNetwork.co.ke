-- Expand the compatibility records table beyond WebRTC signaling.
-- Authorization remains enforced by the existing row-level security policies.
do $$
declare constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.academy_records'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%collection%'
  loop
    execute format('alter table public.academy_records drop constraint %I', constraint_row.conname);
  end loop;
end $$;

alter table public.academy_records
  add constraint academy_records_collection_name_check
  check (collection ~ '^[A-Za-z][A-Za-z0-9_-]{0,63}$');

-- Mutations are deliberately limited to the signed-in user's own notifications.
-- The function runs as the caller, so notification RLS policies remain in force.
create or replace function public.update_own_notifications(
  p_notification_ids text[],
  p_action text
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Sign-in is required.';
  end if;

  if p_action is null or p_action not in ('mark_read', 'archive', 'delete') then
    raise exception 'Unsupported notification action.';
  end if;

  if coalesce(cardinality(p_notification_ids), 0) = 0 then
    return 0;
  end if;

  if cardinality(p_notification_ids) > 100 then
    raise exception 'A maximum of 100 notifications can be changed at once.';
  end if;

  if p_action = 'mark_read' then
    update public.notifications
       set read_at = coalesce(read_at, now())
     where id = any(p_notification_ids)
       and user_id = auth.uid();
  elsif p_action = 'archive' then
    update public.notifications
       set content = coalesce(content, '{}'::jsonb) || jsonb_build_object('archived', true),
           read_at = coalesce(read_at, now())
     where id = any(p_notification_ids)
       and user_id = auth.uid();
  else
    delete from public.notifications
     where id = any(p_notification_ids)
       and user_id = auth.uid();
  end if;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.update_own_notifications(text[], text) from public, anon;
grant execute on function public.update_own_notifications(text[], text) to authenticated;
