import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySupabaseAccessToken } from '@/lib/supabase/verify-access-token';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Please sign in to enrol in this course.' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authorization.slice(7));
    const body = await request.json().catch(() => ({}));
    const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
    if (!courseId || !/^[A-Za-z0-9_-]{1,128}$/.test(courseId)) {
      return NextResponse.json({ error: 'Please select a valid course.' }, { status: 400 });
    }

    const courseSnapshot = await adminDb.ref(`courses/${courseId}`).get();
    if (!courseSnapshot.exists()) {
      return NextResponse.json({ error: 'This course is no longer available.' }, { status: 404 });
    }
    const course = courseSnapshot.val();
    if (Number(course.price || 0) > 0) {
      return NextResponse.json({ error: 'This course requires payment. Use the purchase option to enrol.' }, { status: 409 });
    }

    const userId = decoded.id;
    const enrollmentRef = adminDb.ref(`users/${userId}/purchasedCourses/${courseId}`);
    const existing = await enrollmentRef.get();
    if (existing.exists()) {
      return NextResponse.json({ success: true, alreadyEnrolled: true });
    }

    if (course.prerequisiteCourseId) {
      const prerequisite = await adminDb.ref(`users/${userId}/purchasedCourses/${course.prerequisiteCourseId}`).get();
      if (!prerequisite.exists() || prerequisite.val()?.completed !== true) {
        return NextResponse.json({ error: 'Complete the required prerequisite course before enrolling.' }, { status: 403 });
      }
    }

    const enrollmentDate = new Date().toISOString();
    await enrollmentRef.set({
      progress: 0,
      completed: false,
      certificateAvailable: false,
      completedLessons: [],
      enrollmentDate,
      paymentMethod: 'free',
    });

    // Activity history is supplementary; never fail a valid enrolment because a log cannot be written.
    try {
      const userSnapshot = await adminDb.ref(`users/${userId}`).get();
      const profile = userSnapshot.val() || {};
      const activityRef = adminDb.ref('userActivity').push();
      await activityRef.set({
        userId,
        userName: profile.displayName || 'Learner',
        userAvatar: profile.photoURL || '',
        path: '/courses',
        type: 'enrollment',
        details: { courseTitle: course.title || 'Course', courseId },
        timestamp: enrollmentDate,
      });
    } catch (activityError) {
      console.warn('Course enrolled, but activity history could not be recorded:', activityError instanceof Error ? activityError.message : 'Unknown error');
    }

    return NextResponse.json({ success: true, alreadyEnrolled: false });
  } catch (error) {
    console.error('Free course enrollment failed:', error instanceof Error ? error.message : 'Unknown error');
    const message = error instanceof Error && error.message.includes('Firebase ID token')
      ? 'Your sign-in session has expired. Please sign in again.'
      : 'We could not complete your enrolment right now. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
