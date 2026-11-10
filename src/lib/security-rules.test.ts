import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationFiles = [
  '202611100001_supabase_only_identity_foundation.sql',
  '202611100004_database_role_rls_alignment.sql',
  '202611100006_role_based_rls_policies.sql',
  '202611100018_supabase_server_actions.sql',
];
const sql = migrationFiles.map(file => readFileSync(join(process.cwd(), 'supabase', 'migrations', file), 'utf8')).join('\n');

describe('Supabase academy security migrations', () => {
  it('uses database-backed role checks', () => {
    expect(sql).toContain('public.has_role');
    expect(sql).toContain('public.user_roles');
  });
  it('protects learner-owned enrollment records with RLS', () => {
    expect(sql).toContain('alter table public.enrollments enable row level security');
    expect(sql).toContain('user_id=auth.uid()');
  });
  it('does not grant anonymous access to role helper functions', () => {
    expect(sql).toContain('from public, anon');
  });
});
