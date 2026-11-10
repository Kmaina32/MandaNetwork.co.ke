import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error:'Invalid request origin.' },{status:403});
    const supabase = await getSupabaseServerClient();
    const { data:{user}, error:authError } = await supabase.auth.getUser();
    if (authError || !user?.email) return NextResponse.json({ error:'Please sign in with your invited email address.' },{status:401});

    const body = await request.json().catch(()=>({}));
    const inviteId = typeof body.inviteId === 'string' ? body.inviteId.trim() : '';
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(inviteId)) return NextResponse.json({error:'Invalid invitation link.'},{status:400});

    const admin = getSupabaseAdminClient();
    const { data:invitation, error:readError } = await admin.from('organization_invitations').select('*').eq('id',inviteId).maybeSingle();
    if (readError) throw readError;
    if (!invitation) return NextResponse.json({error:'This invitation is no longer available.'},{status:404});
    if (String(invitation.email || '').trim().toLowerCase() !== user.email.trim().toLowerCase())
      return NextResponse.json({error:'This invitation was sent to a different email address.'},{status:403});
    if (invitation.status === 'accepted' && invitation.invited_user_id === user.id)
      return NextResponse.json({success:true,organizationId:invitation.organizationId});
    if (invitation.status !== 'pending') return NextResponse.json({error:'This invitation has already been used.'},{status:409});
    if (invitation.expires_at && new Date(invitation.expires_at).getTime() <= Date.now())
      return NextResponse.json({error:'This invitation has expired. Ask your organization administrator for a new one.'},{status:410});

    const organizationId = String(invitation.organization_id || '');
    const { data:organization, error:orgError } = await admin.from('organizations').select('id').eq('id',organizationId).maybeSingle();
    if (orgError) throw orgError;
    if (!organization) return NextResponse.json({error:'The organization linked to this invitation could not be found.'},{status:404});

    const { error:memberError } = await admin.from('organization_members').upsert({
      organization_id:organizationId, user_id:user.id, member_role:invitation.member_role || 'member', status:'active', joined_at:new Date().toISOString(),
    },{onConflict:'organization_id,user_id'});
    if (memberError) throw memberError;
    const { error:profileError } = await admin.from('profiles').update({
      metadata:{ organizationId, isOrganizationAdmin:false }, updated_at:new Date().toISOString(),
    }).eq('id',user.id);
    if (profileError) throw profileError;
    const { error:updateError } = await admin.from('organization_invitations').update({
      status:'accepted', invited_user_id:user.id,
      content:{...(invitation.content || {}),acceptedAt:new Date().toISOString()},
    }).eq('id',inviteId).eq('status','pending');
    if (updateError) throw updateError;
    return NextResponse.json({success:true,organizationId},{headers:{'Cache-Control':'no-store, private'}});
  } catch (error) {
    console.error('Could not accept Supabase organization invitation:',error instanceof Error?error.message:'Unknown error');
    return NextResponse.json({error:'We could not accept this invitation. Please contact your organization administrator.'},{status:503,headers:{'Cache-Control':'no-store, private'}});
  }
}
