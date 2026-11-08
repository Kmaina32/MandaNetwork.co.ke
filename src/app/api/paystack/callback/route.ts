import { NextRequest, NextResponse } from 'next/server';
import { verifyAndFulfillPaystackPayment } from '@/lib/paystack';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference') || '';
  try {
    const payment = await verifyAndFulfillPaystackPayment(reference);
    const destination = payment.itemType === 'organization_plan' ? '/organization/billing' : '/courses';
    return NextResponse.redirect(new URL(`${destination}?payment=success`, request.url));
  } catch (error) {
    console.error('Paystack callback verification failed:', error instanceof Error ? error.message : 'Unknown error');
    let destination = '/courses?payment=pending';
    if (/^VA-[0-9a-f-]{36}$/i.test(reference)) {
      const snapshot = await adminDb.ref(`paystackTransactions/${reference}`).get().catch(() => null);
      if (snapshot?.val()?.itemType === 'organization_plan') destination = '/organization/billing?payment=pending';
    }
    return NextResponse.redirect(new URL(destination, request.url));
  }
}
