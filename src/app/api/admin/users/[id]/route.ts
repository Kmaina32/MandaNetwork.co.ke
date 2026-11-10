import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

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
    if(user.id===id)return NextResponse.json({error:'You cannot delete your own active account.'},{status:409});

    const {data:isAdmin,error:roleError}=await supabase.rpc('has_role',{
      check_user_id:user.id,allowed_roles:['admin','super_admin'],
    });
    if(roleError)throw roleError;
    if(!isAdmin)return NextResponse.json({error:'Administrator access is required.'},{status:403});
    const {data:isSuperAdmin,error:superRoleError}=await supabase.rpc('has_role',{
      check_user_id:user.id,allowed_roles:['super_admin'],
    });
    if(superRoleError)throw superRoleError;

    const admin=getSupabaseAdminClient();
    const {data:targetRoles,error:targetRoleError}=await admin.from('user_roles')
      .select('role').eq('user_id',id);
    if(targetRoleError)throw targetRoleError;
    if((targetRoles||[]).some((row:any)=>row.role==='super_admin')&&!isSuperAdmin) {
      return NextResponse.json({error:'Only a super administrator can delete another super administrator.'},{status:403});
    }
    const {data:target,error:targetError}=await admin.auth.admin.getUserById(id);
    if(targetError)throw targetError;
    if(!target.user)return NextResponse.json({error:'Account not found.'},{status:404});
    const {error:deleteError}=await admin.auth.admin.deleteUser(id);
    if(deleteError)throw deleteError;
    return NextResponse.json({success:true},{headers:{'Cache-Control':'no-store, private'}});
  } catch(error) {
    console.error('Supabase account deletion failed:',error instanceof Error?error.message:'Unknown error');
    return NextResponse.json({error:'The account could not be deleted.'},{status:500});
  }
}
