-- Supabase-only academy identity and service foundation.
-- Intentionally does not import or copy any Firebase data.

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('learner','instructor','organization_admin','admin','super_admin')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  primary key (user_id, role)
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner','admin','instructor','member')),
  status text not null default 'active' check (status in ('invited','active','suspended')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.payment_transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null default 'paystack' check (provider = 'paystack'),
  reference text not null unique,
  item_type text not null check (item_type in ('course','hackathon','organization_plan')),
  item_id text not null,
  amount_kes numeric(12,2) not null check (amount_kes > 0),
  currency text not null default 'KES' check (currency = 'KES'),
  status text not null default 'initialized' check (status in ('initialized','pending','success','failed','reversed')),
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  completed_lessons text[] not null default '{}',
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  notification_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.has_role(check_user_id uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and role = any(allowed_roles)
  );
$$;

create or replace function public.is_org_member(check_org_id text, check_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = check_org_id and user_id = check_user_id and status = 'active'
  ) or exists (
    select 1 from public.organizations
    where id = check_org_id and owner_id = check_user_id
  );
$$;

insert into public.user_roles (user_id, role)
select id, case when raw_app_meta_data->>'role' = 'super_admin' then 'super_admin' else 'admin' end
from auth.users
where raw_app_meta_data->>'role' in ('admin','super_admin')
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role)
select id, 'learner' from auth.users
on conflict (user_id, role) do nothing;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, metadata)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    jsonb_build_object('auth_provider', 'supabase')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = now();

  insert into public.user_roles (user_id, role) values (new.id, 'learner')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

alter table public.user_roles enable row level security;
alter table public.organization_members enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.course_progress enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "Users can read their own roles" on public.user_roles;
create policy "Users can read their own roles" on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), array['admin','super_admin']));

drop policy if exists "Organization members can read their membership" on public.organization_members;
create policy "Organization members can read their membership" on public.organization_members
for select to authenticated using (user_id = auth.uid() or public.is_org_member(organization_id, auth.uid()) or public.has_role(auth.uid(), array['admin','super_admin']));

drop policy if exists "Admins manage organization memberships" on public.organization_members;
create policy "Admins manage organization memberships" on public.organization_members
for all to authenticated using (public.has_role(auth.uid(), array['admin','super_admin'])) with check (public.has_role(auth.uid(), array['admin','super_admin']));

drop policy if exists "Users read own payment transactions" on public.payment_transactions;
create policy "Users read own payment transactions" on public.payment_transactions
for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), array['admin','super_admin']));

drop policy if exists "Users read own course progress" on public.course_progress;
create policy "Users read own course progress" on public.course_progress
for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), array['admin','super_admin']));

drop policy if exists "Users manage own course progress" on public.course_progress;
create policy "Users manage own course progress" on public.course_progress
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings" on public.user_settings
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
