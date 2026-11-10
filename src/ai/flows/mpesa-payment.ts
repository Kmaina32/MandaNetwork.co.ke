'use server';

import { z } from 'zod';
import { createSupabaseUserClient } from '@/lib/supabase/user-client';

const MpesaPaymentInputSchema = z.object({
  idToken: z.string().min(20),
  phoneNumber: z.string().regex(/^(?:0|254)\d{9,11}$/),
  courseId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
});
export type MpesaPaymentInput = z.infer<typeof MpesaPaymentInputSchema>;

const MpesaPaymentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  checkoutRequestId: z.string().optional(),
});
export type MpesaPaymentOutput = z.infer<typeof MpesaPaymentOutputSchema>;

function getTimestamp() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (key: string) => parts.find(part => part.type === key)?.value ?? '';
  return value('year') + value('month') + value('day') + value('hour') + value('minute') + value('second');
}

function mpesaBaseUrl() {
  return process.env.MPESA_ENVIRONMENT === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

async function getMpesaAccessToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) throw new Error('M-Pesa is not configured.');
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const response = await axios.get(`${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    timeout: 15000,
  });
  if (!response.data?.access_token) throw new Error('M-Pesa authentication failed.');
  return response.data.access_token;
}

export async function processMpesaPayment(_input: MpesaPaymentInput): Promise<MpesaPaymentOutput> {
  return {
    success: false,
    message: 'M-Pesa checkout is temporarily disabled while the Supabase callback verification and reconciliation flow is completed. No payment will be initiated without verified callback handling.',
  };
}


export async function getMpesaPaymentStatus(idToken: string, checkoutRequestId: string): Promise<'pending' | 'processing' | 'completed' | 'failed' | 'unknown'> {
  const { client, user } = await createSupabaseUserClient(idToken);
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(checkoutRequestId)) throw new Error('Invalid checkout request.');
  const { data, error } = await client.from('payment_transactions').select('status,provider_payload')
    .eq('provider','mpesa').filter('provider_payload->>checkoutRequestId','eq',checkoutRequestId).maybeSingle();
  if (error) throw error;
  if (!data) return 'unknown';
  return data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'failed' : 'pending';
}
