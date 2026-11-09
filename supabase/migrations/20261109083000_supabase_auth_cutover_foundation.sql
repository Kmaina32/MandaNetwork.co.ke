-- Supabase Auth cutover foundation.
-- Additive only: Firebase remains available for legacy services until each data
-- domain has been migrated and verified. No client can self-assign a role or
-- create/modify identity-link records.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'instructor', 'organization_admin', 'platform_admin')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'instructor', 'organization_admin')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- This mapping is private to trusted server-side migration code. It must never
-- be writable from a browser or used as an authorization claim.
create table if not exists public.legacy_identity_links (
  supabase_user_id uuid primary key references auth.users(id) on delete cascade,
  firebase_uid text not null unique,
  linked_at timestamptz not null default now(),
  link_method text not null check (link_method in ('verified_login', 'admin_migration', 'support_recovery')),
  verified_at timestamptz not null
);

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists organization_members_user_id_idx on public.organization_members(user_id);
create index if not exists organization_members_org_role_idx on public.organization_members(organization_id, role);

alter table public.user_roles enable row level security;
alter table public.organization_members enable row level security;
alter table public.legacy_identity_links enable row level security;

create or replace function private.current_user_has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = required_role
  );
$$;

create or replace function private.current_user_is_org_admin(target_organization_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.role = 'organization_admin'
  );
$$;

revoke all on function private.current_user_has_role(text) from public, anon;
revoke all on function private.current_user_is_org_admin(text) from public, anon;
grant execute on function private.current_user_has_role(text) to authenticated;
grant execute on function private.current_user_is_org_admin(text) to authenticated;

drop policy if exists user_roles_read_self_or_platform_admin on public.user_roles;
create policy user_roles_read_self_or_platform_admin
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.current_user_has_role('platform_admin'));

drop policy if exists organization_members_read_scoped on public.organization_members;
create policy organization_members_read_scoped
  on public.organization_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.current_user_is_org_admin(organization_id)
    or private.current_user_has_role('platform_admin')
  );

-- Membership and role writes are server-controlled. No INSERT/UPDATE/DELETE
-- policy is intentionally provided for authenticated browser clients.
drop policy if exists legacy_identity_links_no_client_access on public.legacy_identity_links;

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
revoke all on public.organization_members from anon, authenticated;
grant select on public.organization_members to authenticated;
revoke all on public.legacy_identity_links from anon, authenticated;
grant all on public.legacy_identity_links to service_role;
