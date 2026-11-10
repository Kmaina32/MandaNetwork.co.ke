import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/user-client';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { initializePaystackTransaction, newPaystackReference } from '@/lib/paystack';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!process.env.PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_CALLBACK_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      error: 'Paystack checkout is disabled until PAYSTACK_SECRET_KEY, PAYSTACK_CALLBACK_URL and SUPABASE_SERVICE_ROLE_KEY are configured for this deployment.',
    }, { status: 503 });
  }
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Please sign in before making a payment.' }, { status: 401 });
    }
    const { user } = await createSupabaseUserClient(authorization.slice(7));
    if (!user.email || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Verify your email address before making a payment.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
    const purchaseType = typeof body.purchaseType === 'string' ? body.purchaseType : 'course';
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(itemId)) {
      return NextResponse.json({ error: 'Select a valid item to purchase.' }, { status: 400 });
    }
    // Other purchase types are deliberately blocked until their first-class Supabase
    // catalogs and fulfillment flows are in place. Never fall back to Firebase.
    if (purchaseType !== 'course') {
      return NextResponse.json({ error: 'This payment type is not yet available on the new secure checkout. Please contact support.' }, { status: 409 });
    }

    const admin = getSupabaseAdminClient();
    const { data: course, error: courseError } = await admin.from('courses')
      .select('id,title,price,is_published').eq('id', itemId).eq('is_published', true).maybeSingle();
    if (courseError) throw courseError;
    if (!course) return NextResponse.json({ error: 'This course is no longer available.' }, { status: 404 });

    const amount = Number(course.price);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10_000_000) {
      return NextResponse.json({ error: 'This course has an invalid payment amount. Contact support.' }, { status: 409 });
    }

    const { data: existingEnrollment, error: enrollmentError } = await admin.from('enrollments')
      .select('id').eq('user_id', user.id).eq('course_id', itemId).maybeSingle();
    if (enrollmentError) throw enrollmentError;
    if (existingEnrollment) return NextResponse.json({ error: 'You already have access to this course.' }, { status: 409 });

    const { data: activePayments, error: activeError } = await admin.from('payment_transactions')
      .select('reference,status,created_at').eq('user_id', user.id).eq('item_type', 'course')
      .eq('item_id', itemId).in('status', ['initialized', 'pending'])
      .order('created_at', { ascending: false }).limit(5);
    if (activeError) throw activeError;
    const recent = (activePayments || []).find((payment: any) =>
      Date.now() - new Date(payment.created_at).getTime() < 20 * 60 * 1000);
    if (recent) return NextResponse.json({ error: 'A checkout for this course is already in progress. Complete it or wait before retrying.' }, { status: 409 });

    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL;
    if (!callbackUrl) return NextResponse.json({ error: 'Paystack callback URL has not been configured.' }, { status: 503 });
    const parsedCallback = new URL(callbackUrl);
    if (parsedCallback.protocol !== 'https:' || !parsedCallback.pathname.endsWith('/api/paystack/callback')) {
      return NextResponse.json({ error: 'Paystack callback URL must be a valid HTTPS callback endpoint.' }, { status: 503 });
    }

    const reference = newPaystackReference();
    const now = new Date().toISOString();
    const { error: insertError } = await admin.from('payment_transactions').insert({
      id: reference, user_id: user.id, provider: 'paystack', reference,
      item_type: 'course', item_id: itemId, amount_kes: amount,
      currency: 'KES', status: 'initialized',
      provider_payload: { email: user.email.toLowerCase(), itemName: String(course.title || 'Course').slice(0, 120) },
      created_at: now, updated_at: now,
    });
    if (insertError) throw insertError;

    try {
      const checkout = await initializePaystackTransaction({
        email: user.email.toLowerCase(), amount, reference,
        callbackUrl: parsedCallback.toString(),
        metadata: { uid: user.id, itemType: 'course', itemId, itemName: String(course.title || 'Course').slice(0, 120) },
      });
      const { error: updateError } = await admin.from('payment_transactions')
        .update({ status: 'pending', updated_at: new Date().toISOString() }).eq('reference', reference);
      if (updateError) throw updateError;
      return NextResponse.json({ authorizationUrl: checkout.authorizationUrl, reference });
    } catch (error) {
      await admin.from('payment_transactions').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('reference', reference);
      throw error;
    }
  } catch (error) {
    console.error('Supabase Paystack initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    const message = error instanceof Error && /session/i.test(error.message)
      ? 'Your sign-in session has expired. Please sign in again.'
      : 'Unable to start Paystack checkout. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
