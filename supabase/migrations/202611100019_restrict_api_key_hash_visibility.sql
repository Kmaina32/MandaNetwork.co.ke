revoke select on public.user_api_keys from authenticated;
grant select(id,user_id,name,key_prefix,revoked_at,created_at) on public.user_api_keys to authenticated;
grant insert(id,user_id,name,key_hash,key_prefix) on public.user_api_keys to authenticated;
grant update(revoked_at) on public.user_api_keys to authenticated;