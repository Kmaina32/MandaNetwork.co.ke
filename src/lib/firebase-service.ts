'use client';

import { db } from './firebase';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo, increment, limitToLast } from 'firebase/database';
import type { Assignment, TutorSettings, Course, UserCourse, CalendarEvent, Submission, TutorMessage, Notification, DiscussionThread, DiscussionReply, LiveSession, Program, Bundle, ApiKey, PortfolioProject as Project, LearningGoal, CourseFeedback, Portfolio, PermissionRequest, Organization, Invitation, RegisteredUser, Hackathon, HackathonSubmission, LeaderboardEntry, PricingPlan, Advertisement, UserActivity, TeamMember, ContactMessage, Form as FormType, FormSubmission, Referral, Bootcamp, BlogPost, HeroData } from './types';
import { getRemoteConfig, fetchAndActivate, getString } from 'firebase/remote-config';
import { app } from './firebase';
import { slugify } from './utils';
import { getSupabaseBrowserClient } from './supabase/client';
import { uploadAcademyAsset } from './supabase/storage';

export type { Assignment, Course, UserCourse, CalendarEvent, Submission, TutorMessage, Notification, DiscussionThread, DiscussionReply, LiveSession, Program, Bundle, ApiKey, PortfolioProject, LearningGoal, CourseFeedback, Portfolio, PermissionRequest, Organization, Invitation, RegisteredUser, Hackathon, HackathonSubmission, LeaderboardEntry, PricingPlan, Advertisement, UserActivity, TeamMember, ContactMessage, Form, FormSubmission, Referral, Bootcamp, BlogPost, HeroData, TutorSettings } from './types';




export interface CertificateSettings {
    academicDirector: string;
}

// Image Upload Service
export async function uploadImage(path: string, file: File): Promise<string> {
    const folder = path.split('/').filter(Boolean).slice(0, 2).join('-') || 'images';
    return uploadAcademyAsset(file, folder);
}

// Course Functions — Supabase is the source of truth.
export async function getAllCourses(): Promise<Course[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...(row.content || {}), id: row.id, title: row.title, description: row.description || '',
    category: row.category || '', price: Number(row.price || 0), imageUrl: row.image_url || '',
    isPublished: Boolean(row.is_published), createdAt: row.created_at, updatedAt: row.updated_at,
  })) as Course[];
}

export async function getCourseById(id: string): Promise<Course | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...(data.content || {}), id: data.id, title: data.title, description: data.description || '',
    category: data.category || '', price: Number(data.price || 0), imageUrl: data.image_url || '',
    isPublished: Boolean(data.is_published), createdAt: data.created_at, updatedAt: data.updated_at } as Course;
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const allCourses = await getAllCourses();
  return allCourses.find(course => slugify(course.title) === slug || (course as any).slug === slug) || null;
}

export async function createCourse(courseData: Omit<Course, 'id' | 'createdAt'>): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { title, description, category, price, imageUrl, isPublished, ...content } = courseData as any;
  const { data, error } = await supabase.from('courses').insert({
    title, description: description || null, category: category || null, price: Number(price || 0),
    image_url: imageUrl || null, is_published: Boolean(isPublished), content,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function updateCourse(courseId: string, courseData: Partial<Course>): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { title, description, category, price, imageUrl, isPublished, ...contentUpdate } = courseData as any;
  const { data: current, error: readError } = await supabase.from('courses').select('content').eq('id', courseId).maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error('Course not found.');
  const patch: Record<string, unknown> = { content: { ...(current.content || {}), ...Object.fromEntries(Object.entries(contentUpdate).filter(([,v]) => v !== undefined)) }, updated_at: new Date().toISOString() };
  if (title !== undefined) patch.title = title;
  if (description !== undefined) patch.description = description;
  if (category !== undefined) patch.category = category;
  if (price !== undefined) patch.price = price;
  if (imageUrl !== undefined) patch.image_url = imageUrl;
  if (isPublished !== undefined) patch.is_published = isPublished;
  const { error } = await supabase.from('courses').update(patch).eq('id', courseId);
  if (error) throw error;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) throw error;
}

// User Functions
export async function saveUser(uid: string, dataToSave: Partial<Omit<RegisteredUser, 'uid'>>): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('A signed-in account is required.');
  const isSelf = authData.user.id === uid;
  if (!isSelf) {
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      check_user_id: authData.user.id, allowed_roles: ['admin', 'super_admin'],
    });
    if (roleError || !isAdmin) throw new Error('You are not allowed to update this profile.');
  }
  const { displayName, photoURL, email, ...metadata } = dataToSave as any;
  const { data: current, error: readError } = await supabase.from('profiles').select('metadata').eq('id', uid).maybeSingle();
  if (readError) throw readError;
  const safeMetadata = { ...(current?.metadata || {}) };
  for (const [key, value] of Object.entries(metadata)) {
    if (!['isAdmin','isSuperAdmin','role','roles','isOrganizationAdmin'].includes(key) && value !== undefined) safeMetadata[key] = value;
  }
  const patch: Record<string, unknown> = { metadata: safeMetadata, updated_at: new Date().toISOString() };
  if (displayName !== undefined) patch.display_name = displayName;
  if (photoURL !== undefined) patch.avatar_path = photoURL;
  if (email !== undefined && isSelf) patch.email = email;
  if (current) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', uid);
    if (error) throw error;
  } else {
    if (!isSelf) throw new Error('The requested profile does not exist.');
    const { error } = await supabase.from('profiles').insert({ id: uid, ...patch });
    if (error) throw error;
  }
}
export async function getUserById(uid: string): Promise<RegisteredUser | null> {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        return { uid, ...snapshot.val() };
    }
    return null;
}

// Public portfolio reads use a separate, intentionally limited record.
// Never fetch the private users/{uid} node for anonymous portfolio visitors.
export async function getPublicProfileById(uid: string): Promise<RegisteredUser | null> {
    const profileRef = ref(db, `publicProfiles/${uid}`);
    const snapshot = await get(profileRef);
    if (!snapshot.exists()) return null;
    return { uid, ...snapshot.val() } as RegisteredUser;
}

export async function getUserByEmail(email: string): Promise<RegisteredUser | null> {
    const directoryRef = query(ref(db, 'userDirectory'), orderByChild('email'), equalTo(email.trim()));
    const snapshot = await get(directoryRef);
    if (snapshot.exists()) {
        const records = snapshot.val();
        const uid = Object.keys(records)[0];
        const record = records[uid];
        return { uid, email: record.email || null, displayName: null, organizationId: record.organizationId || undefined };
    }
    return null;
}

export async function getUserByDisplayName(displayName: string): Promise<RegisteredUser | null> {
    const usersRef = query(ref(db, 'users'), orderByChild('displayName'), equalTo(displayName));
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        const usersData = snapshot.val();
        const uid = Object.keys(usersData)[0];
        return { uid, ...usersData[uid] };
    }
    return null;
}



export async function enrollUserInCourse(userId: string, courseId: string, paymentMethod: UserCourse['paymentMethod'] = 'free'): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) throw new Error('You can only enrol your own account.');
  const { error } = await supabase.from('enrollments').upsert({
    user_id: userId, course_id: courseId, progress: 0, completed: false,
    content: { enrollmentDate: new Date().toISOString(), paymentMethod, completedLessons: [], certificateAvailable: false },
  }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });
  if (error) throw error;
  await supabase.from('activity_logs').insert({ user_id: userId, event_type: 'course_enrollment', content: { courseId } });
}

export async function getUserCourses(userId: string): Promise<UserCourse[]> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) throw new Error('You can only view your own enrollments.');
  const { data, error } = await supabase.from('enrollments').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...(row.content || {}), courseId: row.course_id, progress: Number(row.progress || 0),
    completed: Boolean(row.completed), enrollmentDate: row.content?.enrollmentDate || row.created_at,
  })) as UserCourse[];
}

export async function updateUserCourseProgress(userId: string, courseId: string, data: Partial<Omit<UserCourse, 'courseId'>>) {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) throw new Error('You can only update your own course progress.');
  const { data: current, error: readError } = await supabase.from('enrollments').select('content').eq('user_id', userId).eq('course_id', courseId).maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error('Course enrollment not found.');
  const { progress, completed, ...content } = data as any;
  const patch: Record<string, unknown> = { content: { ...(current.content || {}), ...content }, updated_at: new Date().toISOString() };
  if (progress !== undefined) patch.progress = progress;
  if (completed !== undefined) patch.completed = completed;
  const { error } = await supabase.from('enrollments').update(patch).eq('user_id', userId).eq('course_id', courseId);
  if (error) throw error;
}

export async function getAllUsers(): Promise<RegisteredUser[]> {
  const supabase = getSupabaseBrowserClient();
  const { data: current } = await supabase.auth.getUser();
  if (!current.user) throw new Error('Administrator sign-in is required.');
  const { data: allowed, error: roleError } = await supabase.rpc('has_role', {
    check_user_id: current.user.id, allowed_roles: ['admin', 'super_admin'],
  });
  if (roleError || !allowed) throw new Error('Administrator access is required.');
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const ids = (data || []).map((row: any) => row.id);
  const { data: roleRows, error: rolesError } = ids.length
    ? await supabase.from('user_roles').select('user_id,role').in('user_id', ids)
    : { data: [], error: null };
  if (rolesError) throw rolesError;
  const roles = new Map<string, string[]>();
  (roleRows || []).forEach((row: any) => roles.set(row.user_id, [...(roles.get(row.user_id) || []), row.role]));
  return (data || []).map((row: any) => ({
    ...(row.metadata || {}), uid: row.id, email: row.email || null,
    displayName: row.display_name || row.email || 'Learner', photoURL: row.avatar_path || '',
    createdAt: row.created_at, isAdmin: (roles.get(row.id) || []).some(role => ['admin','super_admin'].includes(role)),
    isSuperAdmin: (roles.get(row.id) || []).includes('super_admin'),
  })) as RegisteredUser[];
}
export async function getPublicProfiles(): Promise<RegisteredUser[]> {
  const dbRef = ref(db, 'publicProfiles');
  const snapshot = await get(dbRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(uid => ({
      uid,
      ...data[uid],
    }));
  }
  return [];
}


export async function deleteUser(userId: string): Promise<void> {
    const userRef = ref(db, `users/${userId}`);
    await remove(userRef);
}


// Hero Section Functions
export async function getHeroData(): Promise<HeroData> {
  const defaults: HeroData = {
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
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('app_settings').select('value').eq('key','hero').maybeSingle();
  if (error) throw error;
  return { ...defaults, ...(data?.value || {}) } as HeroData;
}

export async function saveHeroData(data: Partial<HeroData>): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: current, error: readError } = await supabase.from('app_settings').select('value').eq('key','hero').maybeSingle();
  if (readError) throw readError;
  const { data: authData } = await supabase.auth.getUser();
  const { error } = await supabase.from('app_settings').upsert({
    key: 'hero', value: { ...(current?.value || {}), ...data }, updated_by: authData.user?.id || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });
  if (error) throw error;
}

export async function createCalendarEvent(eventData: Omit<CalendarEvent, 'id'>): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Sign in is required to create a calendar event.');
  const event = eventData as any;
  const id = crypto.randomUUID();
  const { error } = await supabase.from('calendar_events').insert({
    id, title: String(event.title || 'Event'), starts_at: event.date || event.startsAt || null,
    content: eventData, created_by: authData.user.id,
  });
  if (error) throw error;
  return id;
}

export async function getAllCalendarEvents(): Promise<CalendarEvent[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('calendar_events').select('*').order('starts_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({ ...(row.content || {}), id: row.id, title: row.title, date: row.starts_at || row.content?.date })) as CalendarEvent[];
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
  if (error) throw error;
}

export async function createSubmission(submissionData: Omit<Submission, 'id'>): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Sign in is required to submit work.');
  const item = submissionData as any;
  const id = crypto.randomUUID();
  const { error } = await supabase.from('submissions').insert({
    id, user_id: authData.user.id, course_id: item.courseId || '', assignment_id: item.assignmentId || null,
    content: submissionData, submitted_at: new Date().toISOString(),
  });
  if (error) throw error;
  return id;
}

export async function getSubmissionsByUserId(userId: string): Promise<Submission[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('submissions').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({ ...(row.content || {}), id: row.id, userId: row.user_id, courseId: row.course_id, submittedAt: row.submitted_at })) as Submission[];
}

export async function getUserSubmissionsForCourse(userId: string, courseId: string): Promise<Submission[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('submissions').select('*').eq('user_id', userId).eq('course_id', courseId).order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({ ...(row.content || {}), id: row.id, userId: row.user_id, courseId: row.course_id, submittedAt: row.submitted_at })) as Submission[];
}

export async function getAllSubmissions(): Promise<Submission[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({ ...(row.content || {}), id: row.id, userId: row.user_id, courseId: row.course_id, submittedAt: row.submitted_at })) as Submission[];
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('submissions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? ({ ...(data.content || {}), id: data.id, userId: data.user_id, courseId: data.course_id, submittedAt: data.submitted_at } as Submission) : null;
}

export async function updateSubmission(id: string, data: Partial<Submission>): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: current, error: readError } = await supabase.from('submissions').select('content').eq('id', id).maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error('Submission not found.');
  const { error } = await supabase.from('submissions').update({
    content: { ...(current.content || {}), ...data }, updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function saveTutorHistory(userId: string, courseId: string, lessonId: string, messages: TutorMessage[]): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) throw new Error('You can only save your own tutor history.');
  const { error } = await supabase.from('tutor_history').upsert({
    user_id: userId, course_id: courseId, lesson_id: lessonId, messages, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,course_id,lesson_id' });
  if (error) throw error;
}

export async function getTutorHistory(userId: string, courseId: string, lessonId: string): Promise<TutorMessage[]> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) throw new Error('You can only read your own tutor history.');
  const { data, error } = await supabase.from('tutor_history').select('messages').eq('user_id', userId).eq('course_id', courseId).eq('lesson_id', lessonId).maybeSingle();
  if (error) throw error;
  return (data?.messages || []) as TutorMessage[];
}

export async function saveTutorSettings(settings: TutorSettings): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData } = await supabase.auth.getUser();
  const { error } = await supabase.from('app_settings').upsert({ key: 'tutor_settings', value: settings, updated_by: authData.user?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

export async function getTutorSettings(): Promise<TutorSettings> {
  const defaults: TutorSettings = { voice: 'algenib', speed: 1.0, prompts: "Welcome! To talk with me, your virtual tutor, just click the chat button.\nHow can I help you with this lesson?", avatarUrl: '/gina-avatar.png' };
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('app_settings').select('value').eq('key','tutor_settings').maybeSingle();
  if (error) throw error;
  return { ...defaults, ...(data?.value || {}) } as TutorSettings;
}

export async function saveCertificateSettings(settings: CertificateSettings): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData } = await supabase.auth.getUser();
  const { error } = await supabase.from('app_settings').upsert({ key: 'certificate_settings', value: settings, updated_by: authData.user?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

export async function getCertificateSettings(): Promise<CertificateSettings> {
  const defaults: CertificateSettings = { academicDirector: 'Dr. Emily Carter' };
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('app_settings').select('value').eq('key','certificate_settings').maybeSingle();
  if (error) throw error;
  return { ...defaults, ...(data?.value || {}) } as CertificateSettings;
}

export async function getRemoteConfigValues(keys: string[]): Promise<Record<string, string>> {
  const hero = await getHeroData();
  const values: Record<string, string> = {};
  keys.forEach(key => {
    if (key === 'hero_title') values[key] = String(hero.title || '');
    else if (key === 'hero_subtitle') values[key] = String(hero.subtitle || '');
    else values[key] = '';
  });
  return values;
}

export async function saveRemoteConfigValues(data: Record<string, string>): Promise<void> {
  await saveHeroData({
    ...(data.hero_title !== undefined ? { title: data.hero_title } : {}),
    ...(data.hero_subtitle !== undefined ? { subtitle: data.hero_subtitle } : {}),
  });
}

export async function createNotification(notificationData: Partial<Omit<Notification, 'id'>>): Promise<string> {
    const notificationsRef = ref(db, 'notifications');
    const newNotificationRef = push(notificationsRef);
    const dataToSave = {
        read: false,
        archived: false,
        ...notificationData,
        createdAt: new Date().toISOString(),
    };
    await set(newNotificationRef, dataToSave);
    return newNotificationRef.key!;
}

export async function getAllNotifications(userId: string, cohort?: string): Promise<Notification[]> {
    if (!userId) throw new Error('A signed-in user is required to load notifications.');
    const userQuery = query(ref(db, 'notifications'), orderByChild('userId'), equalTo(userId));
    const requests = [get(userQuery)];
    if (cohort) {
        const cohortQuery = query(ref(db, 'notifications'), orderByChild('cohort'), equalTo(cohort));
        requests.push(get(cohortQuery));
    }
    const snapshots = await Promise.all(requests);
    const notificationsById = new Map<string, Notification>();
    for (const snapshot of snapshots) {
        if (!snapshot.exists()) continue;
        const data = snapshot.val();
        for (const key of Object.keys(data)) {
            notificationsById.set(key, { id: key, ...data[key] });
        }
    }
    return Array.from(notificationsById.values())
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// User Notes Functions
export async function saveUserNotes(userId: string, courseId: string, notes: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) throw new Error('You can only save your own notes.');
  const { error } = await supabase.from('user_notes').upsert({ user_id: userId, course_id: courseId, notes, updated_at: new Date().toISOString() }, { onConflict: 'user_id,course_id' });
  if (error) throw error;
}

export async function getUserNotes(userId: string, courseId: string): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) throw new Error('You can only read your own notes.');
  const { data, error } = await supabase.from('user_notes').select('notes').eq('user_id', userId).eq('course_id', courseId).maybeSingle();
  if (error) throw error;
  return data?.notes || '';
}

export async function createThread(courseId: string, threadData: Omit<DiscussionThread, 'id'>): Promise<string> {
    const threadsRef = ref(db, `discussions/threads/${courseId}`);
    const newThreadRef = push(threadsRef);
    await set(newThreadRef, threadData);
    return newThreadRef.key!;
}

export async function getThreadsForCourse(courseId: string): Promise<DiscussionThread[]> {
    const threadsRef = query(ref(db, `discussions/threads/${courseId}`), orderByChild('createdAt'));
    const snapshot = await get(threadsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const threads = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        return threads.reverse();
    }
    return [];
}

export async function createReply(threadId: string, replyData: Omit<DiscussionReply, 'id'>): Promise<string> {
    const repliesRef = ref(db, `discussions/replies/${threadId}`);
    const newReplyRef = push(repliesRef);
    await set(newReplyRef, replyData);
    return newReplyRef.key!;
}

export async function getRepliesForThread(threadId: string): Promise<DiscussionReply[]> {
    const repliesRef = query(ref(db, `discussions/replies/${threadId}`), orderByChild('createdAt'));
    const snapshot = await get(repliesRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}


// Live Session Functions
export async function getLiveSession(): Promise<LiveSession | null> {
    const sessionRef = ref(db, 'liveSession');
    const snapshot = await get(sessionRef);
    if(snapshot.exists()) {
        return snapshot.val() as LiveSession;
    }
    return null;
}

export async function updateLiveSession(data: Partial<LiveSession>): Promise<void> {
    const sessionRef = ref(db, 'liveSession');
    await update(sessionRef, data);
}

export async function sendReaction(sessionId: string, emoji: string): Promise<void> {
    const reactionsRef = ref(db, `liveReactions/${sessionId}`);
    const newReactionRef = push(reactionsRef);
    await set(newReactionRef, { emoji });
}


// Program Functions
export async function createProgram(programData: Omit<Program, 'id'>): Promise<string> {
    const programsRef = ref(db, 'programs');
    const newProgramRef = push(programsRef);
    await set(newProgramRef, programData);
    return newProgramRef.key!;
}

export async function getAllPrograms(): Promise<Program[]> {
    const dbRef = ref(db, 'programs');
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
        const programsData = snapshot.val();
        return Object.keys(programsData).map(key => ({
            id: key,
            ...programsData[key]
        }));
    }
    return [];
}

export async function getProgramById(id: string): Promise<Program | null> {
    const programRef = ref(db, `programs/${id}`);
    const snapshot = await get(programRef);
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function updateProgram(id: string, programData: Partial<Program>): Promise<void> {
    const programRef = ref(db, `programs/${id}`);
    await update(programRef, programData);
}

export async function deleteProgram(id: string): Promise<void> {
    const programRef = ref(db, `programs/${id}`);
    await remove(programRef);
}

// Bundle Functions
export async function createBundle(bundleData: Omit<Bundle, 'id'>): Promise<string> {
    const bundlesRef = ref(db, 'bundles');
    const newBundleRef = push(bundlesRef);
    await set(newBundleRef, bundleData);
    return newBundleRef.key!;
}

export async function getAllBundles(): Promise<Bundle[]> {
    const bundlesRef = ref(db, 'bundles');
    const snapshot = await get(bundlesRef);
    if (snapshot.exists()) {
        const bundlesData = snapshot.val();
        return Object.keys(bundlesData).map(key => ({
            id: key,
            ...bundlesData[key]
        }));
    }
    return [];
}

export async function getBundleById(id: string): Promise<Bundle | null> {
    const bundleRef = ref(db, `bundles/${id}`);
    const snapshot = await get(bundleRef);
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function updateBundle(id: string, bundleData: Partial<Bundle>): Promise<void> {
    const bundleRef = ref(db, `bundles/${id}`);
    await update(bundleRef, bundleData);
}

export async function deleteBundle(id: string): Promise<void> {
    const bundleRef = ref(db, `bundles/${id}`);
    await remove(bundleRef);
}


// API Key and Usage Functions
export async function createApiKey(userId: string, keyData: Omit<ApiKey, 'id'>): Promise<string> {
    const keysRef = ref(db, `apiKeys/${userId}`);
    const newKeyRef = push(keysRef);
    await set(newKeyRef, keyData);
    return newKeyRef.key!;
}

export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const keysRef = ref(db, `apiKeys/${userId}`);
    const snapshot = await get(keysRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

export async function deleteApiKey(userId: string, keyId: string): Promise<void> {
    const keyRef = ref(db, `apiKeys/${userId}/${keyId}`);
    await remove(keyRef);
}

export async function logApiCall(userId: string, endpoint: string): Promise<void> {
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, {
        apiCallCount: increment(1)
    });

    const usageLogRef = ref(db, `apiUsage/${userId}`);
    const newLogRef = push(usageLogRef);
    await set(newLogRef, {
        endpoint,
        timestamp: new Date().toISOString(),
    });
}

// Student social features
export async function createCourseFeedback(courseId: string, feedbackData: Omit<CourseFeedback, 'id' | 'courseId' | 'createdAt'>): Promise<string> {
    const feedbackRef = ref(db, `courseFeedback/${courseId}`);
    const newFeedbackRef = push(feedbackRef);
    await set(newFeedbackRef, {
        ...feedbackData,
        createdAt: new Date().toISOString(),
    });
    return newFeedbackRef.key!;
}

// Learning Goals
export async function createLearningGoal(userId: string, text: string): Promise<string> {
    const goalsRef = ref(db, `users/${userId}/learningGoals`);
    const newGoalRef = push(goalsRef);
    await set(newGoalRef, {
        text,
        completed: false,
        createdAt: new Date().toISOString()
    });
    return newGoalRef.key!;
}

export async function updateLearningGoal(userId: string, goalId: string, data: Partial<Omit<LearningGoal, 'id'>>): Promise<void> {
    const goalRef = ref(db, `users/${userId}/learningGoals/${goalId}`);
    await update(goalRef, data);
}

export async function deleteLearningGoal(userId: string, goalId: string): Promise<void> {
    const goalRef = ref(db, `users/${userId}/learningGoals/${goalId}`);
    await remove(goalRef);
}

// Super Admin Permission Requests
export async function createPermissionRequest(requestData: Omit<PermissionRequest, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const requestsRef = ref(db, 'permissionRequests');
    const newRequestRef = push(requestsRef);
    const dataToSave: Omit<PermissionRequest, 'id'> = {
        ...requestData,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
    await set(newRequestRef, dataToSave);
    return newRequestRef.key!;
}

export async function getPermissionRequests(): Promise<PermissionRequest[]> {
    const requestsRef = ref(db, 'permissionRequests');
    const snapshot = await get(requestsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const requests = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        return requests.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
}

export async function updatePermissionRequestStatus(id: string, status: 'approved' | 'denied'): Promise<void> {
    const requestRef = ref(db, `permissionRequests/${id}`);
    await update(requestRef, {
        status,
        resolvedAt: new Date().toISOString(),
    });
}

// Organization Functions
export async function createOrganization(orgData: Omit<Organization, 'id'>): Promise<string> {
    const orgsRef = ref(db, 'organizations');
    const newOrgRef = push(orgsRef);
    await set(newOrgRef, orgData);
    return newOrgRef.key!;
}

export async function getOrganizationMembers(orgId: string): Promise<RegisteredUser[]> {
    const usersRef = query(ref(db, 'users'), orderByChild('organizationId'), equalTo(orgId));
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        const usersData = snapshot.val();
        return Object.keys(usersData).map(uid => ({
            uid,
            ...usersData[uid],
        }));
    }
    return [];
}

export async function getAllOrganizations(): Promise<Organization[]> {
    const orgsRef = ref(db, 'organizations');
    const snapshot = await get(orgsRef);
    if (snapshot.exists()) {
        const orgsData = snapshot.val();
        return Object.keys(orgsData).map(key => ({
            id: key,
            ...orgsData[key]
        }));
    }
    return [];
}

export async function getOrganizationByOwnerId(ownerId: string): Promise<Organization | null> {
  const orgsRef = query(ref(db, 'organizations'), orderByChild('ownerId'), equalTo(ownerId));
  const snapshot = await get(orgsRef);
  if (snapshot.exists()) {
    const orgsData = snapshot.val();
    const orgId = Object.keys(orgsData)[0];
    return { id: orgId, ...orgsData[orgId] };
  }
  return null;
}

export async function updateOrganization(orgId: string, orgData: Partial<Organization>): Promise<void> {
    const orgRef = ref(db, `organizations/${orgId}`);
    await update(orgRef, orgData);
}

export async function deleteOrganization(orgId: string): Promise<void> {
    const orgRef = ref(db, `organizations/${orgId}`);
    // You might also want to handle members associated with this org
    await remove(orgRef);
}


// Invitation Functions
export async function createInvitation(inviteData: Omit<Invitation, 'id'>): Promise<string> {
    const invitesRef = ref(db, 'invitations');
    const newInviteRef = push(invitesRef);
    
    if (inviteData.userId) {
        await createNotification({
            userId: inviteData.userId,
            title: 'Organization Invitation',
            body: `You have been invited to join ${inviteData.organizationName}.`,
            actions: [{
                title: 'Accept',
                action: 'accept_org_invite',
                payload: {
                    inviteId: newInviteRef.key!,
                    organizationId: inviteData.organizationId,
                }
            }]
        });
    }

    await set(newInviteRef, inviteData);
    return newInviteRef.key!;
}

export async function getInvitation(inviteId: string): Promise<Invitation | null> {
    const inviteRef = ref(db, `invitations/${inviteId}`);
    const snapshot = await get(inviteRef);
    if (snapshot.exists()) {
        return { id: inviteId, ...snapshot.val() };
    }
    return null;
}

export async function updateInvitationStatus(inviteId: string, status: 'accepted'): Promise<void> {
    const inviteRef = ref(db, `invitations/${inviteId}`);
    await update(inviteRef, { status });
}

export async function deleteInvitation(inviteId: string): Promise<void> {
    const inviteRef = ref(db, `invitations/${inviteId}`);
    await remove(inviteRef);
}

// Pricing Plan Functions
export async function createPlan(planData: Omit<PricingPlan, 'id'>): Promise<string> {
    const plansRef = ref(db, 'pricingPlans');
    const newPlanRef = push(plansRef);
    await set(newPlanRef, planData);
    return newPlanRef.key!;
}

export async function getAllPlans(): Promise<PricingPlan[]> {
    const plansRef = ref(db, 'pricingPlans');
    const snapshot = await get(plansRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return [];
}

export async function getPlanById(id: string): Promise<PricingPlan | null> {
    const planRef = ref(db, `pricingPlans/${id}`);
    const snapshot = await get(planRef);
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function updatePlan(id: string, planData: Partial<PricingPlan>): Promise<void> {
    const planRef = ref(db, `pricingPlans/${id}`);
    await update(planRef, planData);
}

export async function deletePlan(id: string): Promise<void> {
    const planRef = ref(db, `pricingPlans/${id}`);
    await remove(planRef);
}

// Document Management Functions
export async function saveDocument(docType: string, content: string): Promise<void> {
    const docRef = ref(db, `documents/${docType}`);
    await set(docRef, { content });
}

export async function getDocument(docType: string): Promise<string> {
    const docRef = ref(db, `documents/${docType}/content`);
    const snapshot = await get(docRef);
    return snapshot.exists() ? snapshot.val() : '';
}


// Certificate Verification
export interface PublicCertificateRecord {
    certificateId: string;
    studentName: string;
    studentPhotoURL?: string;
    courseId: string;
    courseTitle: string;
    issuedAt: string;
    status: 'valid' | 'revoked';
}

export async function publishCertificateRecord(record: PublicCertificateRecord): Promise<void> {
    if (!record.certificateId || !record.studentName || !record.courseId || !record.courseTitle) {
        throw new Error('Certificate verification record is incomplete.');
    }
    await set(ref(db, `publicCertificates/${record.certificateId}`), { ...record, status: 'valid' });
}

export async function getVerifiedCertificateData(certificateId: string): Promise<{
    isValid: boolean;
    student?: Pick<RegisteredUser, 'displayName' | 'photoURL'>;
    course?: Pick<Course, 'id' | 'title'>;
}> {
    if (!certificateId) return { isValid: false };
    const snapshot = await get(ref(db, `publicCertificates/${certificateId}`));
    if (!snapshot.exists()) return { isValid: false };
    const record = snapshot.val() as PublicCertificateRecord;
    if (record.status !== 'valid' || record.certificateId !== certificateId) return { isValid: false };
    return {
        isValid: true,
        student: { displayName: record.studentName, photoURL: record.studentPhotoURL || '' },
        course: { id: record.courseId, title: record.courseTitle },
    };
}


// Bootcamp Functions
export async function createBootcamp(bootcampData: Omit<Bootcamp, 'id'>): Promise<string> {
    const bootcampsRef = ref(db, 'bootcamps');
    const newBootcampRef = push(bootcampsRef);
    await set(newBootcampRef, bootcampData);
    return newBootcampRef.key!;
}

export async function getAllBootcamps(): Promise<Bootcamp[]> {
    const dbRef = ref(db, 'bootcamps');
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return [];
}

export async function getBootcampById(id: string): Promise<Bootcamp | null> {
    const bootcampRef = ref(db, `bootcamps/${id}`);
    const snapshot = await get(bootcampRef);
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function updateBootcamp(id: string, bootcampData: Partial<Bootcamp>): Promise<void> {
    const bootcampRef = ref(db, `bootcamps/${id}`);
    await update(bootcampRef, bootcampData);
}

export async function deleteBootcamp(id: string): Promise<void> {
    const bootcampRef = ref(db, `bootcamps/${id}`);
    await remove(bootcampRef);
}

export async function registerUserForBootcamp(bootcampId: string, userId: string): Promise<void> {
    const bootcampRef = ref(db, `bootcamps/${bootcampId}/participants/${userId}`);
    await set(bootcampRef, true);
}

export async function getHackathonParticipants(hackathonId: string): Promise<RegisteredUser[]> {
    const dataRef = ref(db, `hackathons/${hackathonId}/participants`);
    const snapshot = await get(dataRef);
    if (snapshot.exists()) {
        const participantIds = Object.keys(snapshot.val());
        const userPromises = participantIds.map(uid => getUserById(uid));
        const users = (await Promise.all(userPromises)).filter(Boolean) as RegisteredUser[];
        return users;
    }
    return [];
}


// Hackathon Functions
export async function createHackathon(hackathonData: Omit<Hackathon, 'id'>): Promise<string> {
    const refPath = ref(db, 'hackathons');
    const newRef = push(refPath);
    await set(newRef, hackathonData);
    return newRef.key!;
}

export async function getAllHackathons(): Promise<Hackathon[]> {
    const dataRef = ref(db, 'hackathons');
    const snapshot = await get(dataRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return [];
}

export async function getHackathonById(id: string): Promise<Hackathon | null> {
    const dataRef = ref(db, `hackathons/${id}`);
    const snapshot = await get(dataRef);
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function updateHackathon(id: string, hackathonData: Partial<Hackathon>): Promise<void> {
    const dataRef = ref(db, `hackathons/${id}`);
    await update(dataRef, hackathonData);
}

export async function deleteHackathon(id: string): Promise<void> {
    const dataRef = ref(db, `hackathons/${id}`);
    await remove(dataRef);
}

export async function registerForHackathon(hackathonId: string, userId: string): Promise<void> {
    const dataRef = ref(db, `hackathons/${hackathonId}/participants/${userId}`);
    await set(dataRef, true);
}

export async function getHackathonSubmissions(hackathonId: string): Promise<HackathonSubmission[]> {
    const submissionsRef = query(ref(db, 'hackathonSubmissions'), orderByChild('hackathonId'), equalTo(hackathonId));
    const snapshot = await get(submissionsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return [];
}

export async function createHackathonSubmission(submissionData: Omit<HackathonSubmission, 'id'>): Promise<string> {
  const userSubmissionsRef = query(
    ref(db, 'hackathonSubmissions'),
    orderByChild('userId'),
    equalTo(submissionData.userId)
  );
  const snapshot = await get(userSubmissionsRef);
  let userSubmissionsForThisHackathon = 0;
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      if (childSnapshot.val().hackathonId === submissionData.hackathonId) {
        userSubmissionsForThisHackathon++;
      }
    });
  }

  if (userSubmissionsForThisHackathon >= 3) {
    throw new Error("You have reached the maximum of 3 submissions for this hackathon.");
  }
  
  const refPath = ref(db, 'hackathonSubmissions');
  const newRef = push(refPath);
  await set(newRef, submissionData);

  // Leaderboard logic
  const leaderboardRef = ref(db, `leaderboard/${submissionData.userId}`);
  const leaderboardSnapshot = await get(leaderboardRef);
  if (leaderboardSnapshot.exists()) {
    await update(leaderboardRef, {
      score: increment(10), // +10 points for submission
      hackathonCount: increment(1)
    });
  } else {
    const user = await getUserById(submissionData.userId);
    await set(leaderboardRef, {
      userId: submissionData.userId,
      userName: user?.displayName || 'Anonymous',
      userAvatar: user?.photoURL || '',
      score: 10,
      hackathonCount: 1,
    });
  }

  return newRef.key!;
}

export async function awardLeaderboardPoints(userId: string, points: number): Promise<void> {
    const leaderboardRef = ref(db, `leaderboard/${userId}`);
    const leaderboardSnapshot = await get(leaderboardRef);
    if (leaderboardSnapshot.exists()) {
        await update(leaderboardRef, {
            score: increment(points),
        });
    } else {
        // If user is not on leaderboard, create an entry for them
         const user = await getUserById(userId);
        await set(leaderboardRef, {
            userId: userId,
            userName: user?.displayName || 'Anonymous',
            userAvatar: user?.photoURL || '',
            score: points,
            hackathonCount: 0, // Assume 0 if they weren't on the board before
        });
    }
}


export async function getHackathonSubmissionsByUser(userId: string): Promise<HackathonSubmission[]> {
    const submissionsRef = query(ref(db, 'hackathonSubmissions'), orderByChild('userId'), equalTo(userId));
    const snapshot = await get(submissionsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    return [];
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    const leaderboardRef = query(ref(db, 'leaderboard'), orderByChild('score'));
    const snapshot = await get(leaderboardRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const entries: LeaderboardEntry[] = Object.values(data);
        return entries.sort((a,b) => b.score - a.score);
    }
    return [];
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
    const dbRef = ref(db, 'blog');
    const snapshot = await get(dbRef);
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

// Activity Logging
export async function logPageVisit(userId: string, path: string): Promise<void> {
    const user = await getUserById(userId);
    if (!user) return;
    const logRef = ref(db, 'userActivity');
    const newLogRef = push(logRef);
    await set(newLogRef, {
        userId,
        userName: user.displayName || 'Unknown',
        userAvatar: user.photoURL || '',
        type: 'page_visit',
        path,
        timestamp: new Date().toISOString(),
    });
}


export async function logActivity(userId: string, data: { type: 'signup' | 'enrollment'; details: any }): Promise<void> {
    const user = await getUserById(userId);
    const logRef = ref(db, 'userActivity');
    const newLogRef = push(logRef);
    await set(newLogRef, {
        userId,
        userName: user?.displayName || 'Unknown',
        userAvatar: user?.photoURL || '',
        path: window.location.pathname,
        ...data,
        timestamp: new Date().toISOString(),
    });
}

export async function clearActivityData(): Promise<void> {
    const logRef = ref(db, 'userActivity');
    await remove(logRef);
}

export async function getActivityLogs(limit: number): Promise<UserActivity[]> {
    const logRef = query(ref(db, 'userActivity'), limitToLast(limit));
    const snapshot = await get(logRef);
    if(snapshot.exists()) {
        const data = snapshot.val();
        const logs = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        return logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return [];
}

// Blog
export async function createBlogPost(postData: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const postsRef = ref(db, 'blog');
  const newPostRef = push(postsRef);
  const now = new Date().toISOString();
  const dataToSave = {
    ...postData,
    slug: slugify(postData.title),
    createdAt: now,
    updatedAt: now,
  };
  await set(newPostRef, dataToSave);
  return newPostRef.key!;
}

export async function updateBlogPost(postId: string, postData: Partial<Omit<BlogPost, 'id' | 'createdAt'>>): Promise<void> {
  const postRef = ref(db, `blog/${postId}`);
  const dataToUpdate = {
    ...postData,
    slug: slugify(postData.title!),
    updatedAt: new Date().toISOString(),
  };
  await update(postRef, dataToUpdate);
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
    const postRef = ref(db, `blog/${id}`);
    const snapshot = await get(postRef);
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    const blogRef = query(ref(db, 'blog'), orderByChild('slug'), equalTo(slug));
    const snapshot = await get(blogRef);
    if (snapshot.exists()) {
        const postsData = snapshot.val();
        const postId = Object.keys(postsData)[0];
        return { id: postId, ...postsData[postId] };
    }
    return null;
}

export async function deleteBlogPost(postId: string): Promise<void> {
    const postRef = ref(db, `blog/${postId}`);
    await remove(postRef);
}


// Advertisements
export async function createAdvertisement(adData: Omit<Advertisement, 'id'>): Promise<string> {
    const adsRef = ref(db, 'advertisements');
    const newAdRef = push(adsRef);
    await set(newAdRef, adData);
    return newAdRef.key!;
}

export async function getAllAdvertisements(): Promise<Advertisement[]> {
    const adsRef = ref(db, 'advertisements');
    const snapshot = await get(adsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

export async function getActiveAdvertisements(): Promise<Advertisement[]> {
    const allAds = await getAllAdvertisements();
    return allAds.filter(ad => ad.isActive);
}


export async function getAdvertisementById(id: string): Promise<Advertisement | null> {
    const adRef = ref(db, `advertisements/${id}`);
    const snapshot = await get(adRef);
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function updateAdvertisement(id: string, adData: Partial<Advertisement>): Promise<void> {
    const adRef = ref(db, `advertisements/${id}`);
    await update(adRef, adData);
}

export async function deleteAdvertisement(id: string): Promise<void> {
    const adRef = ref(db, `advertisements/${id}`);
    await remove(adRef);
}


export async function getTeamMembers(): Promise<TeamMember[]> {
    const teamRef = ref(db, 'teamMembers');
    const snapshot = await get(teamRef);
    if (!snapshot.exists()) return [];
    const value = snapshot.val();
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value && typeof value === 'object') {
        return Object.entries(value).map(([id, member]) => ({ id, ...(member as Omit<TeamMember, 'id'>) }));
    }
    return [];
}

export async function updateTeamMembers(members: TeamMember[]): Promise<void> {
    const teamRef = ref(db, 'teamMembers');
    await set(teamRef, members);
}

// Contact Messages
export async function createContactMessage(message: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>): Promise<void> {
    const messagesRef = ref(db, 'contactMessages');
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, {
        ...message,
        createdAt: new Date().toISOString(),
        read: false,
    });
}

export async function getContactMessages(): Promise<ContactMessage[]> {
    const messagesRef = query(ref(db, 'contactMessages'), orderByChild('createdAt'));
    const snapshot = await get(messagesRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const messages = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        return messages.reverse();
    }
    return [];
}

export async function markContactMessageAsRead(id: string): Promise<void> {
    const messageRef = ref(db, `contactMessages/${id}`);
    await update(messageRef, { read: true });
}

export async function deleteContactMessage(id: string): Promise<void> {
    const messageRef = ref(db, `contactMessages/${id}`);
    await remove(messageRef);
}


// Forms & Surveys
export async function createForm(formData: Omit<FormType, 'id'>): Promise<string> {
  const formsRef = ref(db, 'forms');
  const newFormRef = push(formsRef);
  const dataToSave = {
    ...formData,
    slug: slugify(formData.title),
  };
  await set(newFormRef, dataToSave);

  // If it's a general survey, create a notification for it
  if (!formData.organizationId) {
    await createNotification({
      title: 'New Survey Available',
      body: `We'd love your feedback! Please take a moment to complete the "${formData.title}" survey.`,
      actions: [{
        title: 'Start Survey',
        action: 'open_form_dialog' as any,
        payload: {
          formId: newFormRef.key!,
        }
      }]
    });
  }

  return newFormRef.key!;
}

export async function updateForm(id: string, formData: Omit<FormType, 'id'>): Promise<void> {
    const formRef = ref(db, `forms/${id}`);
    const dataToSave = {
        ...formData,
        slug: slugify(formData.title),
    };
    await update(formRef, dataToSave);
}

export async function getAllForms(): Promise<FormType[]> {
    const formsRef = ref(db, 'forms');
    const snapshot = await get(formsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

export async function getFormById(id: string): Promise<FormType | null> {
    const formRef = ref(db, `forms/${id}`);
    const snapshot = await get(formRef);
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function getFormBySlug(slug: string): Promise<FormType | null> {
    const formsRef = query(ref(db, 'forms'), orderByChild('slug'), equalTo(slug));
    const snapshot = await get(formsRef);
    if (snapshot.exists()) {
        const formsData = snapshot.val();
        const formId = Object.keys(formsData)[0];
        return { id: formId, ...formsData[formId] };
    }
    return null;
}

export async function deleteForm(id: string): Promise<void> {
    const formRef = ref(db, `forms/${id}`);
    await remove(formRef);
    // Also delete submissions
    const submissionsRef = query(ref(db, 'formSubmissions'), orderByChild('formId'), equalTo(id));
    const snapshot = await get(submissionsRef);
    if (snapshot.exists()) {
        const updates: Record<string, null> = {};
        snapshot.forEach((child) => {
            updates[child.key!] = null;
        });
        await update(ref(db, 'formSubmissions'), updates);
    }
}

export async function createFormSubmission(submissionData: Omit<FormSubmission, 'id'>): Promise<string> {
    const submissionsRef = ref(db, 'formSubmissions');
    const newSubmissionRef = push(submissionsRef);
    await set(newSubmissionRef, submissionData);
    return newSubmissionRef.key!;
}

export async function getFormSubmissions(formId: string): Promise<FormSubmission[]> {
    const submissionsRef = query(ref(db, 'formSubmissions'), orderByChild('formId'), equalTo(formId));
    const snapshot = await get(submissionsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

export async function getFormSubmissionsByUserId(userId: string): Promise<FormSubmission[]> {
    const submissionsRef = query(ref(db, 'formSubmissions'), orderByChild('userId'), equalTo(userId));
    const snapshot = await get(submissionsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

// Affiliate Program
export async function createReferral(referralData: Omit<Referral, 'id'>): Promise<void> {
    const referralsRef = ref(db, 'referrals');
    const newRef = push(referralsRef);
    await set(newRef, referralData);
}

export async function getReferralsByAffiliate(affiliateId: string): Promise<Referral[]> {
    const referralsRef = query(ref(db, 'referrals'), orderByChild('affiliateId'), equalTo(affiliateId));
    const snapshot = await get(referralsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

export async function createOrUpdateConversation(conversation: Partial<any>): Promise<void> {
  const conversationRef = ref(db, `conversations/${conversation.studentId}`);
  const snapshot = await get(conversationRef);
  if (snapshot.exists()) {
    const existingMessages = snapshot.val().messages || [];
    const newMessages = [...existingMessages, {
      senderId: 'employer', // Assuming employer starts or replies
      text: conversation.initialMessage,
      timestamp: new Date().toISOString(),
    }];
    await update(conversationRef, { messages: newMessages, lastMessageAt: new Date().toISOString() });
  } else {
    await set(conversationRef, {
      studentId: conversation.studentId,
      studentName: conversation.studentName,
      employerName: conversation.employerName,
      employerPhotoUrl: conversation.employerPhotoUrl,
      organizationName: conversation.organizationName,
      lastMessageAt: new Date().toISOString(),
      messages: [{
        senderId: 'employer',
        text: conversation.initialMessage,
        timestamp: new Date().toISOString(),
      }]
    });
  }
}

export async function saveMessage(conversationId: string, message: { senderId: string; text: string; timestamp: string }): Promise<void> {
  const messagesRef = ref(db, `conversations/${conversationId}/messages`);
  const newMessageRef = push(messagesRef);
  await set(newMessageRef, message);
  await update(ref(db, `conversations/${conversationId}`), { lastMessageAt: new Date().toISOString() });
}

/**
 * Creates an assignment for a course. Database rules restrict writes to admins.
 */
export async function createAssignment(
    courseId: string,
    data: Omit<Assignment, 'id' | 'courseId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const assignmentRef = push(ref(db, `assignments/${courseId}`));
    if (!assignmentRef.key) throw new Error('Could not allocate an assignment ID.');
    await set(assignmentRef, {
        ...data,
        courseId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    return assignmentRef.key;
}

export async function updateAssignment(
    courseId: string,
    assignmentId: string,
    data: Partial<Pick<Assignment, 'title' | 'description' | 'dueDate' | 'courseTitle'>>
): Promise<void> {
    await update(ref(db, `assignments/${courseId}/${assignmentId}`), {
        ...data,
        updatedAt: new Date().toISOString(),
    });
}

export async function getAssignments(courseId: string): Promise<Assignment[]> {
    const snapshot = await get(ref(db, `assignments/${courseId}`));
    if (!snapshot.exists()) return [];
    return Object.entries(snapshot.val()).map(([id, value]) => ({
        id,
        ...(value as Omit<Assignment, 'id'>),
    })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
