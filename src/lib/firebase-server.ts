// Server-side public academy reads use Supabase only.
import { createClient } from '@supabase/supabase-js';
import { unstable_cache as cache } from 'next/cache';
import type { Course, Program, Bootcamp, RegisteredUser, BlogPost, HeroData } from './types';
import { getSupabaseConfig } from './supabase/config';

const revalidate = 300;
const { url, publishableKey } = getSupabaseConfig();
const supabase = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function readRecords<T>(collection: string): Promise<T[]> {
  const { data, error } = await supabase.from('academy_records').select('record_id,data')
    .eq('collection', collection).order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.record_id, ...(row.data || {}) })) as T[];
}

const defaultHero: HeroData = {
  title: 'Unlock Your Potential.', subtitle: 'Quality, affordable courses designed for the Kenyan market.',
  imageUrl: 'https://images.unsplash.com/photo-1768055105681-7d2096c5165f?auto=format&fit=crop&w=1800&q=85', loginImageUrl: 'https://images.unsplash.com/photo-1748439435495-722cc1728b7e?auto=format&fit=crop&w=1600&q=85',
  signupImageUrl: 'https://images.unsplash.com/photo-1769794371055-54436b54577e?auto=format&fit=crop&w=1600&q=85', programsImageUrl: 'https://images.unsplash.com/photo-1758873269035-aae0e1fd3422?auto=format&fit=crop&w=1800&q=85',
  bootcampsImageUrl: 'https://images.unsplash.com/photo-1758873269035-aae0e1fd3422?auto=format&fit=crop&w=1800&q=85', hackathonsImageUrl: 'https://images.unsplash.com/photo-1758873269035-aae0e1fd3422?auto=format&fit=crop&w=1800&q=85',
  portfoliosImageUrl: 'https://images.unsplash.com/photo-1758873269035-aae0e1fd3422?auto=format&fit=crop&w=1800&q=85', slideshowSpeed: 5, imageBrightness: 60,
  recaptchaEnabled: true, onboardingEnabled: true, theme: 'default', animationsEnabled: true,
  orgHeroTitle: 'Varban Academy for Business', orgHeroSubtitle: 'Empower your workforce with the skills they need to succeed.',
  orgHeroImageUrl: 'https://images.unsplash.com/photo-1758518731706-be5d5230e5a5?auto=format&fit=crop&w=1800&q=85', orgLoginImageUrl: 'https://images.unsplash.com/photo-1758518730151-cf64fddb4f0a?auto=format&fit=crop&w=1800&q=85',
  orgSignupImageUrl: 'https://images.unsplash.com/photo-1758873269035-aae0e1fd3422?auto=format&fit=crop&w=1800&q=85', adsEnabled: false, adInterval: 30,
  activityTrackingEnabled: false, aiProvider: 'gemini', customModelId: '',
};

export const getHeroData = cache(async (): Promise<HeroData> => {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key','hero').maybeSingle();
  if (error) throw error;
  const resolved = { ...defaultHero, ...(data?.value || {}) } as HeroData;
  const imageKeys = ['imageUrl', 'loginImageUrl', 'signupImageUrl', 'programsImageUrl', 'bootcampsImageUrl', 'hackathonsImageUrl', 'portfoliosImageUrl', 'orgHeroImageUrl', 'orgLoginImageUrl', 'orgSignupImageUrl'] as const;
  for (const key of imageKeys) {
    const value = resolved[key];
    if (typeof value !== 'string' || !value.trim() || /picsum\.photos|placehold\.co/i.test(value)) {
      resolved[key] = defaultHero[key] || defaultHero.imageUrl;
    }
  }
  return resolved;
}, ['supabase-hero-data'], { revalidate });

export const getAllCourses = cache(async (): Promise<Course[]> => {
  const { data, error } = await supabase.from('courses').select('*').eq('is_published',true).order('created_at',{ascending:false});
  if (error) throw error;
  return (data || []).map((row: any) => ({ ...(row.content || {}), id: row.id, title: row.title,
    description: row.description || '', category: row.category || '', price: Number(row.price || 0),
    imageUrl: row.image_url || '', isPublished: Boolean(row.is_published), createdAt: row.created_at,
  })) as Course[];
}, ['supabase-all-courses'], { revalidate });

export const getAllPrograms = cache(() => readRecords<Program>('programs'), ['supabase-all-programs'], { revalidate });
export const getAllBootcamps = cache(() => readRecords<Bootcamp>('bootcamps'), ['supabase-all-bootcamps'], { revalidate });
export const getPublicProfiles = cache(() => readRecords<RegisteredUser>('publicProfiles'), ['supabase-public-profiles'], { revalidate });
export const getAllBlogPosts = cache(() => readRecords<BlogPost>('blog'), ['supabase-all-blog-posts'], { revalidate });
export const getAllAdvertisements = cache(() => readRecords<import('./types').Advertisement>('advertisements'), ['supabase-all-advertisements'], { revalidate });
