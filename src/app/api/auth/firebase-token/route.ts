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
    if (error || !user) {
      return NextResponse.json({ error: 'Please sign in before connecting your data session.' }, { status: 401 });
    }

    // Preserve existing Firebase-owned learner data for users who already have
    // a Firebase account with this verified Supabase email. New users use the
    // Supabase UUID as their Firebase UID so both systems share one identifier.
    let firebaseUid = user.id;
    if (user.email) {
      try {
        const existingFirebaseUser = await adminAuth.getUserByEmail(user.email);
        firebaseUid = existingFirebaseUser.uid;
      } catch (lookupError) {
        const code = (lookupError as { code?: string })?.code;
        if (code !== 'auth/user-not-found') throw lookupError;
      }
    }

    const trustedRole = user.app_metadata?.role;
    if (trustedRole === 'admin' || trustedRole === 'super_admin') {
      const adminProfile: Record<string, unknown> = {
        isAdmin: true,
        isSuperAdmin: trustedRole === 'super_admin',
        email: user.email || null,
        displayName: String(user.user_metadata?.display_name || user.user_metadata?.full_name || ''),
      };
      if (user.app_metadata?.admin_expires_at) {
        adminProfile.adminExpiresAt = user.app_metadata.admin_expires_at;
      }
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
