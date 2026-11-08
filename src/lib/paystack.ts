import 'server-only';

import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';

const PAYSTACK_API = 'https://api.paystack.co';

type PaystackTransaction = {
  uid: string;
  email: string;
  itemType: 'course' | 'organization_plan';
  itemId: string;
  itemName: string;
  organizationId?: string;
  amount: number;
  currency: 'KES';
  reference: string;
  status: 'initializing' | 'pending' | 'processing' | 'completed' | 'failed' | 'review_required';
  createdAt: number;
  updatedAt: number;
};

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !/^sk_(test|live)_/.test(key)) throw new Error('Paystack is not configured.');
  return key;
}

export function newPaystackReference(): string {
  return `VA-${randomUUID()}`;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}) {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      amount: String(input.amount * 100),
      currency: 'KES',
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ['card', 'mobile_money', 'bank', 'bank_transfer'],
      metadata: input.metadata,
    }),
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== true || typeof result?.data?.authorization_url !== 'string') {
    throw new Error('Paystack could not initialize this payment.');
  }
  return {
    authorizationUrl: result.data.authorization_url as string,
    accessCode: String(result.data.access_code || ''),
  };
}

async function verifyWithPaystack(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== true || !result?.data) {
    throw new Error('Paystack transaction verification failed.');
  }
  return result.data as {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer?: { email?: string };
    paid_at?: string;
    channel?: string;
    gateway_response?: string;
  };
}

async function applyVerifiedPayment(reference: string, providerData: Awaited<ReturnType<typeof verifyWithPaystack>>) {
  const transactionRef = adminDb.ref(`paystackTransactions/${reference}`);
  const snapshot = await transactionRef.get();
  if (!snapshot.exists()) throw new Error('Unknown payment reference.');
  const payment = snapshot.val() as PaystackTransaction;

  if (providerData.reference !== reference
    || providerData.status !== 'success'
    || Number(providerData.amount) !== payment.amount * 100
    || providerData.currency !== payment.currency
    || (providerData.customer?.email && providerData.customer.email.toLowerCase() !== payment.email.toLowerCase())) {
    await transactionRef.update({ status: 'review_required', updatedAt: Date.now() });
    throw new Error('Payment details did not match the expected order.');
  }

  if (payment.status === 'completed') return payment;
  const now = Date.now();
  const lock = await transactionRef.transaction((current) => {
    if (!current || current.status === 'completed' || current.status === 'review_required' || current.status === 'failed') return;
    if (current.status === 'processing' && now - Number(current.updatedAt || 0) < 120000) return;
    return { ...current, status: 'processing', updatedAt: now };
  });
  if (!lock.committed) {
    const latest = (await transactionRef.get()).val();
    if (latest?.status === 'completed') return latest as PaystackTransaction;
    throw new Error('This payment is already being processed. Please refresh shortly.');
  }

  const updates: Record<string, unknown> = {};
  const completedAt = new Date().toISOString();

  try {
    if (payment.itemType === 'course') {
      const courseSnapshot = await adminDb.ref(`courses/${payment.itemId}`).get();
      if (!courseSnapshot.exists()) throw new Error('The purchased course is no longer available.');
      const enrollmentRef = adminDb.ref(`users/${payment.uid}/purchasedCourses/${payment.itemId}`);
      const existing = await enrollmentRef.get();
      if (!existing.exists()) {
        updates[`users/${payment.uid}/purchasedCourses/${payment.itemId}`] = {
          progress: 0,
          completed: false,
          certificateAvailable: false,
          completedLessons: [],
          enrollmentDate: completedAt,
          paymentMethod: 'card',
          paymentReceipt: reference,
        };
      }
    } else {
      const organizationSnapshot = await adminDb.ref(`organizations/${payment.organizationId}`).get();
      if (!organizationSnapshot.exists() || organizationSnapshot.val()?.ownerId !== payment.uid) {
        throw new Error('The organization owner could not be verified.');
      }
      const planName = payment.itemName.toLowerCase();
      if (!['basic', 'pro'].includes(planName)) throw new Error('This organization plan is not supported for automatic activation.');
      updates[`organizations/${payment.organizationId}/subscriptionTier`] = planName;
      updates[`organizations/${payment.organizationId}/subscriptionExpiresAt`] = null;
    }

    updates[`paystackTransactions/${reference}`] = {
      ...payment,
      status: 'completed',
      provider: 'paystack',
      providerChannel: providerData.channel || null,
      gatewayResponse: providerData.gateway_response || null,
      paidAt: providerData.paid_at || completedAt,
      completedAt,
      updatedAt: now,
    };
    await adminDb.ref().update(updates);
    return { ...payment, status: 'completed' as const };
  } catch (error) {
    await transactionRef.update({ status: 'pending', updatedAt: Date.now() });
    throw error;
  }
}

export async function verifyAndFulfillPaystackPayment(reference: string) {
  if (!/^VA-[0-9a-f-]{36}$/i.test(reference)) throw new Error('Invalid payment reference.');
  const providerData = await verifyWithPaystack(reference);
  return applyVerifiedPayment(reference, providerData);
}

export function verifyPaystackWebhookSignature(rawBody: string, headers: Headers): boolean {
  const legacySignature = headers.get('x-paystack-signature');
  const modernSignature = headers.get('paystack-signature');
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;

  const safeEqual = (expected: string, actual: string) => {
    if (!/^[a-f0-9]{128}$/i.test(actual) || !/^[a-f0-9]{128}$/i.test(expected)) return false;
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(actual, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  };

  if (modernSignature && webhookSecret) {
    const parts = modernSignature.split(',');
    const timestamp = parts.find(part => part.startsWith('t='))?.slice(2);
    const signatures = parts.filter(part => part.startsWith('v1=')).map(part => part.slice(3).split(':').pop() || '');
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
    const expected = createHmac('sha512', webhookSecret).update(`${timestamp}.${rawBody}`).digest('hex');
    if (signatures.some(signature => safeEqual(expected, signature))) return true;
  }

  if (legacySignature && secretKey) {
    const expected = createHmac('sha512', secretKey).update(rawBody).digest('hex');
    if (safeEqual(expected, legacySignature)) return true;
  }
  return false;
}

export async function handlePaystackWebhookEvent(event: unknown) {
  const payload = event as { event?: string; data?: { reference?: string } };
  if (payload?.event !== 'charge.success') return { ignored: true };
  const reference = payload.data?.reference;
  if (typeof reference !== 'string') throw new Error('Webhook reference is missing.');
  const payment = await verifyAndFulfillPaystackPayment(reference);
  return { ignored: false, payment };
}
