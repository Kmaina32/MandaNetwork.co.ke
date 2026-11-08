import { getSupabaseBrowserClient } from './client';

export interface PublicCatalogItem {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at?: string;
  slug?: string | null;
  category?: string | null;
  price?: number;
  image_url?: string | null;
  start_date?: string | null;
  content?: Record<string, unknown>;
}

export async function getPublishedCourses(): Promise<PublicCatalogItem[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from('courses')
    .select('id, slug, title, description, category, price, image_url, content, created_at, updated_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Unable to load published courses from Supabase: ' + error.message);
  return (data ?? []) as PublicCatalogItem[];
}

export async function getPublishedPrograms(): Promise<PublicCatalogItem[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from('programs')
    .select('id, title, description, content, created_at, updated_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Unable to load published programs from Supabase: ' + error.message);
  return (data ?? []) as PublicCatalogItem[];
}

export async function getPublishedBootcamps(): Promise<PublicCatalogItem[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from('bootcamps')
    .select('id, title, descripֻǱ˞