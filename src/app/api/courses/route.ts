import { NextResponse, NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function getUserIdFromApiKey(apiKey: string): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const incomingHash = createHash('sha256').update(apiKey).digest();
  const { data, error } = await admin.from('user_api_keys')
    .select('user_id,key_hash').is('revoked_at',null).limit(5000);
  if (error) throw error;
  for (const stored of data || []) {
    if (typeof stored.key_hash !== 'string' || !/^[a-f0-9]{64}$/i.test(stored.key_hash)) continue;
    const savedHash = Buffer.from(stored.key_hash,'hex');
    if (savedHash.length === incomingHash.length && timingSafeEqual(savedHash,incomingHash)) return stored.user_id;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ message: 'Unauthorized: Missing API Key' }, { status: 401 });
  const apiKey = authHeader.slice('Bearer '.length).trim();
  if (!/^sk_live_[a-f0-9]{48}$/i.test(apiKey)) return NextResponse.json({ message: 'Unauthorized: Invalid API Key' }, { status: 401 });

  try {
    const admin = getSupabaseAdminClient();
    const userId = await getUserIdFromApiKey(apiKey);
    if (!userId) return NextResponse.json({ message: 'Unauthorized: Invalid API Key' }, { status: 401 });

    const { data: allowed, error: rateError } = await admin.rpc('consume_api_rate_limit', {
      p_user_id: userId, p_usage_date: new Date().toISOString().slice(0,10),
    });
    if (rateError) throw rateError;
    if (!allowed) return NextResponse.json({ message: 'Daily API rate limit reached.' }, { status: 429 });

    const { error: usageError } = await admin.from('api_usage').insert({ user_id: userId, endpoint: '/api/courses' });
    if (usageError) throw usageError;
    const { data: courses, error: coursesError } = await admin.from('courses')
      .select('id,title,description,category,price,image_url,is_published,created_at')
      .eq('is_published',true).order('created_at',{ascending:false});
    if (coursesError) throw coursesError;
    return NextResponse.json((courses || []).map(row => ({
      id: row.id, title: row.title, description: row.description || '',
      category: row.category || '', price: Number(row.price || 0),
      imageUrl: row.image_url || '', isPublished: row.is_published, createdAt: row.created_at,
    })), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Supabase API courses error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
