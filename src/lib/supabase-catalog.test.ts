import { getPublishedBootcamps, getPublishedBlogPosts, getPublishedCourses, getPublishedPrograms } from './supabase/catalog';
import { getSupabaseBrowserClient } from './supabase/client';

jest.mock('./supabase/client', () => ({ getSupabaseBrowserClient: jest.fn() }));
const mockedClient = getSupabaseBrowserClient as jest.Mock;

function makeQuery(data: unknown, error: { message: string } | null = null) {
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data, error }) };
  const from = jest.fn().mockReturnValue(query);
  mockedClient.mockReturnValue({ from });
  return { from, query };
}

describe('published Supabase catalog queries', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([['courses', getPublishedCourses], ['programs', getPublishedPrograms], ['bootcamps', getPublishedBootcamps], ['blog_posts', getPublishedBlogPosts]] as const)('only requests published %s in newest-first order', async (table, load) => {
    const rows = [{ id: 'published-1' }];
    const { from, query } = makeQuery(rows);
    await expect(load()).resolves.toEqual(rows);
    expect(from).toHaveBeenCalledWith(table);
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.eq).toHaveBeenCalledWith('is_published', true);
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns an empty list when the catalog query has no rows', async () => {
    makeQuery(null);
    await expect(getPublishedCourses()).resolves.toEqual([]);
  });

  it('surfaces catalog errors instead of silently treating them as empty data', async () => {
    makeQuery(null, { message: 'permission denied' });
    await expect(getPublishedCourses()).rejects.toThrow('permission denied');
  });
});
