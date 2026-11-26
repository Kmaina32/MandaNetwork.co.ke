import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { GET } from './route';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({ getSupabaseAdminClient: jest.fn() }));

const mockAdmin = getSupabaseAdminClient as jest.Mock;
const validKey = `sk_live_${'a'.repeat(48)}`;

function request(key?: string) {
  return new NextRequest('http://localhost/api/courses', {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  });
}

describe('GET /api/courses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing API key before initializing privileged database access', async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('rejects malformed API keys before initializing privileged database access', async () => {
    const response = await GET(request('sk_live_not-a-real-key'));
    expect(response.status).toBe(401);
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('hashes the API key for server-side validation and returns published courses only', async () => {
    const rows = [{
      id: 'course-1', title: 'Secure APIs', description: null, category: null,
      price: '1200', image_url: 'https://cdn.example/course.png', is_published: true,
      created_at: '2026-01-01T00:00:00.000Z',
    }];
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: rows, error: null }),
    };
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const from = jest.fn().mockReturnValue(query);
    mockAdmin.mockReturnValue({ rpc, from });

    const response = await GET(request(validKey));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('validate_api_key_and_consume', {
      p_key_hash: createHash('sha256').update(validKey).digest('hex'),
    });
    expect(from).toHaveBeenCalledWith('courses');
    expect(query.eq).toHaveBeenCalledWith('is_published', true);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual([{
      id: 'course-1', title: 'Secure APIs', description: '', category: '',
      price: 1200, imageUrl: 'https://cdn.example/course.png', isPublished: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    }]);
  });

  it('rejects API keys that fail server-side validation or rate limits', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: false, error: null });
    mockAdmin.mockReturnValue({ rpc });
    const response = await GET(request(validKey));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: 'Invalid API key or daily rate limit reached.',
    });
  });

  it('returns a generic server error when key validation fails unexpectedly', async () => {
    mockAdmin.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: new Error('private database detail') }),
    });
    const response = await GET(request(validKey));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ message: 'Internal Server Error' });
  });
});
