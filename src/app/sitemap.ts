
import type { MetadataRoute } from 'next';
import { getAllCourses, getAllPrograms, getAllBootcamps, getPublicProfiles, getAllBlogPosts } from '@/lib/firebase-server';
import { slugify } from '@/lib/utils';

const BASE_URL = 'https://www.mandanetwork.co.ke';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch dynamic data using server-side functions
  const [courses, programs, bootcamps, portfolios, blogPosts] = await Promise.all([
    getAllCourses(),
    getAllPrograms(),
    getAllBootcamps(),
    getPublicProfiles(),
    getAllBlogPosts()
  ]);

  const courseEntries: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${BASE_URL}/courses/${slugify(course.title)}`,
    lastModified: course.createdAt ? new Date(course.createdAt) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  
  const programEntries: MetadataRoute.Sitemap = programs.map((program) => ({
    url: `${BASE_URL}/programs/${program.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const bootcampEntries: MetadataRoute.Sitemap = bootcamps.map((bootcamp) => ({
    url: `${BASE_URL}/bootcamps/${bootcamp.id}`,
    lastModified: new Date(bootcamp.startDate),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const portfolioEntries: MetadataRoute.Sitemap = portfolios.map((portfolio) => ({
    url: `${BASE_URL}/portfolio/${portfolio.uid}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }));
  
  const blogPostEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Define static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/programs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/bootcamps`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/portal/hackathons`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/portfolios`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/for-business`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/dashboard/affiliate`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  return [
    ...staticRoutes,
    ...courseEntries,
    ...programEntries,
    ...bootcampEntries,
    ...portfolioEntries,
    ...blogPostEntries,
  ];
}
