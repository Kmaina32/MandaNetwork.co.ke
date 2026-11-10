import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('M-Pesa callback settlement safeguards', () => {
  const route = readFileSync(join(process.cwd(), 'src/app/api/mpesa/callback/route.ts'), 'utf8');

  it('does not trust callback success without an independent Daraja status query', () => {
    expect(route).toContain('queryProviderStatus(checkoutRequestId)');
    expect(route).toContain("String(providerStatus?.ResultCode) !== '0'");
    expect(route).toContain('providerStatus?.CheckoutRequestID !== checkoutRequestId');
  });

  it('matches callback amount, phone and receipt to the pending transaction', () => {
    expect(route).toContain('amount !== Number(transaction.amount_kes)');
    expect(route).toContain('phone !== String(transaction.provider_payload?.phoneNumber)');
    expect(route).toContain('MpesaReceiptNumber');
  });

  it('uses the atomic service-role fulfillment RPC and never inserts an enrollment directly', () => {
    expect(route).toContain("admin.rpc('fulfill_verified_course_payment'");
    expect(route).not.toContain("admin.from('enrollments').upsert");
  });

  it('limits failure transitions to transactions still awaiting confirmation', () => {
    expect(route).toContain(".in('status', ['pending', 'initialized'])");
  });
});
