import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request:NextRequest) {
  try {
    const origin=request.headers.get('origin');
    if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
    const supabase=await getSupabaseServerClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user?.email)return NextResponse.json({error:'Please sign in with your invited email address.'},{status:401});
    const body=await request.json().catch(()=>({}));
    const inviteId=typeof body.inviteId==='string'?body.inviteId.trim():'';
    if(!/^[0-9a-f-]{36}$/i.test(inviteId))return NextResponse.json({error:'Invalid invitation link.'},{status:400});
    const {data:organizationId,error}=await supabase.rpc('accept_organization_invitation',{p_invite_id:inviteId});
    if(error) {
      const message=error.message||'Invitation could not be accepted.';
      const status=/expired/i.test(message)?410:/not found/i.test(message)?404:/email|pending|used/i.test(message)?409:403;
      return NextResponse.json({error:message},{status});
    }
    return NextResponse.json({success:true,organizationId},{headers:{'Cache-Control':'no-store, private'}});
  } catch(error) {
    console.error('Supabase invitation acceptance failed:',error instanceof Error?error.message:'Unknown error');
    return NextResponse.json({error:'We could not accept this invitation. Please contact your organization administrator.'},{status:503,headers:{'Cache-Control':'no-store, private'}});
  }
}
