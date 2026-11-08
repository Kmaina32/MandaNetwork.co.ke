import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, provider: 'supabase', status: 'not_configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const { error } = await getSupabaseServerClient()
      .from('courses')
      .select('id', { head: true, count: 'exact' });

    if (error) {
      return NextResponse.json(
        { ok: false, provider: 'supabase', status: 'database_unavailable', message: error.message },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { ok: true, provider: 'supabase', status: 'connected' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: 'supabase',
        status: 'connection_error',
        message: error instanceof Error ? error.message : 'Unknown Supabase connection error',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
