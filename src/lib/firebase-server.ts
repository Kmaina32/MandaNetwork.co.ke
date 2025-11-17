
// This file is for SERVER-SIDE use only. Do not use 'use client' here.
import { adminDb } from './firebase-admin';
import type { Course, Program, Bootcamp, RegisteredUser, BlogPost } from './types';
import { slugify } from './utils';

// Re-implementing necessary data fetching functions for server-side rendering
// These functions use the Firebase Admin SDK.

export async function getAllCourses(): Promise<Course[]> {
  const dbRef = adminDb.ref('courses');
  const snapshot = await dbRef.once('value');
  if (snapshot.exists()) {
    const coursesData = snapshot.val();
    const courses = Object.keys(coursesData).map(key => ({
      id: key,
      ...coursesData[key]
    }));
    return courses.reverse();
  }
  return [];
}

export async function getAllPrograms(): Promise<Program[]> {
    const dbRef = adminDb.ref('programs');
    const snapshot = await dbRef.once('value');
    if (snapshot.exists()) {
        const programsData = snapshot.val();
        return Object.keys(programsData).map(key => ({
            id: key,
            ...programsData[key]
        }));
    }
    return [];
}

export async function getAllBootcamps(): Promise<Bootcamp[]> {
    const dbRef = adminDb.ref('bootcamps');
    const snapshot = await dbRef.once('value');
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return [];
}

export async function getPublicProfiles(): Promise<RegisteredUser[]> {
  const dbRef = adminDb.ref('users');
  const snapshot = await dbRef.orderByChild('portfolio/public').equalTo(true).once('value');
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(uid => ({
      uid,
      ...data[uid],
    }));
  }
  return [];
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
    const dbRef = adminDb.ref('blog');
    const snapshot = await dbRef.orderByChild('createdAt').once('value');
    if (snapshot.exists()) {
        const postsData = snapshot.val();
        const posts = Object.keys(postsData).map(key => ({
            id: key,
            ...postsData[key]
        }));
        return posts.reverse();
    }
    return [];
}
