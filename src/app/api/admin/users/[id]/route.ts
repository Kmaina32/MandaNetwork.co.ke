import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  try {
    const origin=request.headers.get('origin');
    if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
    const {id}=await params;
    if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Invalid account identifier.'},{status:400});
    const supabase=await getSupabaseServerClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)return NextResponse.json({error:'Sign in is required.'},{status:401});
    const {data,error}=await supabase.rpc('delete_user_account',{p_user_id:id});
    if(error) {
      const message=error.message||'Account deletion failed.';
      const status=/administrator|super administrator/i.test(message)?403:/own active account/i.test(message)?409:400;
      return NextResponse.json({error:message},{status});
    }
    if(!data)return NextResponse.json({error:'Account not found.'},{status:404});
    return NextResponse.json({success:true},{headers:{'Cache-Control':'no-store, private'}});
  } catch(error) {
    console.error('Supabase account deletion failed:',error instanceof Error?error.message:'Unknown error');
    return NextResponse.json({error:'The account could not be deleted.'},{status:500});
  }
}
