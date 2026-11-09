import { NextRequest, NextResponse } from 'next/server';
import { handlePaystackWebhookEvent, verifyPaystackWebhookSignature } from '@/lib/paystack';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyPaystackWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }
  try {
    const event = JSON.parse(rawBody);
    await handlePaystackWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paystack webhook processing failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Webhook processing failed. Paystack may retry this event.' }, { status: 500 });
  }
}
