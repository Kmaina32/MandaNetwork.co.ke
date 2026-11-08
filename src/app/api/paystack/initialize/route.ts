import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { initializePaystackTransaction, newPaystackReference } from '@/lib/paystack';

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
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(itemId)) {
      return NextResponse.json({ error: 'Select a valid item to purchase.' }, { status: 400 });
    }
    if (!decoded.email || !decoded.email_verified) {
      return NextResponse.json({ error: 'Verify your email address before making a payment.' }, { status: 403 });
    }

    const profileSnapshot = await adminDb.ref(`users/${decoded.uid}`).get();
    const profile = profileSnapshot.val() || {};
    let itemType: 'course' | 'organization_plan';
    let itemName: string;
    let amount: number;
    let organizationId: string | undefined;

    if (itemId.startsWith('org-upgrade-')) {
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
      itemName = String(plan.name || '').trim();
      amount = Number(plan.price);
      if (!['basic', 'pro'].includes(itemName.toLowerCase())) {
        return NextResponse.json({ error: 'This organization plan is not available for online activation.' }, { status: 409 });
      }
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
    const transaction = {
      uid: decoded.uid,
      email: decoded.email.toLowerCase(),
      itemType,
      itemId,
      itemName,
      organizationId: organizationId || null,
      amount,
      currency: 'KES',
      reference,
      status: 'initializing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await adminDb.ref(`paystackTransactions/${reference}`).set(transaction);

    try {
      const checkout = await initializePaystackTransaction({
        email: transaction.email,
        amount,
        reference,
        callbackUrl: parsedCallback.toString(),
        metadata: { uid: decoded.uid, itemType, itemId, itemName },
      });
      await adminDb.ref(`paystackTransactions/${reference}`).update({ status: 'pending', updatedAt: Date.now() });
      return NextResponse.json({ authorizationUrl: checkout.authorizationUrl, reference });
    } catch (error) {
      await adminDb.ref(`paystackTransactions/${reference}`).update({ status: 'failed', updatedAt: Date.now() });
      throw error;
    }
  } catch (error) {
    console.error('Paystack initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to start Paystack checkout.' }, { status: 500 });
  }
}
