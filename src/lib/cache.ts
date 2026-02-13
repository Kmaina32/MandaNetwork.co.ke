import { Redis } from '@upstash/redis'
import { Course } from './types'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export const CACHE_KEYS = {
  courses: 'courses',
  course: (id: string) => `course:${id}`,
  userProgress: (userId: string) => `progress:${userId}`,
}

export async function getCachedCourses(): Promise<Course[]> {
  const cached = await redis.get(CACHE_KEYS.courses)
  if (cached) return cached as Course[]
  return []
}

export async function setCachedCourses(courses: Course[]): Promise<void> {
  await redis.set(CACHE_KEYS.courses, courses, {
    ex: 60 * 60 // Cache for 1 hour
  })
}

export async function invalidateCourseCache(): Promise<void> {
  await redis.del(CACHE_KEYS.courses)
}