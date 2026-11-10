import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { createPaystackPlan, initializePaystackTransaction, newPaystackReference } from '@/lib/paystack';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Please sign in before making a payment.' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authorization.slice(7), true);
    const body = await request.json().catch(() => ({}));
    const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
    const requestedType = body.purchaseType === 'organization_plan' || itemId.startsWith('org-upgrade-')
      ? 'organization_plan'
      : body.purchaseType === 'hackathon' ? 'hackathon' : 'course';
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(itemId)) {
      return NextResponse.json({ error: 'Select a valid item to purchase.' }, { status: 400 });
    }
    if (!decoded.email || !decoded.email_verified) {
      return NextResponse.json({ error: 'Verify your email address before making a payment.' }, { status: 403 });
    }

    const profileSnapshot = await adminDb.ref(`users/${decoded.uid}`).get();
    const profile = profileSnapshot.val() || {};
    let itemType: 'course' | 'hackathon' | 'organization_plan';
    let itemName: string;
    let amount: number;
    let organizationId: string | undefined;
    let pricingPlanId: string | undefined;
    let recurringPlanCode: string | undefined;

    if (requestedType === 'organization_plan') {
      itemType = 'organization_plan';
      const planId = itemId.slice('org-upgrade-'.length);
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(planId) || !profile.organizationId) {
        return NextResponse.json({ error: 'An organization account is required for this upgrade.' }, { status: 403 });
      }
      organizationId = profile.organizationId;
      const [organizationSnapshot, planSnapshot] = await Promise.all([
        adminDb.ref(`organizations/${organizationId}`).get(),
        adminDb.ref(`pricingPlans/${planId}`).get(),
      ]);
      if (!organizationSnapshot.exists() || organizationSnapshot.val()?.ownerId !== decoded.uid) {
        return NextResponse.json({ error: 'Only the organization owner can purchase this plan.' }, { status: 403 });
      }
      if (!planSnapshot.exists()) return NextResponse.json({ error: 'This plan is no longer available.' }, { status: 404 });
      const plan = planSnapshot.val();
      pricingPlanId = planId;
      itemName = String(plan.name || '').trim();
      amount = Number(plan.price);
      if (!['basic', 'pro'].includes(itemName.toLowerCase())) {
        return NextResponse.json({ error: 'This organization plan is not available for online activation.' }, { status: 409 });
      }
    } else if (requestedType === 'hackathon') {
      itemType = 'hackathon';
      const hackathonSnapshot = await adminDb.ref(`hackathons/${itemId}`).get();
      if (!hackathonSnapshot.exists()) return NextResponse.json({ error: 'This hackathon is no longer available.' }, { status: 404 });
      const hackathon = hackathonSnapshot.val();
      itemName = String(hackathon.title || 'Hackathon').slice(0, 120);
      amount = Number(hackathon.entryFee);
      const existing = await adminDb.ref(`hackathons/${itemId}/participants/${decoded.uid}`).get();
      if (existing.exists() && existing.val() === true) return NextResponse.json({ error: 'You are already registered for this hackathon.' }, { status: 409 });
    } else {
      itemType = 'course';
      const courseSnapshot = await adminDb.ref(`courses/${itemId}`).get();
      if (!courseSnapshot.exists()) return NextResponse.json({ error: 'This course is no longer available.' }, { status: 404 });
      const course = courseSnapshot.val();
      itemName = String(course.title || 'Course').slice(0, 120);
      amount = Number(course.price);
      const existing = await adminDb.ref(`users/${decoded.uid}/purchasedCourses/${itemId}`).get();
      if (existing.exists()) return NextResponse.json({ error: 'You already have access to this course.' }, { status: 409 });
    }

    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10000000) {
      return NextResponse.json({ error: 'This item has an invalid payment amount. Contact support.' }, { status: 409 });
    }

    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL;
    if (!callbackUrl) {
      return NextResponse.json({ error: 'Paystack callback URL has not been configured.' }, { status: 503 });
    }
    const parsedCallback = new URL(callbackUrl);
    if (parsedCallback.protocol !== 'https:' || !parsedCallback.pathname.endsWith('/api/paystack/callback')) {
      return NextResponse.json({ error: 'Paystack callback URL must be a valid HTTPS callback endpoint.' }, { status: 503 });
    }

    const reference = newPaystackReference();
    const now = Date.now();
    const lockRef = adminDb.ref(`paymentCheckoutLocks/${decoded.uid}/${itemType}-${itemId}`);
    const lock = await lockRef.transaction((current) => {
      if (current && Number(current.expiresAt) > now) return;
      return { reference, expiresAt: now + 20 * 60 * 1000 };
    });
    if (!lock.committed) {
      return NextResponse.json({ error: 'A checkout for this item is already in progress. Complete it or wait 20 minutes before retrying.' }, { status: 409 });
    }

    if (itemType === 'organization_plan' && pricingPlanId) {
      const cachedPlan = await adminDb.ref(`paystackPlanCodes/${pricingPlanId}`).get();
      const cached = cachedPlan.val();
      if (cached?.amount === amount && cached?.currency === 'KES' && cached?.interval === 'monthly' && typeof cached?.planCode === 'string') {
        recurringPlanCode = cached.planCode;
      } else {
        const createdPlan = await createPaystackPlan({ name: `Varban ${itemName} monthly`, amount, currency: 'KES', interval: 'monthly' });
        recurringPlanCode = createdPlan.planCode;
        await adminDb.ref(`paystackPlanCodes/${pricingPlanId}`).set({ planCode: recurringPlanCode, amount, currency: 'KES', interval: 'monthly', updatedAt: Date.now() });
      }
    }

    const transaction = {
      uid: decoded.uid,
      email: decoded.email.toLowerCase(),
      itemType,
      itemId,
      itemName,
      organizationId: organizationId || null,
      pricingPlanId: pricingPlanId || null,
      recurring: itemType === 'organization_plan',
      billingInterval: itemType === 'organization_plan' ? 'monthly' : null,
      amount,
      currency: 'KES',
      reference,
      status: 'initializing',
      createdAt: now,
      updatedAt: now,
    };
    await adminDb.ref(`paystackTransactions/${reference}`).set(transaction);

    try {
      const checkout = await initializePaystackTransaction({
        email: transaction.email,
        amount,
        reference,
        callbackUrl: parsedCallback.toString(),
        metadata: { uid: decoded.uid, itemType, itemId, itemName },
        ...(recurringPlanCode ? { planCode: recurringPlanCode } : {}),
      });
      await adminDb.ref(`paystackTransactions/${reference}`).update({ status: 'pending', updatedAt: Date.now() });
      return NextResponse.json({ authorizationUrl: checkout.authorizationUrl, reference });
    } catch (error) {
      await adminDb.ref(`paystackTransactions/${reference}`).update({ status: 'failed', updatedAt: Date.now() });
      await lockRef.transaction((current) => current?.reference === reference ? null : current);
      throw error;
    }
  } catch (error) {
    console.error('Paystack initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start Paystack checkout.' }, { status: 500 });
  }
}
