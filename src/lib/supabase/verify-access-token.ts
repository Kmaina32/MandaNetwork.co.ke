import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { adminAuth } from '@/lib/firebase-admin';
import { getSupabaseConfig } from './config';

/**
 * Verify a Supabase access token with Supabase Auth, then resolve the matching
 * legacy Firebase UID by verified email. This lets server actions continue to
 * access existing Firebase records without trusting a caller-supplied UID.
 */
export async function verifySupabaseAccessToken(accessToken: string) {
  if (!accessToken || accessToken.length > 16_384) {
    throw new Error('A valid sign-in session is required.');
  }

  const { url, publishableKey } = getSupabaseConfig();
  const client = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error('Your sign-in session has expired. Please sign in again.');
  }

  let legacyUid = data.user.id;
  if (data.user.email) {
    try {
      let firebaseUser = await adminAuth.getUserByEmail(data.user.email);
      if (firebaseUser.disabled) throw new Error('This account is disabled. Contact support.');
      if (!firebaseUser.emailVerified) {
        firebaseUser = await adminAuth.updateUser(firebaseUser.uid, { emailVerified: true });
      }
      legacyUid = firebaseUser.uid;
    } catch (lookupError) {
      const code = (lookupError as { code?: string })?.code;
      if (code !== 'auth/user-not-found') throw lookupError;
    }
  }

  return { ...data.user, legacyUid };
}
