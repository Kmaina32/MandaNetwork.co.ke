import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function getTimestamp() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (key: string) => parts.find(part => part.type === key)?.value ?? '';
  return value('year') + value('month') + value('day') + value('hour') + value('minute') + value('second');
}
function mpesaBaseUrl() {
  return process.env.MPESA_ENVIRONMENT === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
}
async function queryProviderStatus(checkoutRequestId: string) {
  const shortCode = process.env.MPESA_TILL_NUMBER, passkey = process.env.MPESA_PASSKEY;
  const consumerKey = process.env.MPESA_CONSUMER_KEY, consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  if (!shortCode || !passkey || !consumerKey || !consumerSecret) throw new Error('M-Pesa verification is not configured.');
  const basic = Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');
  const tokenResponse = await axios.get(mpesaBaseUrl() + '/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: 'Basic ' + basic }, timeout: 15000,
  });
  const token = tokenResponse.data?.access_token;
  if (!token) throw new Error('M-Pesa provider authentication failed.');
  const timestamp = getTimestamp();
  const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');
  const response = await axios.post(mpesaBaseUrl() + '/mpesa/stkpushquery/v1/query', {
    BusinessShortCode: shortCode, Password: password, Timestamp: timestamp, CheckoutRequestID: checkoutRequestId,
  }, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, timeout: 20000 });
  return response.data;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment verification is temporarily unavailable.' }, { status: 503 });
    }
    const body = await request.json();
    const callback = body?.Body?.stkCallback;
    const checkoutRequestId = callback?.CheckoutRequestID;
    if (typeof checkoutRequestId !== 'string' || !/^ws_CO_[A-Za-z0-9]+$/.test(checkoutRequestId)) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback' }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { data: transaction, error: readError } = await admin.from('payment_transactions').select('*')
      .eq('provider', 'mpesa').filter('provider_payload->>checkoutRequestId', 'eq', checkoutRequestId).maybeSingle();
    if (readError) throw readError;
    if (!transaction) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unknown transaction' }, { status: 404 });
    if (transaction.status === 'success') return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    if (!['pending', 'initialized'].includes(transaction.status)) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Transaction is not awaiting confirmation' });
    }

    if (Number(callback.ResultCode) !== 0) {
      const { error: failureError } = await admin.from('payment_transactions').update({
        status: 'failed',
        provider_payload: { ...(transaction.provider_payload || {}), providerDescription: String(callback.ResultDesc || 'Payment failed').slice(0, 300) },
        updated_at: new Date().toISOString(),
      }).eq('id', transaction.id).in('status', ['pending', 'initialized']);
      if (failureError) throw failureError;
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Failure recorded' });
    }

    const items = callback.CallbackMetadata?.Item;
    if (!Array.isArray(items)) throw new Error('Missing payment metadata');
    const metadata = (name: string) => items.find((item: any) => item?.Name === name)?.Value;
    const amount = Number(metadata('Amount'));
    const receipt = metadata('MpesaReceiptNumber');
    const phone = String(metadata('PhoneNumber') || '');
    if (amount !== Number(transaction.amount_kes)
      || phone !== String(transaction.provider_payload?.phoneNumber)
      || typeof receipt !== 'string' || !/^[A-Z0-9]{8,16}$/.test(receipt)) {
      throw new Error('Callback metadata does not match the stored payment request.');
    }

    // The callback itself is not trusted as proof of payment. Query Daraja independently.
    const providerStatus = await queryProviderStatus(checkoutRequestId);
    if (String(providerStatus?.ResponseCode) !== '0'
      || String(providerStatus?.ResultCode) !== '0'
      || providerStatus?.CheckoutRequestID !== checkoutRequestId) {
      throw new Error('Safaricom has not confirmed successful settlement for this checkout.');
    }

    const { data: fulfilled, error: fulfillmentError } = await admin.rpc('fulfill_verified_course_payment', {
      p_reference: transaction.reference,
      p_provider: 'mpesa',
      p_confirmed_amount: amount,
      p_confirmed_currency: transaction.currency,
      p_customer_email: null,
      p_provider_payload: {
        receipt,
        confirmedPhone: phone,
        confirmedAmount: amount,
        checkoutRequestId,
        confirmedAt: new Date().toISOString(),
      },
    });
    if (fulfillmentError) throw fulfillmentError;
    if (fulfilled !== true) throw new Error('Verified M-Pesa payment fulfillment did not complete.');
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Payment confirmed and enrollment completed' });
  } catch (error) {
    console.error('Supabase M-Pesa callback verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment verification pending' }, { status: 500 });
  }
}
