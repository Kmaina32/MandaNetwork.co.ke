import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261109083000_supabase_auth_cutover_foundation.sql'),
  'utf8'
);

describe('Supabase Auth cutover foundation', () => {
  it('separates roles and organization memberships from user profiles', () => {
    expect(migration).toMatch(/create table if not exists public\.user_roles/i);
    expect(migration).toMatch(/create table if not exists public\.organization_members/i);
    expect(migration).toMatch(/user_id uuid not null references auth\.users\(id\)/i);
    expect(migration).not.toMatch(/add column[^;]*role[^;]*public\.profiles/i);
  });

  it('restricts role assignment and membership writes to trusted server-side code', () => {
    expect(migration).toMatch(/revoke all on public\.user_roles from anon, authenticated/i);
    expect(migration).toMatch(/grant select on public\.user_roles to authenticated/i);
    expect(migration).toMatch(/revoke all on public\.organization_members from anon, authenticated/i);
    expect(migration).not.toMatch(/create policy[^;]*(insert|update|delete|all)[^;]*on public\.(user_roles|organization_members)/i);
  });

  it('keeps legacy identity links inaccessible to browser roles', () => {
    expect(migration).toMatch(/create table if not exists public\.legacy_identity_links/i);
    expect(migration).toMatch(/firebase_uid text not null unique/i);
    expect(migration).toMatch(/revoke all on public\.legacy_identity_links from anon, authenticated/i);
    expect(migration).toMatch(/grant all on public\.legacy_identity_links to service_role/i);
  });

  it('uses non-exposed security-definer helpers with a fixed search path', () => {
    expect(migration).toMatch(/create schema if not exists private/i);
    expect(migration).toMatch(/security definer\s+set search_path = ''/i);
    expect(migration).toMatch(/revoke all on function private\.current_user_has_role\(text\) from public, anon/i);
    expect(migration).toMatch(/grant execute on function private\.current_user_has_role\(text\) to authenticated/i);
  });

  it('enables RLS on all new identity and membership tables', () => {
    for (const table of ['user_roles', 'organization_members', 'legacy_identity_links']) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    }
  });
});
