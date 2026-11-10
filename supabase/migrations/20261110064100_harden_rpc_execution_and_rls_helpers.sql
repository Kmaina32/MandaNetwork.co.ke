-- Reduce exposed SECURITY DEFINER surface while preserving policy behavior.
-- The private schema must remain excluded from PostgREST's exposed schemas.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.has_role(check_user_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select check_user_id = (select auth.uid())
    and exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid()) and role = any(allowed_roles)
    );
$$;
revoke all on function private.has_role(uuid,text[]) from public;
grant execute on function private.has_role(uuid,text[]) to anon, authenticated, service_role;

create or replace function private.is_org_member(check_org_id text, check_user_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select check_user_id = (select auth.uid()) and (
    exists (
      select 1 from public.organization_members
      where organization_id = check_org_id and user_id = (select auth.uid()) and status = 'active'
    ) or exists (
      select 1 from public.organizations
      where id = check_org_id and owner_id = (select auth.uid())
    )
  );
$$;
revoke all on function private.is_org_member(text,uuid) from public;
grant execute on function private.is_org_member(text,uuid) to anon, authenticated, service_role;

-- Public wrappers are SECURITY INVOKER. They return false for anonymous callers,
-- but remain executable so public-read RLS policies can evaluate safely.
create or replace function public.has_role(check_user_id uuid, allowed_roles text[])
returns boolean
language sql stable security invoker
set search_path = pg_catalog, public
as $$ select private.has_role(check_user_id, allowed_roles); $$;
revoke all on function public.has_role(uuid,text[]) from public;
grant execute on function public.has_role(uuid,text[]) to anon, authenticated, service_role;

create or replace function public.is_org_member(check_org_id text, check_user_id uuid)
returns boolean
language sql stable security invoker
set search_path = pg_catalog, public
as $$ select private.is_org_member(check_org_id, check_user_id); $$;
revoke all on function public.is_org_member(text,uuid) from public;
grant execute on function public.is_org_member(text,uuid) to anon, authenticated, service_role;

-- API-key validation is server-only. The API route now uses the service-role client.
revoke all on function public.validate_api_key_and_consume(text) from public, anon, authenticated;
grant execute on function public.validate_api_key_and_consume(text) to service_role;

-- Accepting an invitation is constrained by the caller's own verified email and RLS.
drop policy if exists organization_invitee_accept_update on public.organization_invitations;
create policy organization_invitee_accept_update
on public.organization_invitations for update to authenticated
using (
  status = 'pending'
  and (expires_at is null or expires_at > now())
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  status = 'accepted'
  and invited_user_id = auth.uid()
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
alter function public.accept_organization_invitation(uuid) security invoker;

-- Admin leaderboard writes are explicitly guarded by the live database role table.
drop policy if exists leaderboard_admin_insert on public.leaderboard;
create policy leaderboard_admin_insert on public.leaderboard
for insert to authenticated
with check (public.has_role(auth.uid(), array['admin','super_admin']));
drop policy if exists leaderboard_admin_update on public.leaderboard;
create policy leaderboard_admin_update on public.leaderboard
for update to authenticated
using (public.has_role(auth.uid(), array['admin','super_admin']))
with check (public.has_role(auth.uid(), array['admin','super_admin']));
alter function public.award_manual_leaderboard_points(uuid,integer) security invoker;

-- Existing submissions, certificates and enrollment policies already authorize
-- admins via public.has_role; use those policies instead of SECURITY DEFINER.
alter function public.grade_submission_and_issue_certificate(text,numeric,text,jsonb) security invoker;

-- Checkout status can only move from this user's initialized Paystack row to pending/failed.
drop policy if exists payment_transactions_owner_status_update on public.payment_transactions;
create policy payment_transactions_owner_status_update on public.payment_transactions
for update to authenticated
using (user_id = auth.uid() and provider = 'paystack' and status = 'initialized')
with check (user_id = auth.uid() and provider = 'paystack' and status in ('pending','failed'));
alter function public.set_paystack_checkout_status(text,text) security invoker;

-- Account deletion now verifies the caller in the route and uses Supabase Auth Admin API.
drop function if exists public.delete_user_account(uuid);
