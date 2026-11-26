import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    // Honeypot: return the same success response without persisting bot submissions.
    if (typeof body.website === 'string' && body.website.trim()) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const interest = typeof body.interest === 'string' ? body.interest.trim() : '';

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    }
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    const allowedInterests = ['Financial markets', 'Forex and trading', 'Investing and wealth', 'Professional development', 'I am exploring'];
    if (interest && !allowedInterests.includes(interest)) {
      return NextResponse.json({ error: 'Please select a valid area of interest.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('waitlist_signups').insert({
      full_name: name,
      email,
      interest: interest || null,
      source: 'temporary_landing_page',
    });

    if (error?.code === '23505') {
      return NextResponse.json({ success: true, message: 'This email is already on the list.' }, { status: 200 });
    }
    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Waitlist signup failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'We could not add you to the waitlist right now. Please try again shortly.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
