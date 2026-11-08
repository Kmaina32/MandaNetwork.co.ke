import { getSupabaseBrowserClient } from './client';

export type PublicCatalogTable = 'courses' | 'programs' | 'bootcamps' | 'blog_posts';

export async function getPublishedItems(table: PublicCatalogTable) {
  const { data, error } = await getSupabaseBrowserClient()
    .from(table)
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Supabase catalog request failed: ' + error.message);
  return data ?? [];
}

export const getPublishedCourses = () => getPublishedItems('courses');
export const getPublishedPrograms = () => getPublishedItems('programs');
export const getPublishedBootcamps = () => getPublishedItems('bootcamps');
export const getPublishedBlogPosts = () => getPublishedItems('blog_posts');
