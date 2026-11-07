import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

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

async function queryProviderStatus(checkoutRequestId: string) {
  const shortCode = process.env.MPESA_TILL_NUMBER;
  const passkey = process.env.MPESA_PASSKEY;
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  if (!shortCode || !passkey || !consumerKey || !consumerSecret) throw new Error('M-Pesa verification is not configured.');

  const basic = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const tokenResponse = await axios.get(`${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` }, timeout: 15000,
  });
  const accessToken = tokenResponse.data?.access_token;
  if (!accessToken) throw new Error('Provider authentication failed.');

  const timestamp = getTimestamp();
  const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');
  const response = await axios.post(`${mpesaBaseUrl()}/mpesa/stkpushquery/v1/query`, {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  }, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    timeout: 20000,
  });
  return response.data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const callback = body?.Body?.stkCallback;
    const checkoutRequestId = callback?.CheckoutRequestID;
    if (typeof checkoutRequestId !== 'string' || !checkoutRequestId) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback' }, { status: 400 });
    }

    const transactionRef = adminDb.ref(`mpesaTransactions/${checkoutRequestId}`);
    const snapshot = await transactionRef.get();
    if (!snapshot.exists()) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unknown transaction' }, { status: 404 });
    }
    const transaction = snapshot.val();
    if (transaction.status === 'completed') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }
    if (transaction.status !== 'pending') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Transaction already being processed' });
    }
    if (Number(callback.ResultCode) !== 0) {
      await transactionRef.update({ status: 'failed', providerDescription: String(callback.ResultDesc || 'Payment failed').slice(0, 300), updatedAt: Date.now() });
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Failure recorded' });
    }

    const items = callback.CallbackMetadata?.Item;
    if (!Array.isArray(items)) throw new Error('Missing payment metadata');
    const metadata = (name: string) => items.find((item: any) => item?.Name === name)?.Value;
    const amount = Number(metadata('Amount'));
    const receipt = metadata('MpesaReceiptNumber');
    const phone = String(metadata('PhoneNumber') || '');
    if (amount !== Number(transaction.amount) || phone !== String(transaction.phoneNumber) || typeof receipt !== 'string' || !receipt) {
      throw new Error('Callback metadata does not match the stored payment request.');
    }

    // A callback is only a notification. Ask Safaricom directly before granting access.
    const providerStatus = await queryProviderStatus(checkoutRequestId);
    if (String(providerStatus?.ResponseCode) !== '0' || String(providerStatus?.ResultCode) !== '0') {
      throw new Error('Safaricom has not confirmed successful settlement.');
    }

    const lock = await transactionRef.transaction((current) => {
      if (!current || current.status !== 'pending') return;
      return { ...current, status: 'processing', updatedAt: Date.now() };
    });
    if (!lock.committed) {
      const latest = (await transactionRef.get()).val();
      return NextResponse.json({ ResultCode: 0, ResultDesc: latest?.status === 'completed' ? 'Already processed' : 'Already processing' });
    }

    const completedAt = Date.now();
    // Commit enrollment and transaction completion together so a retry cannot leave
    // a paid user unenrolled or a failed database write marked as settled.
    await adminDb.ref().update({
      [`users/${transaction.uid}/purchasedCourses/${transaction.courseId}`]: {
        progress: 0,
        completed: false,
        certificateAvailable: false,
        completedLessons: [],
        enrollmentDate: new Date().toISOString(),
        paymentMethod: 'mpesa',
        paymentReceipt: receipt,
      },
      [`mpesaTransactions/${checkoutRequestId}`]: {
        ...transaction,
        status: 'completed',
        receipt,
        confirmedAmount: amount,
        confirmedPhone: phone,
        completedAt,
      },
    });

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Payment confirmed and enrollment completed' });
  } catch (error) {
    console.error('M-Pesa callback verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment verification pending' }, { status: 500 });
  }
}
