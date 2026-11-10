import { NextResponse, NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase/config';

export const runtime='nodejs';
const {url,publishableKey}=getSupabaseConfig();
const supabase=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

export async function GET(req:NextRequest) {
  const authHeader=req.headers.get('Authorization');
  if(!authHeader?.startsWith('Bearer '))return NextResponse.json({message:'Unauthorized: Missing API Key'},{status:401});
  const apiKey=authHeader.slice(7).trim();
  if(!/^sk_live_[a-f0-9]{48}$/i.test(apiKey))return NextResponse.json({message:'Unauthorized: Invalid API Key'},{status:401});
  try {
    const keyHash=createHash('sha256').update(apiKey).digest('hex');
    const {data:userId,error:verifyError}=await supabase.rpc('validate_api_key_and_consume',{p_key_hash:keyHash});
    if(verifyError)throw verifyError;
    if(!userId)return NextResponse.json({message:'Invalid API key or daily rate limit reached.'},{status:401});
    const {data:courses,error:coursesError}=await supabase.from('courses')
      .select('id,title,description,category,price,image_url,is_published,created_at')
      .eq('is_published',true).order('created_at',{ascending:false});
    if(coursesError)throw coursesError;
    return NextResponse.json((courses||[]).map(row=>({
      id:row.id,title:row.title,description:row.description||'',category:row.category||'',
      price:Number(row.price||0),imageUrl:row.image_url||'',isPublished:row.is_published,createdAt:row.created_at,
    })),{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {
    console.error('Supabase API courses request failed:',error instanceof Error?error.message:'Unknown error');
    return NextResponse.json({message:'Internal Server Error'},{status:500});
  }
}
