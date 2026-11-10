import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('database performance and policy alignment migration', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261110101000_index_foreign_keys_and_optimize_rls.sql'), 'utf8');

  it('adds indexes for all previously reported unindexed foreign keys', () => {
    expect(sql).toContain('idx_advertisements_created_by_fk');
    expect(sql).toContain('idx_payment_transactions_user_id_fk');
    expect(sql).toContain('idx_user_roles_granted_by_fk');
    expect((sql.match(/create index if not exists/g) || []).length).toBe(38);
  });

  it('rewrites request-scoped auth calls to initplan-friendly scalar subqueries', () => {
    expect(sql).toContain("replace(policy_row.qual, 'auth.uid()', '(select auth.uid())')");
    expect(sql).toContain("check_expr := replace(replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())'), 'auth.jwt()', '(select auth.jwt())')");
  });

  it('uses database-backed role checks for submission administration', () => {
    expect(sql).toContain("public.has_role((select auth.uid()), array['admin','super_admin'])");
    expect(sql).not.toContain("auth.jwt() -> 'app_metadata'");
  });
});
