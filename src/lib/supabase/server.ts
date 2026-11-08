import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

/**
 * Server-side public client. Privileged writes must use a separately
 * authenticated server route and must never expose a Supabase secret key.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const { url, publishableKey } = getSupabaseConfig();

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
