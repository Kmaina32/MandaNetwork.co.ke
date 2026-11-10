import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/user-client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Please sign in to enrol in this course.' }, { status: 401 });
    }

    const { client, user } = await createSupabaseUserClient(authorization.slice(7));
    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: 'Verify your email address before enrolling.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
    if (!courseId || !/^[A-Za-z0-9_-]{1,128}$/.test(courseId)) {
      return NextResponse.json({ error: 'Please select a valid course.' }, { status: 400 });
    }

    const { data: course, error: courseError } = await client
      .from('courses')
      .select('id,title,price,is_published,content')
      .eq('id', courseId)
      .eq('is_published', true)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) return NextResponse.json({ error: 'This course is no longer available.' }, { status: 404 });
    if (Number(course.price || 0) > 0) {
      return NextResponse.json({ error: 'This course requires payment. Use the purchase option to enrol.' }, { status: 409 });
    }

    const { data: existing, error: existingError } = await client
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ success: true, alreadyEnrolled: true });

    const content = course.content && typeof course.content === 'object' ? course.content as Record<string, unknown> : {};
    const prerequisiteCourseId = typeof content.prerequisiteCourseId === 'string' ? content.prerequisiteCourseId : '';
    if (prerequisiteCourseId) {
      const { data: prerequisite, error: prerequisiteError } = await client
        .from('enrollments')
        .select('id,completed')
        .eq('user_id', user.id)
        .eq('course_id', prerequisiteCourseId)
        .eq('completed', true)
        .maybeSingle();
      if (prerequisiteError) throw prerequisiteError;
      if (!prerequisite) {
        return NextResponse.json({ error: 'Complete the required prerequisite course before enrolling.' }, { status: 403 });
      }
    }

    const enrollmentDate = new Date().toISOString();
    const { error: enrollmentError } = await client.from('enrollments').insert({
      user_id: user.id,
      course_id: courseId,
      progress: 0,
      completed: false,
      content: { enrollmentDate, paymentMethod: 'free', completedLessons: [] },
    });
    if (enrollmentError) throw enrollmentError;

    // Activity history is supplementary and must not undo a successful enrolment.
    await client.from('activity_logs').insert({
      user_id: user.id,
      event_type: 'course_enrollment',
      content: { courseId, courseTitle: course.title || 'Course', path: '/courses' },
    }).then(({ error }) => {
      if (error) console.warn('Enrollment activity log was not recorded:', error.message);
    });

    return NextResponse.json({ success: true, alreadyEnrolled: false });
  } catch (error) {
    console.error('Supabase course enrollment failed:', error instanceof Error ? error.message : 'Unknown error');
    const message = error instanceof Error && error.message.includes('session')
      ? 'Your sign-in session has expired. Please sign in again.'
      : 'We could not complete your enrolment right now. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
