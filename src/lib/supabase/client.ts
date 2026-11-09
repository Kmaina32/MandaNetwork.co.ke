'use client';

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

let browserClient: SupabaseClient | undefined;

/** Shared browser client. Auth sessions are persisted in cookies for SSR compatibility. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseConfig();
    browserClient = createBrowserClient(url, publishableKey);
  }
  return browserClient;
}
