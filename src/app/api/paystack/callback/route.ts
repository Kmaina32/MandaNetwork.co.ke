import { NextRequest, NextResponse } from 'next/server';
import { verifyAndFulfillPaystackPayment } from '@/lib/paystack';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference') || '';
  try {
    await verifyAndFulfillPaystackPayment(reference);
    return NextResponse.redirect(new URL('/courses?payment=success', request.url));
  } catch (error) {
    console.error('Paystack callback verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.redirect(new URL('/courses?payment=pending', request.url));
  }
}
