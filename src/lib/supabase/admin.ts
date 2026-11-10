import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

let adminClient: SupabaseClient | undefined;

/** Service-role client for trusted server workflows only. Never import into client components. */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    const { url } = getSupabaseConfig();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) throw new Error('Supabase server operations are not configured.');
    adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}
