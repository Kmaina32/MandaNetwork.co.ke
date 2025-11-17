
// This file is for SERVER-SIDE use only. Do not use 'use client' here.
import { adminDb } from './firebase-admin';
import type { Course, Program, Bootcamp, RegisteredUser, BlogPost, HeroData } from './types';
import { slugify } from './utils';

// Re-implementing necessary data fetching functions for server-side rendering
// These functions use the Firebase Admin SDK.

export async function getHeroData(): Promise<HeroData> {
  const dbRef = adminDb.ref('hero');
  const snapshot = await dbRef.once('value');
  const defaults = {
    title: 'Unlock Your Potential.', 
    subtitle: 'Quality, affordable courses designed for the Kenyan market.',
    imageUrl: 'https://placehold.co/1200x400.png',
    loginImageUrl: 'https://placehold.co/1200x900.png',
    signupImageUrl: 'https://placehold.co/1200x900.png',
    programsImageUrl: 'https://picsum.photos/1200/400',
    bootcampsImageUrl: 'https://picsum.photos/1200/400',
    hackathonsImageUrl: 'https://picsum.photos/1200/400',
    portfoliosImageUrl: 'https://picsum.photos/1200/400',
    slideshowSpeed: 5,
    imageBrightness: 60,
    recaptchaEnabled: true,
    onboardingEnabled: true,
    theme: 'default',
    animationsEnabled: true,
    orgHeroTitle: 'Manda Network for Business',
    orgHeroSubtitle: 'Empower your workforce with the skills they need to succeed.',
    orgHeroImageUrl: 'https://picsum.photos/1200/800',
    orgLoginImageUrl: 'https://picsum.photos/1200/900',
    orgSignupImageUrl: 'https://picsum.photos/1200/900',
    adsEnabled: false,
    adInterval: 30,
    activityTrackingEnabled: false,
    aiProvider: 'gemini' as const,
    customModelId: '',
  };

  const dbData = snapshot.exists() ? snapshot.val() : {};
  
  return { ...defaults, ...dbData };
}

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
  const dbRef = adminDb.ref('publicProfiles');
  const snapshot = await dbRef.once('value');
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
