

'use client';

import { db, storage } from './firebase';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo, increment, limitToLast } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Course, UserCourse, CalendarEvent, Submission, TutorMessage, Notification, DiscussionThread, DiscussionReply, LiveSession, Program, Bundle, ApiKey, PortfolioProject as Project, LearningGoal, CourseFeedback, Portfolio, PermissionRequest, Organization, Invitation, RegisteredUser, Hackathon, HackathonSubmission, LeaderboardEntry, PricingPlan, Advertisement, UserActivity, TeamMember, ContactMessage, Form as FormType, FormSubmission, Referral } from './types';
import { getRemoteConfig, fetchAndActivate, getString } from 'firebase/remote-config';
import { app } from './firebase';
import { slugify } from './utils';

export type { RegisteredUser } from './types';


export interface HeroData {
    title: string;
    subtitle: string;
    imageUrl: string;
    loginImageUrl: string;
    signupImageUrl: string;
    slideshowSpeed: number;
    imageBrightness: number;
    recaptchaEnabled: boolean;
    onboardingEnabled: boolean;
    theme?: string;
    animationsEnabled?: boolean;
    orgHeroTitle?: string;
    orgHeroSubtitle?: string;
    orgHeroImageUrl?: string;
    orgLoginImageUrl?: string;
    orgSignupImageUrl?: string;
    programsImageUrl?: string;
    bootcampsImageUrl?: string;
    hackathonsImageUrl?: string;
    portfoliosImageUrl?: string;
    adsEnabled?: boolean;
    adInterval?: number;
    activityTrackingEnabled?: boolean;
    aiProvider?: 'gemini' | 'openai' | 'anthropic';
    customModelId?: string;
}

export interface TutorSettings {
    voice: string;
    speed: number;
    prompts?: string;
    avatarUrl?: string;
}

export interface CertificateSettings {
    academicDirector: string;
}

// Image Upload Service
export async function uploadImage(path: string, file: File): Promise<string> {
    const imageRef = storageRef(storage, path);
    await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
}

// Course Functions
export async function getAllCourses(): Promise<Course[]> {
  const dbRef = ref(db, 'courses');
  const snapshot = await get(dbRef);
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

export async function getCourseById(id: string): Promise<Course | null> {
    const courseRef = ref(db, `courses/${id}`);
    const snapshot = await get(courseRef);
    if(snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
    const allCourses = await getAllCourses();
    return allCourses.find(course => slugify(course.title) === slug) || null;
}


export async function createCourse(courseData: Omit<Course, 'id' | 'createdAt'>): Promise<string> {
    const coursesRef = ref(db, 'courses');
    const newCourseRef = push(coursesRef);
    const dataToSave = {
        ...courseData,
        createdAt: new Date().toISOString(),
        modules: courseData.modules || [],
        exam: courseData.exam || [],
    };

    if (dataToSave.prerequisiteCourseId === 'none' || !dataToSave.prerequisiteCourseId) {
        delete dataToSave.prerequisiteCourseId;
    }

    await set(newCourseRef, dataToSave);
    return newCourseRef.key!;
}

export async function updateCourse(courseId: string, courseData: Partial<Course>): Promise<void> {
    const courseRef = ref(db, `courses/${courseId}`);
    const dataToUpdate = { ...courseData };
    if (dataToUpdate.prerequisiteCourseId === 'none') {
        dataToUpdate.prerequisiteCourseId = undefined; // This will get filtered out
    }
     // Filter out undefined values to avoid overwriting with null in Firebase
    const finalData = Object.fromEntries(Object.entries(dataToUpdate).filter(([_, v]) => v !== undefined));

    await update(courseRef, finalData);
}


export async function deleteCourse(courseId: string): Promise<void> {
    const courseRef = ref(db, `courses/${courseId}`);
    await remove(courseRef);
}


// User Functions
export async function saveUser(uid: string, dataToSave: Partial<Omit<RegisteredUser, 'uid'>>): Promise<void> {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, dataToSave);

    if (dataToSave.portfolio || dataToSave.displayName || dataToSave.photoURL) {
        const userSnapshot = await get(userRef);
        const fullUser = userSnapshot.val();
        
        if (fullUser.portfolio?.public) {
            const publicProfileRef = ref(db, `publicProfiles/${uid}`);
            await set(publicProfileRef, {
                uid: uid,
                displayName: fullUser.displayName,
                photoURL: fullUser.photoURL,
                portfolio: fullUser.portfolio
            });
        }
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

export async function getUserByEmail(email: string): Promise<RegisteredUser | null> {
    const usersRef = query(ref(db, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        const usersData = snapshot.val();
        const uid = Object.keys(usersData)[0];
        return { uid, ...usersData[uid] };
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
    const enrollmentRef = ref(db, `users/${userId}/purchasedCourses/${courseId}`);
    await set(enrollmentRef, {
        progress: 0,
        completed: false,
        certificateAvailable: false,
        completedLessons: [],
        enrollmentDate: new Date().toISOString(),
        paymentMethod: paymentMethod,
    });
     const course = await getCourseById(courseId);
    if (course) {
        await logActivity(userId, {
            type: 'enrollment',
            details: {
                courseTitle: course.title,
                courseId: courseId
            }
        });
    }
}

export async function getUserCourses(userId: string): Promise<UserCourse[]> {
    const userCoursesRef = ref(db, `users/${userId}/purchasedCourses`);
    const snapshot = await get(userCoursesRef);
    if (snapshot.exists()) {
        const coursesData = snapshot.val();
        return Object.keys(coursesData).map(courseId => ({
            courseId,
            ...coursesData[courseId]
        }));
    }
    return [];
}

export async function updateUserCourseProgress(userId: string, courseId: string, data: Partial<Omit<UserCourse, 'courseId'>>) {
    const progressRef = ref(db, `users/${userId}/purchasedCourses/${courseId}`);
    await update(progressRef, data);
}


export async function getAllUsers(): Promise<RegisteredUser[]> {
    const usersRef = ref(db, 'users');
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
    const heroRef = ref(db, 'hero');
    const snapshot = await get(heroRef);
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

export async function saveHeroData(data: Partial<HeroData>): Promise<void> {
    const heroRef = ref(db, 'hero');
    await update(heroRef, data);
}


// Calendar Event Functions
export async function createCalendarEvent(eventData: Omit<CalendarEvent, 'id'>): Promise<string> {
    const eventsRef = ref(db, 'calendarEvents');
    const newEventRef = push(eventsRef);
    await set(newEventRef, eventData);
    return newEventRef.key!;
}

export async function getAllCalendarEvents(): Promise<CalendarEvent[]> {
    const eventsRef = ref(db, 'calendarEvents');
    const snapshot = await get(eventsRef);
    if (snapshot.exists()) {
        const eventsData = snapshot.val();
        return Object.keys(eventsData).map(key => ({
            id: key,
            ...eventsData[key]
        }));
    }
    return [];
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
    const eventRef = ref(db, `calendarEvents/${eventId}`);
    await remove(eventRef);
}

// Submission Functions
export async function createSubmission(submissionData: Omit<Submission, 'id'>): Promise<string> {
    const submissionsRef = ref(db, 'submissions');
    const newSubmissionRef = push(submissionsRef);
    await set(newSubmissionRef, submissionData);
    return newSubmissionRef.key!;
}

export async function getSubmissionsByUserId(userId: string): Promise<Submission[]> {
    const submissionsRef = query(ref(db, 'submissions'), orderByChild('userId'), equalTo(userId));
    const snapshot = await get(submissionsRef);
    if (snapshot.exists()) {
        const submissionsData = snapshot.val();
        return Object.keys(submissionsData).map(key => ({
            id: key,
            ...submissionsData[key],
        }));
    }
    return [];
}

export async function getUserSubmissionsForCourse(userId: string, courseId: string): Promise<Submission[]> {
    const submissionsRef = query(ref(db, 'submissions'), orderByChild('userId'), equalTo(userId));
    const snapshot = await get(submissionsRef);
    if (snapshot.exists()) {
        const submissionsData = snapshot.val();
        return Object.keys(submissionsData)
            .map(key => ({
                id: key,
                ...submissionsData[key],
            }))
            .filter(submission => submission.courseId === courseId);
    }
    return [];
}

export async function getAllSubmissions(): Promise<Submission[]> {
    const submissionsRef = ref(db, 'submissions');
    const snapshot = await get(submissionsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
    const submissionRef = ref(db, `submissions/${id}`);
    const snapshot = await get(submissionRef);
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function updateSubmission(id: string, data: Partial<Submission>): Promise<void> {
    const submissionRef = ref(db, `submissions/${id}`);
    await update(submissionRef, data);
}

// Tutor History Functions
export async function saveTutorHistory(
  userId: string,
  courseId: string,
  lessonId: string,
  messages: TutorMessage[]
): Promise<void> {
  const historyRef = ref(db, `tutorHistory/${userId}/${courseId}/${lessonId}`);
  await set(historyRef, messages);
}

export async function getTutorHistory(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<TutorMessage[]> {
  const historyRef = ref(db, `tutorHistory/${userId}/${courseId}/${lessonId}`);
  const snapshot = await get(historyRef);
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return [];
}

// Tutor Settings Functions
export async function saveTutorSettings(settings: TutorSettings): Promise<void> {
    const settingsRef = ref(db, 'tutorSettings');
    await set(settingsRef, settings);
}

export async function getTutorSettings(): Promise<TutorSettings> {
    const settingsRef = ref(db, 'tutorSettings');
    const snapshot = await get(settingsRef);
    const defaults: TutorSettings = {
        voice: 'algenib',
        speed: 1.0,
        prompts: "Welcome! To talk with me, your virtual tutor, just click the chat button.\nHow can I help you with this lesson?",
        avatarUrl: '/gina-avatar.png',
    };
    if (snapshot.exists()) {
        return { ...defaults, ...snapshot.val() };
    }
    return defaults;
}

// Certificate Settings Functions
export async function saveCertificateSettings(settings: CertificateSettings): Promise<void> {
    const settingsRef = ref(db, 'certificateSettings');
    await set(settingsRef, settings);
}

export async function getCertificateSettings(): Promise<CertificateSettings> {
    const settingsRef = ref(db, 'certificateSettings');
    const snapshot = await get(settingsRef);
    const defaults: CertificateSettings = {
        academicDirector: 'Dr. Emily Carter',
    };
    if (snapshot.exists()) {
        return { ...defaults, ...snapshot.val() };
    }
    return defaults;
}


// Remote Config Functions
export async function getRemoteConfigValues(keys: string[]): Promise<Record<string, string>> {
    const remoteConfig = getRemoteConfig(app);
    if (typeof window !== 'undefined') {
        await fetchAndActivate(remoteConfig);
    }
    
    const configValues: Record<string, string> = {};
    keys.forEach(key => {
        configValues[key] = getString(remoteConfig, key);
    });
    return configValues;
}


export async function saveRemoteConfigValues(data: Record<string, string>): Promise<void> {
    // This function can't actually save to remote config from the client.
    // It will write to the Realtime Database instead as a mock.
    const heroRef = ref(db, 'hero');
    await update(heroRef, {
        title: data.hero_title,
        subtitle: data.hero_subtitle
    });
    console.log("Remote config values saved to RTDB for demo purposes:", data);
}


// Notification Functions
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

export async function getAllNotifications(): Promise<Notification[]> {
    const notificationsRef = ref(db, 'notifications');
    const snapshot = await get(notificationsRef);
    if (snapshot.exists()) {
        const notificationsData = snapshot.val();
        const notifications = Object.keys(notificationsData).map(key => ({
            id: key,
            ...notificationsData[key]
        }));
        return notifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
}

// User Notes Functions
export async function saveUserNotes(userId: string, courseId: string, notes: string): Promise<void> {
    const notesRef = ref(db, `userNotes/${userId}/${courseId}`);
    await set(notesRef, { notes });
}

export async function getUserNotes(userId: string, courseId: string): Promise<string> {
    const notesRef = ref(db, `userNotes/${userId}/${courseId}/notes`);
    const snapshot = await get(notesRef);
    if (snapshot.exists()) {
        return snapshot.val();
    }
    return '';
}

// Discussion Forum Functions
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
    
    await createNotification({
        userId: inviteData.userId!,
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
export async function getVerifiedCertificateData(certificateId: string): Promise<{isValid: boolean, student?: RegisteredUser, course?: Course}> {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return { isValid: false };
    
    const usersData = snapshot.val();
    let foundUser: RegisteredUser | undefined;
    let foundCourseId: string | undefined;

    for (const uid of Object.keys(usersData)) {
        const user = usersData[uid];
        if (user.purchasedCourses) {
            for (const courseId of Object.keys(user.purchasedCourses)) {
                if (user.purchasedCourses[courseId].certificateId === certificateId) {
                    foundUser = { uid, ...user };
                    foundCourseId = courseId;
                    break;
                }
            }
        }
        if (foundUser) break;
    }
    
    if (foundUser && foundCourseId) {
        const course = await getCourseById(foundCourseId);
        if (course) {
            return { isValid: true, student: foundUser, course: course };
        }
    }
    
    return { isValid: false };
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
    if (snapshot.exists()) {
        return snapshot.val() || [];
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
  await set(newFormRef, formData);

  // If it's a general survey, create a notification for it
  if (!formData.organizationId) {
    await createNotification({
      title: 'New Survey Available',
      body: `We'd love your feedback! Please take a moment to complete the "${formData.title}" survey.`,
      actions: [{
        title: 'Start Survey',
        action: 'open_form_dialog' as any, // This is a custom client-side action
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
    await update(formRef, formData);
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
