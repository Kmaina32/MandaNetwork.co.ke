import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(join(process.cwd(),
  'supabase/migrations/20261108133000_varban_academy_primary_backend_schema.sql'), 'utf8');

describe('Supabase schema security regression checks', () => {
  const appTables = [
    'profiles', 'courses', 'programs', 'bootcamps', 'organizations',
    'enrollments', 'assignments', 'submissions', 'blog_posts',
    'calendar_events', 'notifications', 'activity_logs',
  ];

  it.each(appTables)('enables row-level security on %s', (table) => {
    expect(migration.toLowerCase()).toContain(`alter table public.${table} enable row level security`);
  });

  it('scopes profile reads and updates to the authenticated profile owner', () => {
    expect(migration).toMatch(/profile_select_own[\s\S]*?using \(\(select auth\.uid\(\)\) = id\)/i);
    expect(migration).toMatch(/profile_update_own[\s\S]*?using \(\(select auth\.uid\(\)\) = id\)[\s\S]*?with check \(\(select auth\.uid\(\)\) = id\)/i);
  });

  it('uses trusted app_metadata rather than user-editable user_metadata for admin policies', () => {
    expect(migration).toContain(`auth.jwt()->'app_metadata'->>'role'`);
    expect(migration).not.toContain(`auth.jwt()->'user_metadata'->>'role'`);
  });

  it('limits enrollment and submission access to the owner or trusted admins', () => {
    expect(migration).toMatch(/enrollments_owner_access[\s\S]*?user_id = \(select auth\.uid\(\)\)[\s\S]*?role'\) = 'admin'/i);
    expect(migration).toMatch(/submissions_owner_access[\s\S]*?user_id = \(select auth\.uid\(\)\)[\s\S]*?role'\) = 'admin'/i);
  });

  it('does not grant anonymous access to private learner records', () => {
    for (const table of ['profiles', 'organizations', 'enrollments', 'submissions', 'notifications', 'activity_logs']) {
      expect(migration).not.toMatch(new RegExp(`to anon[^;]*on public\\.${table}`, 'i'));
    }
  });

  it('scopes private user-file storage paths to the authenticated user id', () => {
    expect(migration).toMatch(/user_files_owner_access[\s\S]*?storage\.foldername\(name\)\)\[1\]\s*=\s*\(select auth\.uid\(\)\)::text/i);
  });

  it('does not define public write policies for the learning catalog', () => {
    expect(migration).not.toMatch(/for (insert|update|delete|all) to anon[^;]*on public\.(courses|programs|bootcamps|blog_posts)/i);
  });
});
