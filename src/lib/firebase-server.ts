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
  imageUrl: 'https://placehold.co/1200x400.png', loginImageUrl: 'https://placehold.co/1200x900.png',
  signupImageUrl: 'https://placehold.co/1200x900.png', programsImageUrl: 'https://picsum.photos/1200/400',
  bootcampsImageUrl: 'https://picsum.photos/1200/400', hackathonsImageUrl: 'https://picsum.photos/1200/400',
  portfoliosImageUrl: 'https://picsum.photos/1200/400', slideshowSpeed: 5, imageBrightness: 60,
  recaptchaEnabled: true, onboardingEnabled: true, theme: 'default', animationsEnabled: true,
  orgHeroTitle: 'Varban Academy for Business', orgHeroSubtitle: 'Empower your workforce with the skills they need to succeed.',
  orgHeroImageUrl: 'https://picsum.photos/1200/800', orgLoginImageUrl: 'https://picsum.photos/1200/900',
  orgSignupImageUrl: 'https://picsum.photos/1200/900', adsEnabled: false, adInterval: 30,
  activityTrackingEnabled: false, aiProvider: 'gemini', customModelId: '',
};

export const getHeroData = cache(async (): Promise<HeroData> => {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key','hero').maybeSingle();
  if (error) throw error;
  return { ...defaultHero, ...(data?.value || {}) } as HeroData;
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
