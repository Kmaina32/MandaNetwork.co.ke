create table if not exists public.pricing_plans (
  id text primary key, name text not null, price numeric(12,2) not null default 0,
  interval text, is_active boolean not null default true, content jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bundles (
  id text primary key, title text not null, price numeric(12,2) not null default 0,
  is_published boolean not null default false, content jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.organization_invitations (
  id text primary key, organization_id text not null references public.organizations(id) on delete cascade,
  email text not null, invited_user_id uuid references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('admin','instructor','member')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked','expired')),
  expires_at timestamptz, invited_by uuid not null references auth.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique(organization_id,email)
);
alter table public.pricing_plans enable row level security;
alter table public.bundles enable row level security;
alter table public.organization_invitations enable row level security;

drop policy if exists pricing_plans_public_read on public.pricing_plans;
create policy pricing_plans_public_read on public.pricing_plans for select to anon,authenticated
using (is_active or public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists pricing_plans_admin_write on public.pricing_plans;
create policy pricing_plans_admin_write on public.pricing_plans for all to authenticated
using (public.has_role(auth.uid(),array['admin','super_admin']))
with check (public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists bundles_public_read on public.bundles;
create policy bundles_public_read on public.bundles for select to anon,authenticated
using (is_published or public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists bundles_admin_write on public.bundles;
create policy bundles_admin_write on public.bundles for all to authenticated
using (public.has_role(auth.uid(),array['admin','super_admin']))
with check (public.has_role(auth.uid(),array['admin','super_admin']));

drop policy if exists org_invitation_read on public.organization_invitations;
create policy org_invitation_read on public.organization_invitations for select to authenticated
using (invited_user_id=auth.uid() or invited_by=auth.uid() or public.is_org_member(organization_id,auth.uid()) or public.has_role(auth.uid(),array['admin','super_admin']));
drop policy if exists org_invitation_insert on public.organization_invitations;
create policy org_invitation_insert on public.organization_invitations for insert to authenticated
with check (
  invited_by=auth.uid() and (
    public.has_role(auth.uid(),array['admin','super_admin'])
    or exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid())
    or exists(select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=auth.uid() and m.status='active' and m.member_role in ('owner','admin'))
  )
);
drop policy if exists org_invitation_update on public.organization_invitations;
create policy org_invitation_update on public.organization_invitations for update to authenticated
using (invited_user_id=auth.uid() or invited_by=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']))
with check (
  invited_user_id=auth.uid() and status in ('accepted','declined')
  or invited_by=auth.uid()
  or public.has_role(auth.uid(),array['admin','super_admin'])
);
drop policy if exists org_invitation_delete on public.organization_invitations;
create policy org_invitation_delete on public.organization_invitations for delete to authenticated
using (invited_by=auth.uid() or public.has_role(auth.uid(),array['admin','super_admin']));