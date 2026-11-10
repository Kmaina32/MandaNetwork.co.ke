import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('paid course enrollment authorization', () => {
  const migration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261110100000_restrict_self_enrollment_to_free_courses.sql'),
    'utf8',
  );

  it('restricts learner self-enrollment to published zero-price courses', () => {
    expect(migration).toContain('course.is_published = true');
    expect(migration).toContain('course.price = 0');
    expect(migration).toContain('user_id = (select auth.uid())');
  });

  it('keeps database-role admins able to create enrollments', () => {
    expect(migration).toContain("public.has_role((select auth.uid()), array['admin','super_admin'])");
  });

  it('does not authorize paid-course enrollment through client-controlled payment metadata', () => {
    expect(migration).not.toMatch(/paymentMethod|paymentReceipt|provider_payload/i);
  });
});
