-- Temporary Varban Academy launch waitlist.
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  interest text,
  source text not null default 'temporary_landing_page',
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_signups_email_lower_uidx
  on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

-- Public visitors submit through the server route only. No browser role may
-- read or write this table directly; the server route uses the service role.
revoke all on table public.waitlist_signups from anon, authenticated;
grant all on table public.waitlist_signups to service_role;

comment on table public.waitlist_signups is
  'Varban Academy launch waitlist submissions; server-side access only.';
