import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Please sign in to manage your subscription.' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authorization.slice(7), true);
    const profile = (await adminDb.ref(`users/${decoded.uid}`).get()).val() || {};
    const organizationId = profile.organizationId;
    if (!organizationId) return NextResponse.json({ error: 'An organization account is required.' }, { status: 403 });

    const organizationSnapshot = await adminDb.ref(`organizations/${organizationId}`).get();
    const organization = organizationSnapshot.val();
    if (!organization || organization.ownerId !== decoded.uid) {
      return NextResponse.json({ error: 'Only the organization owner can manage billing.' }, { status: 403 });
    }
    const subscriptionCode = organization.paystackSubscriptionCode;
    if (typeof subscriptionCode !== 'string' || !subscriptionCode.startsWith('SUB_')) {
      return NextResponse.json({ error: 'No active Paystack subscription was found.' }, { status: 404 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || !/^sk_(test|live)_/.test(secret)) {
      return NextResponse.json({ error: 'Paystack is not configured.' }, { status: 503 });
    }
    const response = await fetch(`https://api.paystack.co/subscription/${encodeURIComponent(subscriptionCode)}/manage/link/`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.status !== true || typeof result?.data?.link !== 'string') {
      return NextResponse.json({ error: 'Paystack could not generate a subscription management link.' }, { status: 502 });
    }
    const link = new URL(result.data.link);
    if (link.protocol !== 'https:' || link.hostname !== 'paystack.com') {
      return NextResponse.json({ error: 'Paystack returned an invalid management link.' }, { status: 502 });
    }
    return NextResponse.json({ url: link.toString() });
  } catch (error) {
    console.error('Paystack subscription management link failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to open subscription management right now.' }, { status: 500 });
  }
}
