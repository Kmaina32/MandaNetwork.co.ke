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


-- Atomic nested-record operations prevent concurrent writers from overwriting
-- unrelated paths in the same compatibility record.
create or replace function public.academy_jsonb_set_path(
  p_target jsonb, p_path text[], p_value jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  target_object jsonb := case when jsonb_typeof(p_target) = 'object' then p_target else '{}'::jsonb end;
begin
  if coalesce(cardinality(p_path), 0) = 0 then return p_value; end if;
  if cardinality(p_path) = 1 then
    return jsonb_set(target_object, array[p_path[1]], p_value, true);
  end if;
  return jsonb_set(
    target_object,
    array[p_path[1]],
    public.academy_jsonb_set_path(target_object -> p_path[1], p_path[2:], p_value),
    true
  );
end;
$$;

create or replace function public.academy_jsonb_deep_merge(p_target jsonb, p_patch jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  result_value jsonb := case when jsonb_typeof(p_target) = 'object' then p_target else '{}'::jsonb end;
  entry record;
  current_number numeric;
  increment_number numeric;
begin
  if jsonb_typeof(p_patch) <> 'object' then return p_patch; end if;
  for entry in select key, value from jsonb_each(p_patch)
  loop
    if jsonb_typeof(entry.value) = 'object' and entry.value ? '__supabaseIncrement' then
      current_number := case when jsonb_typeof(result_value -> entry.key) = 'number'
        then (result_value ->> entry.key)::numeric else 0 end;
      increment_number := coalesce((entry.value ->> '__supabaseIncrement')::numeric, 0);
      result_value := jsonb_set(result_value, array[entry.key], to_jsonb(current_number + increment_number), true);
    elsif jsonb_typeof(entry.value) = 'object' then
      result_value := jsonb_set(
        result_value, array[entry.key],
        public.academy_jsonb_deep_merge(result_value -> entry.key, entry.value), true
      );
    else
      result_value := jsonb_set(result_value, array[entry.key], entry.value, true);
    end if;
  end loop;
  return result_value;
end;
$$;

create or replace function public.academy_jsonb_remove_path(p_target jsonb, p_path text[])
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  target_value jsonb := coalesce(p_target, '{}'::jsonb);
begin
  if coalesce(cardinality(p_path), 0) = 0 then return target_value; end if;
  if cardinality(p_path) = 1 then return target_value - p_path[1]; end if;
  if jsonb_typeof(target_value) <> 'object' then return target_value; end if;
  return jsonb_set(
    target_value, array[p_path[1]],
    public.academy_jsonb_remove_path(target_value -> p_path[1], p_path[2:]), true
  );
end;
$$;

create or replace function public.academy_record_set_path(
  p_collection text, p_record_id text, p_path text[], p_value jsonb, p_owner_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign-in is required.'; end if;
  if coalesce(cardinality(p_path), 0) = 0 then raise exception 'A nested path is required.'; end if;
  insert into public.academy_records(collection, record_id, owner_id, data, updated_at)
  values(p_collection, p_record_id, coalesce(p_owner_id, auth.uid()),
    public.academy_jsonb_set_path('{}'::jsonb, p_path, p_value), now())
  on conflict(collection, record_id) do update
    set data = public.academy_jsonb_set_path(public.academy_records.data, p_path, p_value),
        updated_at = now();
end;
$$;

create or replace function public.academy_record_merge(
  p_collection text, p_record_id text, p_path text[], p_patch jsonb, p_owner_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  initial_data jsonb;
begin
  if auth.uid() is null then raise exception 'Sign-in is required.'; end if;
  initial_data := public.academy_jsonb_deep_merge('{}'::jsonb, p_patch);
  if coalesce(cardinality(p_path), 0) > 0 then
    initial_data := public.academy_jsonb_set_path('{}'::jsonb, p_path, initial_data);
  end if;
  insert into public.academy_records(collection, record_id, owner_id, data, updated_at)
  values(p_collection, p_record_id, coalesce(p_owner_id, auth.uid()), initial_data, now())
  on conflict(collection, record_id) do update
    set data = case
      when coalesce(cardinality(p_path), 0) > 0 then
        public.academy_jsonb_set_path(
          public.academy_records.data, p_path,
          public.academy_jsonb_deep_merge(
            case when jsonb_typeof(public.academy_records.data #> p_path) = 'object'
              then public.academy_records.data #> p_path else '{}'::jsonb end,
            p_patch
          )
        )
      else public.academy_jsonb_deep_merge(public.academy_records.data, p_patch)
    end,
    updated_at = now();
end;
$$;

create or replace function public.academy_record_remove_path(
  p_collection text, p_record_id text, p_path text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign-in is required.'; end if;
  if coalesce(cardinality(p_path), 0) = 0 then raise exception 'A nested path is required.'; end if;
  update public.academy_records
     set data = public.academy_jsonb_remove_path(data, p_path),
         updated_at = now()
   where collection = p_collection and record_id = p_record_id;
end;
$$;

revoke all on function public.academy_jsonb_set_path(jsonb,text[],jsonb) from public, anon;
revoke all on function public.academy_jsonb_deep_merge(jsonb,jsonb) from public, anon;
revoke all on function public.academy_jsonb_remove_path(jsonb,text[]) from public, anon;
revoke all on function public.academy_record_set_path(text,text,text[],jsonb,uuid) from public, anon;
revoke all on function public.academy_record_merge(text,text,text[],jsonb,uuid) from public, anon;
revoke all on function public.academy_record_remove_path(text,text,text[]) from public, anon;
grant execute on function public.academy_jsonb_set_path(jsonb,text[],jsonb) to authenticated;
grant execute on function public.academy_jsonb_deep_merge(jsonb,jsonb) to authenticated;
grant execute on function public.academy_jsonb_remove_path(jsonb,text[]) to authenticated;
grant execute on function public.academy_record_set_path(text,text,text[],jsonb,uuid) to authenticated;
grant execute on function public.academy_record_merge(text,text,text[],jsonb,uuid) to authenticated;
grant execute on function public.academy_record_remove_path(text,text,text[]) to authenticated;

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
