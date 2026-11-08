/**
 * Lightweight browser-side Supabase Auth client.
 * Uses Supabase's documented Auth HTTP endpoints so no extra runtime
 * dependency is required. Firebase remains the legacy identity provider
 * until existing accounts are migrated deliberately.
 */
export type SupabaseUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type: string;
  user: SupabaseUser;
};

const SESSION_KEY = 'varban.supabase.session';
const AUTH_EVENT = 'varban:supabase-auth';

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured. Check the public Supabase environment variables.');
  return { url: url.replace(/\/$/, ''), key };
}

function saveSession(session: SupabaseSession | null) {
  if (typeof window === 'undefined') return;
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify({
    ...session,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
  }));
  else window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function readSupabaseSession(): SupabaseSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as SupabaseSession : null;
  } catch {
    return null;
  }
}

async function authRequest<T>(path: string, body?: unknown, accessToken?: string): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || payload.error || 'Supabase authentication failed.');
  return payload as T;
}

export async function signUpWithSupabase(email: string, password: string, displayName: string) {
  const redirectTo = typeof window !== 'undefined' ? window.location.origin + '/auth/confirm' : undefined;
  const result = await authRequest<{ user: SupabaseUser; access_token?: string; refresh_token?: string; expires_in?: number }>(
    redirectTo ? 'signup?redirect_to=' + encodeURIComponent(redirectTo) : 'signup', {
    email: email.trim().toLowerCase(),
    password,
    data: { display_name: displayName.trim() },
  });
  if (result.access_token && result.refresh_token) {
    saveSession({ ...result, token_type: 'bearer', user: result.user } as SupabaseSession);
  }
  return result;
}

export async function signInWithSupabase(email: string, password: string) {
  const result = await authRequest<SupabaseSession>('token?grant_type=password', {
    email: email.trim().toLowerCase(),
    password,
  });
  saveSession(result);
  return result;
}

export async function getSupabaseSession(): Promise<SupabaseSession | null> {
  const session = readSupabaseSession();
  if (!session) return null;
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt > Math.floor(Date.now() / 1000) + 60) return session;
  try {
    const refreshed = await authRequest<SupabaseSession>('token?grant_type=refresh_token', {
      refresh_token: session.refresh_token,
    });
    saveSession(refreshed);
    return refreshed;
  } catch {
    saveSession(null);
    return null;
  }
}

export async function signOutFromSupabase() {
  const session = await getSupabaseSession();
  if (session) {
    const { url, key } = config();
    await fetch(`${url}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${session.access_token}` },
    });
  }
  saveSession(null);
}

export async function sendSupabasePasswordReset(email: string) {
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(window.location.origin + '/auth/reset-password')}`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.msg || payload.message || 'Could not send the password reset email.');
  }
}

export async function updateSupabasePassword(password: string) {
  const session = await getSupabaseSession();
  if (!session) throw new Error('Your password reset session has expired. Request a new reset email.');
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error('Could not update the password. Please request a new reset email.');
}


/** Restore the short-lived access token delivered in Supabase email-link URL fragments. */
export async function restoreSupabaseSessionFromUrl(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.location.hash) return false;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return false;
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return false;
  const user = await response.json() as SupabaseUser;
  saveSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: params.get('token_type') || 'bearer',
    expires_in: Number(params.get('expires_in') || 3600),
    expires_at: Number(params.get('expires_at') || Math.floor(Date.now() / 1000) + Number(params.get('expires_in') || 3600)),
    user,
  });
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return true;
}

export function subscribeToSupabaseAuth(callback: (session: SupabaseSession | null) => void) {
  if (typeof window === 'undefined') return () => {};
  const listener = () => callback(readSupabaseSession());
  window.addEventListener(AUTH_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(AUTH_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
