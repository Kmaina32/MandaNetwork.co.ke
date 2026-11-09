import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) {
      return NextResponse.json({ error: 'Please sign in with a verified email address.' }, { status: 401 });
    }
    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: 'Confirm your email address before continuing.' }, { status: 403 });
    }

    // Preserve existing Firebase-owned learner data for users who already have
    // a Firebase account with this verified Supabase email. New users receive
    // a Firebase identity with the Supabase UUID as its UID.
    let firebaseUser: Awaited<ReturnType<typeof adminAuth.getUser>> | null = null;
    try {
      firebaseUser = await adminAuth.getUserByEmail(user.email);
    } catch (lookupError) {
      if ((lookupError as { code?: string })?.code !== 'auth/user-not-found') throw lookupError;
    }

    if (!firebaseUser) {
      firebaseUser = await adminAuth.createUser({
        uid: user.id,
        email: user.email,
        emailVerified: true,
        displayName: String(user.user_metadata?.display_name || user.user_metadata?.full_name || user.email.split('@')[0]),
      });
    } else if (firebaseUser.disabled) {
      return NextResponse.json({ error: 'This account is disabled. Contact support.' }, { status: 403 });
    } else if (!firebaseUser.emailVerified) {
      firebaseUser = await adminAuth.updateUser(firebaseUser.uid, { emailVerified: true });
    }

    const firebaseUid = firebaseUser.uid;
    const trustedRole = user.app_metadata?.role;
    if (trustedRole === 'admin' || trustedRole === 'super_admin') {
      const adminProfile: Record<string, unknown> = {
        isAdmin: true,
        isSuperAdmin: trustedRole === 'super_admin',
        email: user.email,
        displayName: String(user.user_metadata?.display_name || user.user_metadata?.full_name || user.email.split('@')[0]),
        adminExpiresAt: user.app_metadata?.admin_expires_at ?? null,
      };
      await adminDb.ref(`users/${firebaseUid}`).update(adminProfile);
    }

    const customToken = await adminAuth.createCustomToken(firebaseUid, {
      supabase_uid: user.id,
    });

    return NextResponse.json(
      { token: customToken, firebaseUid },
      { status: 200, headers: { 'Cache-Control': 'no-store, private' } },
    );
  } catch (error) {
    console.error('Could not establish the legacy data session:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'We could not connect your learner data session. Please try again.' },
      { status: 503, headers: { 'Cache-Control': 'no-store, private' } },
    );
  }
}
