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
      return NextResponse.json({ error: 'Please sign in with your invited email address.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const inviteId = typeof body.inviteId === 'string' ? body.inviteId.trim() : '';
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(inviteId)) {
      return NextResponse.json({ error: 'Invalid invitation link.' }, { status: 400 });
    }

    const invitationRef = adminDb.ref(`invitations/${inviteId}`);
    const invitationSnapshot = await invitationRef.get();
    if (!invitationSnapshot.exists()) {
      return NextResponse.json({ error: 'This invitation is no longer available.' }, { status: 404 });
    }
    const invitation = invitationSnapshot.val();
    if (String(invitation.email || '').trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      return NextResponse.json({ error: 'This invitation was sent to a different email address.' }, { status: 403 });
    }
    if (invitation.status === 'accepted') {
      if (invitation.userId) {
        const existingUser = await adminAuth.getUserByEmail(user.email);
        if (existingUser.uid === invitation.userId) return NextResponse.json({ success: true, organizationId: invitation.organizationId });
      }
      return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 409 });
    }
    if (invitation.expiresAt) {
      const expiry = typeof invitation.expiresAt === 'number' ? invitation.expiresAt : Date.parse(String(invitation.expiresAt));
      if (Number.isFinite(expiry) && expiry <= Date.now()) {
        return NextResponse.json({ error: 'This invitation has expired. Ask your organization administrator for a new one.' }, { status: 410 });
      }
    }

    const organizationId = typeof invitation.organizationId === 'string' ? invitation.organizationId : '';
    if (!organizationId || !(await adminDb.ref(`organizations/${organizationId}`).get()).exists()) {
      return NextResponse.json({ error: 'The organization linked to this invitation could not be found.' }, { status: 404 });
    }

    let firebaseUid = user.id;
    try {
      firebaseUid = (await adminAuth.getUserByEmail(user.email)).uid;
    } catch (lookupError) {
      if ((lookupError as { code?: string })?.code !== 'auth/user-not-found') throw lookupError;
    }

    const userRef = adminDb.ref(`users/${firebaseUid}`);
    await userRef.update({
      email: user.email,
      displayName: String(user.user_metadata?.display_name || user.user_metadata?.full_name || user.email.split('@')[0]),
      organizationId,
      isOrganizationAdmin: false,
    });
    await invitationRef.update({
      status: 'accepted',
      userId: firebaseUid,
      acceptedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, organizationId }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, private' },
    });
  } catch (error) {
    console.error('Could not accept organization invitation:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'We could not accept this invitation. Please contact your organization administrator.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store, private' },
    });
  }
}
