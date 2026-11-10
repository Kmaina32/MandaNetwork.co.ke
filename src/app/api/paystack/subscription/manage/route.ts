import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/user-client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Please sign in to manage your subscription.' }, { status: 401 });
    }
    const { user, client } = await createSupabaseUserClient(authorization.slice(7));
    const { data: membership, error } = await client.from('organization_members')
      .select('organization_id,member_role').eq('user_id', user.id).eq('status', 'active')
      .in('member_role', ['owner','admin']).limit(1).maybeSingle();
    if (error) throw error;
    if (!membership) return NextResponse.json({ error: 'An organization owner account is required.' }, { status: 403 });

    return NextResponse.json({
      error: 'Subscription self-management is temporarily unavailable while organization billing is being moved to Supabase. No Firebase billing records are accessed.',
    }, { status: 409 });
  } catch (error) {
    console.error('Supabase subscription management check failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to verify subscription access right now.' }, { status: 500 });
  }
}
