import { Course } from '@/lib/types'
import { db } from '@/lib/firebase-admin'

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export interface CourseWithStatus extends Course {
  status: CourseStatus
  publishedAt?: string
  previewToken?: string
}

export async function createPreviewToken(courseId: string): Promise<string> {
  const token = Math.random().toString(36).substring(2, 15)
  await db.ref(`previews/${courseId}`).set({ token })
  return token
}

export async function validatePreviewToken(courseId: string, token: string): Promise<boolean> {
  const preview = await db.ref(`previews/${courseId}`).get()
  return preview.exists() && preview.val().token === token
}

export async function publishCourse(courseId: string): Promise<void> {
  await db.ref(`courses/${courseId}`).update({
    status: CourseStatus.PUBLISHED,
    publishedAt: new Date().toISOString()
  })
}

export async function unpublishCourse(courseId: string): Promise<void> {
  await db.ref(`courses/${courseId}`).update({
    status: CourseStatus.DRAFT,
    publishedAt: null
  })
}

export async function archiveCourse(courseId: string): Promise<void> {
  await db.ref(`courses/${courseId}`).update({
    status: CourseStatus.ARCHIVED
  })
}