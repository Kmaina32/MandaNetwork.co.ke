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

export async function processMpesaPayment(_input: MpesaPaymentInput): Promise<MpesaPaymentOutput> {
  return {
    success: false,
    message: 'M-Pesa checkout is temporarily disabled while the Supabase callback verification and reconciliation flow is completed. No payment will be initiated without verified callback handling.',
  };
}


export async function getMpesaPaymentStatus(idToken: string, checkoutRequestId: string): Promise<'pending' | 'processing' | 'completed' | 'failed' | 'unknown'> {
  const { client } = await createSupabaseUserClient(idToken);
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(checkoutRequestId)) throw new Error('Invalid checkout request.');
  const { data, error } = await client.from('payment_transactions').select('status,provider_payload')
    .eq('provider','mpesa').filter('provider_payload->>checkoutRequestId','eq',checkoutRequestId).maybeSingle();
  if (error) throw error;
  if (!data) return 'unknown';
  return data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'failed' : 'pending';
}
