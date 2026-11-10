import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/user-client';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const { client, user } = await createSupabaseUserClient(authorization.slice(7));
    const { data: allowed, error: roleError } = await client.rpc('has_role', {
      check_user_id: user.id, allowed_roles: ['admin','super_admin'],
    });
    if (roleError || !allowed) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
    const { userId } = await context.params;
    if (!userId || userId === user.id) return NextResponse.json({ error: 'You cannot delete your own administrator account.' }, { status: 400 });
    const admin = getSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supabase account deletion failed:', error instanceof Error ? error.message : 'Unknown error');
    const message = error instanceof Error && error.message.includes('server operations')
      ? 'Account deletion is unavailable until SUPABASE_SERVICE_ROLE_KEY is configured.'
      : 'Could not delete this account.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
