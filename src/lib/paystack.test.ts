jest.mock('server-only', () => ({}));

import { createHmac } from 'node:crypto';
import {
  newPaystackReference,
  verifyPaystackWebhookSignature,
  handlePaystackWebhookEvent,
} from './paystack';

describe('Paystack payment safeguards', () => {
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_internal_unit_test_key';
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = originalSecret;
  });

  it('generates unique references in the expected server-owned format', () => {
    const first = newPaystackReference();
    const second = newPaystackReference();
    expect(first).toMatch(/^VA-[0-9a-f-]{36}$/i);
    expect(second).not.toBe(first);
  });

  it('accepts a valid SHA-512 webhook signature', () => {
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'VA-test' } });
    const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(body).digest('hex');
    expect(verifyPaystackWebhookSignature(body, new Headers({ 'x-paystack-signature': signature }))).toBe(true);
  });

  it('rejects missing, malformed, and incorrect webhook signatures', () => {
    const body = '{"event":"charge.success"}';
    expect(verifyPaystackWebhookSignature(body, new Headers())).toBe(false);
    expect(verifyPaystackWebhookSignature(body, new Headers({ 'x-paystack-signature': 'not-a-signature' }))).toBe(false);
    expect(verifyPaystackWebhookSignature(body, new Headers({ 'x-paystack-signature': '0'.repeat(128) }))).toBe(false);
  });

  it('fails closed when the Paystack secret is not configured', () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    expect(() => verifyPaystackWebhookSignature('body', new Headers({
      'x-paystack-signature': '0'.repeat(128),
    }))).toThrow('Paystack is not configured.');
  });

  it('ignores unsupported webhook event types without attempting fulfillment', async () => {
    await expect(handlePaystackWebhookEvent({
      event: 'charge.failed',
      data: { reference: 'VA-00000000-0000-0000-0000-000000000000' },
    })).resolves.toEqual({ ignored: true });
  });

  it('ignores malformed webhook payloads', async () => {
    await expect(handlePaystackWebhookEvent({ event: 'charge.success', data: {} }))
      .resolves.toEqual({ ignored: true });
  });
});
