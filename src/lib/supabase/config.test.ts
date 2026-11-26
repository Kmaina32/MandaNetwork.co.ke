describe('Supabase public configuration', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    jest.resetModules();
  });

  it('returns the configured URL and publishable key', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unit_test';
    jest.resetModules();
    const config = await import('./config');
    expect(config.isSupabaseConfigured()).toBe(true);
    expect(config.getSupabaseConfig()).toEqual({
      url: 'https://project.supabase.co',
      publishableKey: 'sb_publishable_unit_test',
    });
  });

  it('reports missing configuration without exposing or inventing credentials', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    jest.resetModules();
    const config = await import('./config');
    expect(config.isSupabaseConfigured()).toBe(false);
    expect(() => config.getSupabaseConfig()).toThrow(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  });
});
