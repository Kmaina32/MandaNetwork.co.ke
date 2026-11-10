import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('atomic verified payment fulfillment migration', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261110100500_atomic_verified_payment_fulfillment.sql'), 'utf8');

  it('locks the payment row before granting access', () => {
    expect(sql).toMatch(/for update/i);
    expect(sql).toContain('on conflict (user_id, course_id) do nothing');
  });

  it('validates provider, amount, currency, email and current course price', () => {
    expect(sql).toContain('v_payment.provider <> p_provider');
    expect(sql).toContain('v_payment.amount_kes <> p_confirmed_amount');
    expect(sql).toContain('v_payment.currency <> p_confirmed_currency');
    expect(sql).toContain('v_course.price = v_payment.amount_kes');
  });

  it('restricts execution to the server service role', () => {
    expect(sql).toContain('from public, anon, authenticated');
    expect(sql).toContain('to service_role');
    expect(sql).toContain('security invoker');
  });
});
