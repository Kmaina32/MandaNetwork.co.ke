import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

/** Verify a Supabase access token and return the authoritative Supabase user. */
export async function verifySupabaseAccessToken(accessToken: string) {
  if (!accessToken || accessToken.length > 16_384) throw new Error('A valid sign-in session is required.');
  const { url, publishableKey } = getSupabaseConfig();
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new Error('Your sign-in session has expired. Please sign in again.');
  return data.user;
}
