import 'server-only';

import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';

const PAYSTACK_API = 'https://api.paystack.co';

type PaystackTransaction = {
  uid: string;
  email: string;
  itemType: 'course' | 'hackathon' | 'organization_plan';
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

export async function createPaystackPlan(input: { name: string; amount: number; currency: 'KES'; interval: 'monthly' }) {
  const response = await fetch(`${PAYSTACK_API}/plan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getSecretKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name.slice(0, 100),
      amount: String(input.amount * 100),
      currency: input.currency,
      interval: input.interval,
      send_invoices: true,
      send_sms: false,
    }),
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== true || typeof result?.data?.plan_code !== 'string') {
    throw new Error('Paystack could not create the recurring billing plan. Confirm that subscriptions are enabled for your merchant account and KES.');
  }
  return { planCode: result.data.plan_code as string };
}

export async function initializePaystackTransaction(input: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
  planCode?: string;
}) {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      ...(input.planCode ? { plan: input.planCode } : { amount: String(input.amount * 100) }),
      currency: 'KES',
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: input.planCode ? ['card'] : ['card', 'mobile_money', 'bank', 'bank_transfer'],
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
    || Number(providerData.amount) !== payment.amount * 100
    || providerData.currency !== payment.currency
    || (providerData.customer?.email && providerData.customer.email.toLowerCase() !== payment.email.toLowerCase())) {
    await transactionRef.update({ status: 'review_required', updatedAt: Date.now() });
    throw new Error('Payment details did not match the expected order.');
  }

  if (providerData.status !== 'success') {
    const failed = ['failed', 'abandoned', 'reversed'].includes(providerData.status);
    await transactionRef.update({ status: failed ? 'failed' : 'pending', updatedAt: Date.now() });
    if (failed) {
      await adminDb.ref(`paymentCheckoutLocks/${payment.uid}/${payment.itemType}-${payment.itemId}`)
        .transaction((current) => current?.reference === reference ? null : current);
    }
    throw new Error(failed ? 'Paystack reports that this payment was not completed.' : 'Payment has not been confirmed yet.');
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
          paymentMethod: 'paystack',
          paymentReceipt: reference,
        };
      }
    } else if (payment.itemType === 'hackathon') {
      const hackathonSnapshot = await adminDb.ref(`hackathons/${payment.itemId}`).get();
      if (!hackathonSnapshot.exists()) throw new Error('The hackathon is no longer available.');
      updates[`hackathons/${payment.itemId}/participants/${payment.uid}`] = true;
    } else {
      const organizationSnapshot = await adminDb.ref(`organizations/${payment.organizationId}`).get();
      if (!organizationSnapshot.exists() || organizationSnapshot.val()?.ownerId !== payment.uid) {
        throw new Error('The organization owner could not be verified.');
      }
      const planName = payment.itemName.toLowerCase();
      if (!['basic', 'pro'].includes(planName)) throw new Error('This organization plan is not supported for automatic activation.');
      updates[`organizations/${payment.organizationId}/subscriptionTier`] = planName;
      updates[`organizations/${payment.organizationId}/subscriptionExpiresAt`] = null;
      updates[`organizations/${payment.organizationId}/billingProvider`] = 'paystack';
      updates[`organizations/${payment.organizationId}/billingInterval`] = 'monthly';
      updates[`organizations/${payment.organizationId}/subscriptionStatus`] = 'active';
    }

    updates[`paymentCheckoutLocks/${payment.uid}/${payment.itemType}-${payment.itemId}`] = null;
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

async function processRecurringCharge(reference: string, subscriptionCode: string, email?: string) {
  const verified = await verifyWithPaystack(reference);
  if (verified.status !== 'success' || verified.reference !== reference || verified.currency !== 'KES') {
    throw new Error('Recurring charge could not be verified.');
  }
  const organizations = await adminDb.ref('organizations').get();
  const match = Object.entries(organizations.val() || {}).find(([, value]: [string, any]) => value?.paystackSubscriptionCode === subscriptionCode);
  if (!match) throw new Error('Recurring subscription could not be matched to an organization.');
  const [organizationId, organization] = match as [string, any];
  if (email && verified.customer?.email && verified.customer.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Recurring payment customer did not match the subscription.');
  }
  const planCodes = await adminDb.ref('paystackPlanCodes').get();
  const plan = Object.values(planCodes.val() || {}).find((value: any) => value?.planCode === organization.paystackPlanCode) as any;
  if (!plan || Number(verified.amount) !== Number(plan.amount) * 100) {
    throw new Error('Recurring payment amount did not match the subscribed plan.');
  }
  const renewalRef = adminDb.ref(`paystackRenewals/${reference}`);
  const existing = await renewalRef.get();
  if (existing.exists()) return { duplicate: true };
  const now = Date.now();
  const renewal = await renewalRef.transaction(current => current || {
    reference,
    organizationId,
    subscriptionCode,
    amount: Number(plan.amount),
    currency: 'KES',
    status: 'completed',
    provider: 'paystack',
    paidAt: verified.paid_at || new Date(now).toISOString(),
    createdAt: now,
  });
  if (!renewal.committed) return { duplicate: true };
  await adminDb.ref(`organizations/${organizationId}`).update({
    subscriptionStatus: 'active',
    subscriptionLastPaidAt: verified.paid_at || new Date(now).toISOString(),
    updatedAt: now,
  });
  return { duplicate: false, organizationId };
}

export async function handlePaystackWebhookEvent(event: unknown) {
  const payload = event as {
    event?: string;
    data?: {
      reference?: string;
      subscription_code?: string;
      email_token?: string;
      next_payment_date?: string | null;
      status?: string;
      customer?: { customer_code?: string; email?: string };
      plan?: { plan_code?: string; name?: string; amount?: number; interval?: string };
      subscription?: { subscription_code?: string; email_token?: string; next_payment_date?: string | null; status?: string };
    };
  };
  const data = payload?.data;
  const subscriptionCode = data?.subscription_code || data?.subscription?.subscription_code;

  if (payload?.event === 'charge.success') {
    const reference = data?.reference;
    if (typeof reference !== 'string') throw new Error('Webhook reference is missing.');
    try {
      const payment = await verifyAndFulfillPaystackPayment(reference);
      return { ignored: false, payment };
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Unknown payment reference')) throw error;
      if (!subscriptionCode) throw error;
      const renewal = await processRecurringCharge(reference, subscriptionCode, data?.customer?.email);
      return { ignored: false, renewal };
    }
  }

  if (payload?.event === 'subscription.create' && data) {
    const code = subscriptionCode;
    const emailToken = data.email_token || data.subscription?.email_token;
    const email = data.customer?.email?.toLowerCase();
    const planCode = data.plan?.plan_code;
    if (!code || !email || !planCode) throw new Error('Subscription event is missing required identifiers.');
    const planMap = await adminDb.ref('paystackPlanCodes').get();
    const matchedPlan = Object.entries(planMap.val() || {}).find(([, value]: [string, any]) => value?.planCode === planCode);
    if (!matchedPlan) throw new Error('Subscription plan could not be matched to a Varban plan.');
    const [planId] = matchedPlan as [string, any];
    const transactions = await adminDb.ref('paystackTransactions').orderByChild('email').equalTo(email).limitToLast(20).get();
    const candidates = Object.values(transactions.val() || {}) as any[];
    const payment = candidates.find(item => item.itemType === 'organization_plan' && item.itemId === `org-upgrade-${planId}` && ['pending', 'processing', 'completed'].includes(item.status));
    if (!payment?.organizationId) throw new Error('Organization checkout could not be matched to the subscription.');
    await adminDb.ref(`organizations/${payment.organizationId}`).update({
      paystackSubscriptionCode: code,
      paystackEmailToken: emailToken || null,
      paystackPlanCode: planCode,
      subscriptionStatus: payment.status === 'completed' ? 'active' : 'pending_verification',
      subscriptionNextPaymentDate: data.next_payment_date || data.subscription?.next_payment_date || null,
      billingProvider: 'paystack',
      billingInterval: 'monthly',
      updatedAt: Date.now(),
    });
    return { ignored: false, subscriptionCode: code };
  }

  if (payload?.event === 'invoice.payment_failed' && subscriptionCode) {
    const orgs = await adminDb.ref('organizations').get();
    const match = Object.entries(orgs.val() || {}).find(([, value]: [string, any]) => value?.paystackSubscriptionCode === subscriptionCode);
    if (match) await adminDb.ref(`organizations/${match[0]}`).update({ subscriptionStatus: 'past_due', subscriptionLastPaymentFailureAt: Date.now() });
    return { ignored: false, status: 'past_due' };
  }

  if ((payload?.event === 'subscription.not_renew' || payload?.event === 'subscription.disable') && subscriptionCode) {
    const orgs = await adminDb.ref('organizations').get();
    const match = Object.entries(orgs.val() || {}).find(([, value]: [string, any]) => value?.paystackSubscriptionCode === subscriptionCode);
    if (match) await adminDb.ref(`organizations/${match[0]}`).update({
      subscriptionStatus: payload.event === 'subscription.not_renew' ? 'non_renewing' : 'cancelled',
      subscriptionExpiresAt: data?.next_payment_date || (match[1] as any)?.subscriptionNextPaymentDate || null,
    });
    return { ignored: false, status: payload.event };
  }

  return { ignored: true };
}
