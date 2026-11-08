import {
  readSupabaseSession,
  restoreSupabaseSessionFromUrl,
  signInWithSupabase,
  signOutFromSupabase,
  signUpWithSupabase,
  getSupabaseSession,
  sendSupabasePasswordReset,
  updateSupabasePassword,
} from './supabase-auth';

const mockFetch = () => global.fetch as jest.Mock;

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe('Supabase browser authentication helper', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes signup email and requests an email-confirmation redirect', async () => {
    mockFetch().mockResolvedValueOnce(jsonResponse({
      user: { id: 'user-1', email: 'learner@example.com' },
    }));
    await signUpWithSupabase(' Learner@Example.com ', 'StrongPassword1!', 'Learner');
    const [url, options] = mockFetch().mock.calls[0];
    expect(String(url)).toContain('/auth/v1/signup?redirect_to=');
    expect(options.headers.apikey).toBe('test-publishable-key');
    expect(JSON.parse(options.body)).toMatchObject({
      email: 'learner@example.com',
      data: { display_name: 'Learner' },
    });
  });

  it('stores a successful password sign-in session', async () => {
    const session = {
      access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600,
      token_type: 'bearer', user: { id: 'user-1', email: 'learner@example.com' },
    };
    mockFetch().mockResolvedValueOnce(jsonResponse(session));
    await signInWithSupabase(' Learner@Example.com ', 'StrongPassword1!');
    expect(readSupabaseSession()).toMatchObject(session);
    expect(mockFetch().mock.calls[0][0]).toContain('/auth/v1/token?grant_type=password');
  });

  it('refreshes an expired session before returning it', async () => {
    window.localStorage.setItem('varban.supabase.session', JSON.stringify({
      access_token: 'old-access', refresh_token: 'refresh-1', expires_at: 1,
      token_type: 'bearer', user: { id: 'user-1' },
    }));
    mockFetch().mockResolvedValueOnce(jsonResponse({
      access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600,
      token_type: 'bearer', user: { id: 'user-1' },
    }));
    const session = await getSupabaseSession();
    expect(session?.access_token).toBe('new-access');
    expect(JSON.parse(mockFetch().mock.calls[0][1].body)).toEqual({ refresh_token: 'refresh-1' });
  });

  it('clears an expired session when refresh is rejected', async () => {
    window.localStorage.setItem('varban.supabase.session', JSON.stringify({
      access_token: 'old', refresh_token: 'invalid', expires_at: 1,
      token_type: 'bearer', user: { id: 'user-1' },
    }));
    mockFetch().mockResolvedValueOnce(jsonResponse({ message: 'invalid refresh token' }, 400));
    await expect(getSupabaseSession()).resolves.toBeNull();
    expect(readSupabaseSession()).toBeNull();
  });

  it('signs out remotely and clears the local session', async () => {
    window.localStorage.setItem('varban.supabase.session', JSON.stringify({
      access_token: 'access-1', refresh_token: 'refresh-1',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer', user: { id: 'user-1' },
    }));
    mockFetch().mockResolvedValueOnce({ ok: true, status: 204 } as Response);
    await signOutFromSupabase();
    expect(mockFetch().mock.calls[0][0]).toContain('/auth/v1/logout');
    expect(readSupabaseSession()).toBeNull();
  });

  it('sends password reset requests to the reset-password callback', async () => {
    mockFetch().mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    await sendSupabasePasswordReset(' Learner@Example.com ');
    const [url, options] = mockFetch().mock.calls[0];
    expect(String(url)).toContain('/auth/v1/recover?redirect_to=');
    expect(JSON.parse(options.body)).toEqual({ email: 'learner@example.com' });
  });

  it('updates the password using the authenticated access token', async () => {
    window.localStorage.setItem('varban.supabase.session', JSON.stringify({
      access_token: 'access-1', refresh_token: 'refresh-1',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer', user: { id: 'user-1' },
    }));
    mockFetch().mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    await updateSupabasePassword('NewStrongPassword1!');
    expect(mockFetch().mock.calls[0][0]).toContain('/auth/v1/user');
    expect(mockFetch().mock.calls[0][1].headers.Authorization).toBe('Bearer access-1');
    expect(JSON.parse(mockFetch().mock.calls[0][1].body)).toEqual({ password: 'NewStrongPassword1!' });
  });

  it('restores the session from a verified email-link fragment and removes tokens from the URL', async () => {
    window.history.replaceState({}, '', '/auth/confirm#access_token=mail-access&refresh_token=mail-refresh&expires_in=3600');
    mockFetch().mockResolvedValueOnce(jsonResponse({ id: 'user-1', email: 'learner@example.com' }));
    await expect(restoreSupabaseSessionFromUrl()).resolves.toBe(true);
    expect(readSupabaseSession()?.access_token).toBe('mail-access');
    expect(window.location.hash).toBe('');
  });

  it('does not restore an email-link session if Supabase rejects the access token', async () => {
    window.history.replaceState({}, '', '/auth/confirm#access_token=bad&refresh_token=bad');
    mockFetch().mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    await expect(restoreSupabaseSessionFromUrl()).resolves.toBe(false);
    expect(readSupabaseSession()).toBeNull();
  });

  it('fails closed when Supabase public configuration is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(signInWithSupabase('learner@example.com', 'password'))
      .rejects.toThrow('Supabase is not configured');
    expect(mockFetch()).not.toHaveBeenCalled();
  });
});
