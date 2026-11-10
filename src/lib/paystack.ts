import 'server-only';

import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';

const PAYSTACK_API = 'https://api.paystack.co';
type ItemType = 'course';
type Payment = {
  id: string; user_id: string; provider: string; reference: string;
  item_type: ItemType; item_id: string; amount_kes: number;
  currency: string; status: string; provider_payload: Record<string, unknown>;
};

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !/^sk_(test|live)_/.test(key)) throw new Error('Paystack is not configured.');
  return key;
}
export function newPaystackReference() { return `VA-${randomUUID()}`; }

export async function initializePaystackTransaction(input: {
  email: string; amount: number; reference: string; callbackUrl: string;
  metadata: Record<string, string>;
}) {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: input.email, amount: String(Math.round(input.amount * 100)), currency: 'KES',
      reference: input.reference, callback_url: input.callbackUrl,
      channels: ['card', 'mobile_money', 'bank', 'bank_transfer'], metadata: input.metadata,
    }),
    signal: AbortSignal.timeout(20000), cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== true || typeof result?.data?.authorization_url !== 'string') {
    throw new Error('Paystack could not initialize this payment.');
  }
  return { authorizationUrl: result.data.authorization_url as string, accessCode: String(result.data.access_code || '') };
}

async function verifyWithPaystack(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    signal: AbortSignal.timeout(20000), cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== true || !result?.data) throw new Error('Paystack transaction verification failed.');
  return result.data as { status: string; reference: string; amount: number; currency: string; customer?: { email?: string }; paid_at?: string; channel?: string; gateway_response?: string };
}

export async function verifyAndFulfillPaystackPayment(reference: string) {
  if (!/^VA-[0-9a-f-]{36}$/i.test(reference)) throw new Error('Invalid payment reference.');
  const provider = await verifyWithPaystack(reference);
  const supabase = getSupabaseAdminClient();
  const { data: payment, error } = await supabase.from('payment_transactions').select('*').eq('reference', reference).maybeSingle();
  if (error) throw error;
  if (!payment) throw new Error('Unknown payment reference.');
  const payload = (payment.provider_payload || {}) as Record<string, unknown>;

  if (provider.reference !== reference || Number(provider.amount) !== Math.round(Number(payment.amount_kes) * 100)
    || provider.currency !== payment.currency
    || (provider.customer?.email && String(payload.email || '').toLowerCase() !== provider.customer.email.toLowerCase())) {
    await supabase.from('payment_transactions').update({ status: 'review_required', updated_at: new Date().toISOString() }).eq('reference', reference);
    throw new Error('Payment details did not match the expected order.');
  }
  if (provider.status !== 'success') {
    const failed = ['failed', 'abandoned', 'reversed'].includes(provider.status);
    await supabase.from('payment_transactions').update({ status: failed ? 'failed' : 'pending', updated_at: new Date().toISOString() }).eq('reference', reference);
    throw new Error(failed ? 'Paystack reports that this payment was not completed.' : 'Payment has not been confirmed yet.');
  }
  if (payment.status === 'completed') return { ...payment, itemType: payment.item_type, itemId: payment.item_id };

  const { data: course, error: courseError } = await supabase.from('courses').select('id,title,is_published').eq('id', payment.item_id).eq('is_published', true).maybeSingle();
  if (courseError) throw courseError;
  if (!course) throw new Error('The purchased course is no longer available.');

  const now = new Date().toISOString();
  const { error: enrollmentError } = await supabase.from('enrollments').upsert({
    user_id: payment.user_id, course_id: payment.item_id, progress: 0, completed: false,
    content: { enrollmentDate: now, paymentMethod: 'paystack', paymentReceipt: reference, completedLessons: [] },
  }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });
  if (enrollmentError) throw enrollmentError;

  const { error: updateError } = await supabase.from('payment_transactions').update({
    status: 'completed',
    provider_payload: {
      ...payload, providerStatus: provider.status, providerChannel: provider.channel || null,
      gatewayResponse: provider.gateway_response || null, paidAt: provider.paid_at || now,
      courseTitle: course.title,
    } as Json,
    updated_at: now,
  }).eq('reference', reference).neq('status', 'completed');
  if (updateError) throw updateError;
  return { ...payment, status: 'completed', itemType: 'course', itemId: payment.item_id };
}

export function verifyPaystackWebhookSignature(rawBody: string, headers: Headers): boolean {
  const signature = headers.get('x-paystack-signature');
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac('sha512', secretKey()).update(rawBody).digest('hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function handlePaystackWebhookEvent(event: unknown) {
  const payload = event as { event?: string; data?: { reference?: string } };
  if (payload.event !== 'charge.success' || typeof payload.data?.reference !== 'string') return { ignored: true };
  const payment = await verifyAndFulfillPaystackPayment(payload.data.reference);
  return { ignored: false, payment };
}
