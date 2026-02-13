import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCachedCourses } from '@/lib/cache'
import { CourseContent } from '@/components/CourseContent'
import { generateSocialImage } from '@/lib/utils'

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const courses = await getCachedCourses()
  const course = courses.find(c => c.slug === params.slug)
  
  if (!course) return {}

  const ogImage = generateSocialImage({
    title: course.title,
    tagline: course.description
  })

  return {
    title: course.title,
    description: course.description,
    openGraph: {
      title: course.title,
      description: course.description,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: course.title,
      description: course.description,
      images: [ogImage],
    }
  }
}

export default async function CoursePage({ params }: Props) {
  const courses = await getCachedCourses()
  const course = courses.find(c => c.slug === params.slug)

  if (!course) notFound()

  return <CourseContent course={course} />
}