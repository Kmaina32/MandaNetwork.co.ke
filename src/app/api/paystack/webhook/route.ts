import { NextRequest, NextResponse } from 'next/server';
import { handlePaystackWebhookEvent, verifyPaystackWebhookSignature } from '@/lib/paystack';

export const runtime='nodejs';

export async function POST(request:NextRequest) {
  if(!process.env.PAYSTACK_SECRET_KEY||!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({error:'Paystack webhook processing is not configured on this deployment.'},{status:503});
  const rawBody=await request.text();
  try {
    if(!verifyPaystackWebhookSignature(rawBody,request.headers))
      return NextResponse.json({error:'Invalid webhook signature.'},{status:401});
    const event=JSON.parse(rawBody);
    await handlePaystackWebhookEvent(event);
    return NextResponse.json({received:true});
  } catch(error) {
    console.error('Paystack webhook processing failed:',error instanceof Error?error.message:'Unknown error');
    return NextResponse.json({error:'Webhook processing failed. Paystack may retry this event.'},{status:500});
  }
}
