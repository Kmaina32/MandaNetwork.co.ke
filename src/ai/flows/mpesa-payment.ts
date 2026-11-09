'use server';

import axios from 'axios';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { verifySupabaseAccessToken } from '@/lib/supabase/verify-access-token';

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

export async function processMpesaPayment(input: MpesaPaymentInput): Promise<MpesaPaymentOutput> {
  try {
    const parsed = MpesaPaymentInputSchema.parse(input);
    const decoded = await verifySupabaseAccessToken(parsed.idToken);
    const userId = decoded.legacyUid;

    const courseSnapshot = await adminDb.ref(`courses/${parsed.courseId}`).get();
    if (!courseSnapshot.exists()) return { success: false, message: 'This course is no longer available.' };
    const course = courseSnapshot.val();
    const amount = Number(course.price);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      return { success: false, message: 'This course does not have a valid payment amount. Please contact support.' };
    }

    const shortCode = process.env.MPESA_TILL_NUMBER;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    if (!shortCode || !passkey || !callbackUrl) {
      return { success: false, message: 'M-Pesa payments are temporarily unavailable. Please contact support.' };
    }
    let callback: URL;
    try { callback = new URL(callbackUrl); } catch { return { success: false, message: 'M-Pesa callback configuration is invalid.' }; }
    if (callback.protocol !== 'https:') return { success: false, message: 'M-Pesa callback must use HTTPS.' };

    const phone = parsed.phoneNumber.startsWith('254')
      ? parsed.phoneNumber
      : `254${parsed.phoneNumber.slice(-9)}`;
    if (!/^254\d{9}$/.test(phone)) return { success: false, message: 'Enter a valid Kenyan mobile number.' };

    const timestamp = getTimestamp();
    const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');
    const accessToken = await getMpesaAccessToken();
    const response = await axios.post(`${mpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: callback.toString(),
      AccountReference: 'VarbanAcademy',
      TransactionDesc: `Course payment: ${String(course.title || parsed.courseId).slice(0, 60)}`,
    }, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    const checkoutRequestId = response.data?.CheckoutRequestID;
    if (response.data?.ResponseCode !== '0' || typeof checkoutRequestId !== 'string') {
      return { success: false, message: response.data?.ResponseDescription || 'M-Pesa could not start the payment. Please try again.' };
    }

    await adminDb.ref(`mpesaTransactions/${checkoutRequestId}`).set({
      uid: userId,
      courseId: parsed.courseId,
      amount,
      phoneNumber: phone,
      checkoutRequestId,
      status: 'pending',
      createdAt: Date.now(),
      environment: process.env.MPESA_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    });

    return {
      success: true,
      message: 'Payment request sent. Complete the M-Pesa prompt; course access is granted only after provider confirmation.',
      checkoutRequestId,
    };
  } catch (error) {
    console.error('M-Pesa initiation failed:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      message: error instanceof Error && error.name === 'FirebaseAuthError'
        ? 'Your session has expired. Sign in again and retry.'
        : 'M-Pesa payment could not be initiated. Please try again.',
    };
  }
}

export async function getMpesaPaymentStatus(idToken: string, checkoutRequestId: string): Promise<'pending' | 'processing' | 'completed' | 'failed' | 'unknown'> {
  const decoded = await verifySupabaseAccessToken(idToken);
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(checkoutRequestId)) throw new Error('Invalid checkout request.');
  const snapshot = await adminDb.ref(`mpesaTransactions/${checkoutRequestId}`).get();
  if (!snapshot.exists()) return 'unknown';
  const transaction = snapshot.val();
  if (transaction.uid !== decoded.legacyUid) throw new Error('Not authorized to view this payment.');
  return transaction.status;
}
