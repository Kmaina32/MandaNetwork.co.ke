'use server';

// This file centralizes all server actions, providing a clear boundary
// between server and client code. All functions exported from a 'use server' file must be async.

import type { LearningPathInput, LearningPathOutput } from '@/ai/flows/career-coach';
import type { ContentStrategyOutput, CardPaymentInput, PayPalPaymentInput, ApiKey } from '@/lib/types';
import type { CourseTutorInput, CourseTutorOutput } from '@/ai/flows/course-tutor';
import type { GenerateApiKeyInput } from '@/ai/flows/generate-api-key';
import type { GenerateCourseContentInput, GenerateCourseContentOutput } from '@/ai/flows/generate-course-content';
import type { GenerateExamInput, GenerateExamOutput } from '@/ai/flows/generate-exam';
import type { GradeShortAnswerExamInput, GradeShortAnswerExamOutput } from '@/ai/flows/grade-short-answer-exam';
import type { MpesaPaymentInput, MpesaPaymentOutput } from '@/ai/flows/mpesa-payment';
import type { SiteHelpInput, SiteHelpOutput } from '@/ai/flows/site-help';
import type { GenerateProjectInput, GenerateProjectOutput } from '@/ai/flows/generate-project';
import type { CreateOrgInviteInput as SendOrgInviteInput, CreateOrgInviteOutput as SendOrgInviteOutput } from '@/ai/flows/send-org-invite';
import type { GenerateFormalDocumentInput, GenerateFormalDocumentOutput } from '@/ai/flows/generate-document';
import type { GenerateHackathonIdeasInput, GenerateHackathonIdeasOutput } from '@/ai/flows/generate-hackathon-ideas';
import type { StudentHelpInput, StudentHelpOutput } from '@/ai/flows/student-help';
import type { SpeechToTextInput, SpeechToTextOutput, TextToSpeechInput, TextToSpeechOutput } from '@/ai/flows/text-to-speech';
import type { GetPortfolioFeedbackInput, GetPortfolioFeedbackOutput } from '@/ai/flows/portfolio-advisor';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { headers } from 'next/headers';
import { checkHackathonParticipantAchievement } from '@/lib/achievements';

// Each function dynamically imports its corresponding flow, ensuring that the AI logic
// is only loaded on the server when the action is executed.

export async function getLearningPath(input: LearningPathInput): Promise<LearningPathOutput> {
  const { getLearningPath } = await import('@/ai/flows/career-coach');
  return getLearningPath(input);
}

export async function runContentStrategy(): Promise<ContentStrategyOutput> {
  const { runContentStrategy } = await import('@/ai/flows/content-strategy');
  return runContentStrategy();
}

export async function courseTutor(input: CourseTutorInput): Promise<CourseTutorOutput> {
  const { courseTutor } = await import('@/ai/flows/course-tutor');
  return courseTutor(input);
}

export async function generateApiKey(input: GenerateApiKeyInput): Promise<ApiKey> {
  const { generateApiKey } = await import('@/ai/flows/generate-api-key');
  return generateApiKey(input);
}

export async function generateCourseContent(input: GenerateCourseContentInput): Promise<GenerateCourseContentOutput> {
  const { generateCourseContent } = await import('@/ai/flows/generate-course-content');
  return generateCourseContent(input);
}

export async function generateExam(input: GenerateExamInput): Promise<GenerateExamOutput> {
  const { generateExam } = await import('@/ai/flows/generate-exam');
  return generateExam(input);
}

export async function generateProject(input: GenerateProjectInput): Promise<GenerateProjectOutput> {
    const { generateProject } = await import('@/ai/flows/generate-project');
    return generateProject(input);
}

export async function gradeShortAnswerExam(input: GradeShortAnswerExamInput): Promise<GradeShortAnswerExamOutput> {
  const { gradeShortAnswerExam } = await import('@/ai/flows/grade-short-answer-exam');
  return gradeShortAnswerExam(input);
}

export async function getUserApiKeys(idToken: string) {
  const { listUserApiKeys } = await import('@/ai/flows/generate-api-key');
  return listUserApiKeys(idToken);
}

export async function processMpesaPayment(input: MpesaPaymentInput): Promise<MpesaPaymentOutput> {
  const { processMpesaPayment } = await import('@/ai/flows/mpesa-payment');
  return processMpesaPayment(input);
}

export async function getMpesaPaymentStatus(idToken: string, checkoutRequestId: string) {
  const { getMpesaPaymentStatus } = await import('@/ai/flows/mpesa-payment');
  return getMpesaPaymentStatus(idToken, checkoutRequestId);
}

// Card checkout is intentionally fail-closed until a verified payment provider is configured.
export async function processCardPayment(_input: CardPaymentInput): Promise<{ success: boolean; message: string }> {
    return {
        success: false,
        message: 'Card payments are not available yet. Please use M-Pesa while card checkout is being configured.',
    };
}

// PayPal checkout is intentionally fail-closed until provider order creation and webhook verification are implemented.

export async function processPayPalPayment(_input: PayPalPaymentInput): Promise<{ success: boolean; message: string; approvalUrl?: string }> {
    return {
        success: false,
        message: 'PayPal payments are not available yet. Please use M-Pesa while PayPal checkout is being configured.',
    };
}


export async function siteHelp(input: SiteHelpInput): Promise<SiteHelpOutput> {
  const { siteHelp } = await import('@/ai/flows/site-help');
  return siteHelp(input);
}

export async function studentHelp(input: StudentHelpInput): Promise<StudentHelpOutput> {
  const { studentHelp } = await import('@/ai/flows/student-help');
  return studentHelp(input);
}

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
    const { textToSpeech } = await import('@/ai/flows/text-to-speech');
    return textToSpeech(input);
}

export async function speechToText(input: SpeechToTextInput): Promise<SpeechToTextOutput> {
    const { speechToText } = await import('@/ai/flows/text-to-speech');
    return speechToText(input);
}

export async function sendOrganizationInvite(input: SendOrgInviteInput): Promise<SendOrgInviteOutput> {
    const { createOrganizationInvite } = await import('@/ai/flows/send-org-invite');
    return createOrganizationInvite(input);
}

export async function generateFormalDocument(input: { docType: string; content: string; }): Promise<GenerateFormalDocumentOutput> {
    const { generateFormalDocument } = await import('@/ai/flows/generate-document');
    const result = await generateFormalDocument({ docType: input.docType as any, content: input.content });
    // The result is returned to the client, which will then call saveDocumentContent.
    return result;
}

export async function generateHackathonIdeas(input: GenerateHackathonIdeasInput): Promise<GenerateHackathonIdeasOutput> {
    const { generateHackathonIdeas } = await import('@/ai/flows/generate-hackathon-ideas');
    const result = await generateHackathonIdeas(input);
    if(result.ideas.length > 0) {
        await checkHackathonParticipantAchievement(input.count.toString());
    }
    return result;
}



async function requireActiveAdmin(idToken: string, requireSuperAdmin = false) {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const snapshot = await adminDb.ref(`users/${decoded.uid}`).get();
    const profile = snapshot.val();
    const allowed = requireSuperAdmin ? profile?.isSuperAdmin === true : profile?.isAdmin === true;
    if (!allowed) throw new Error('Administrator access is required.');
    if (profile.adminExpiresAt != null) {
        const expiry = typeof profile.adminExpiresAt === 'number' ? profile.adminExpiresAt : Date.parse(profile.adminExpiresAt);
        if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new Error('Administrator access has expired.');
    }
    return decoded;
}

export async function getBootcampParticipantCounts(idToken: string): Promise<Record<string, number>> {
    await requireActiveAdmin(idToken);
    const snapshot = await adminDb.ref('bootcampParticipants').get();
    const values = snapshot.val() || {};
    return Object.fromEntries(Object.entries(values).map(([bootcampId, participants]) => [
        bootcampId,
        participants && typeof participants === 'object' ? Object.keys(participants as Record<string, unknown>).length : 0,
    ]));
}

export async function deleteBootcampAndRegistrations(idToken: string, bootcampId: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(bootcampId)) throw new Error('Invalid bootcamp identifier.');
    await requireActiveAdmin(idToken, true);
    const updates: Record<string, null> = {
        [`bootcamps/${bootcampId}`]: null,
        [`bootcampParticipants/${bootcampId}`]: null,
    };
    await adminDb.ref().update(updates);
}

export async function getBootcampRegistrationStatus(idToken: string, bootcampId: string): Promise<boolean> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(bootcampId)) throw new Error('Invalid bootcamp identifier.');
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const snapshot = await adminDb.ref(`bootcampParticipants/${bootcampId}/${decoded.uid}`).get();
    return snapshot.val() === true;
}

export async function registerFreeBootcamp(idToken: string, bootcampId: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(bootcampId)) throw new Error('Invalid bootcamp identifier.');
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const bootcampSnapshot = await adminDb.ref(`bootcamps/${bootcampId}`).get();
    if (!bootcampSnapshot.exists()) throw new Error('This bootcamp is no longer available.');
    const bootcamp = bootcampSnapshot.val();
    const price = Number(bootcamp.price);
    if (!Number.isFinite(price) || price > 0) {
        throw new Error('Paid bootcamp registration is unavailable until verified bootcamp payment processing is enabled.');
    }
    const courseIds = Array.isArray(bootcamp.courseIds) ? bootcamp.courseIds : [];
    const purchasedRef = adminDb.ref(`users/${decoded.uid}/purchasedCourses`);
    const purchasedSnapshot = await purchasedRef.get();
    const purchased = purchasedSnapshot.val() || {};
    const enrolledAt = new Date().toISOString();
    const updates: Record<string, unknown> = {
        [`bootcampParticipants/${bootcampId}/${decoded.uid}`]: true,
    };
    for (const courseId of courseIds) {
        if (typeof courseId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(courseId)) continue;
        if (purchased[courseId]) continue;
        const courseSnapshot = await adminDb.ref(`courses/${courseId}`).get();
        if (!courseSnapshot.exists()) continue;
        updates[`users/${decoded.uid}/purchasedCourses/${courseId}`] = {
            progress: 0,
            completed: false,
            certificateAvailable: false,
            completedLessons: [],
            enrollmentDate: enrolledAt,
            paymentMethod: 'free',
        };
    }
    await adminDb.ref().update(updates);
}

export async function awardPoints(idToken: string, targetUserId: string, points: number): Promise<void> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(targetUserId)) throw new Error('Invalid learner identifier.');
    if (!Number.isInteger(points) || points < 1 || points > 1000) {
        throw new Error('Points must be an integer between 1 and 1,000.');
    }
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const adminSnapshot = await adminDb.ref(`users/${decoded.uid}`).get();
    const adminProfile = adminSnapshot.val();
    if (!adminProfile?.isAdmin) throw new Error('Administrator access is required.');
    if (adminProfile.adminExpiresAt != null) {
        const expiresAt = typeof adminProfile.adminExpiresAt === 'number'
            ? adminProfile.adminExpiresAt
            : Date.parse(adminProfile.adminExpiresAt);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
            throw new Error('Administrator access has expired.');
        }
    }

    const targetSnapshot = await adminDb.ref(`users/${targetUserId}`).get();
    if (!targetSnapshot.exists()) throw new Error('The selected learner no longer exists.');
    const target = targetSnapshot.val();
    const leaderboardRef = adminDb.ref(`leaderboard/${targetUserId}`);
    const result = await leaderboardRef.transaction((current) => ({
        ...(current || {}),
        userId: targetUserId,
        userName: target.displayName || 'Learner',
        userAvatar: target.photoURL || '',
        score: (Number(current?.score) || 0) + points,
        hackathonCount: Number(current?.hackathonCount) || 0,
    }));
    if (!result.committed) throw new Error('Points could not be saved. Please retry.');
}

export async function getPortfolioFeedback(input: GetPortfolioFeedbackInput): Promise<GetPortfolioFeedbackOutput> {
    const { getPortfolioFeedback } = await import('@/ai/flows/portfolio-advisor');
    return getPortfolioFeedback(input);
}

export async function sendContactMessage(payload: {
  idToken: string;
  studentId: string;
  employerName: string;
  email: string;
  phone: string;
  message: string;
}) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(payload.studentId)) throw new Error('Invalid learner identifier.');
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(payload.email) || payload.phone.trim().length < 10 || payload.phone.length > 30) throw new Error('Please provide valid contact details.');
  const decoded = await adminAuth.verifyIdToken(payload.idToken, true);
  const employerSnapshot = await adminDb.ref(`users/${decoded.uid}`).get();
  const employer = employerSnapshot.val();
  if (!employer?.isOrganizationAdmin || !employer.organizationId) {
    throw new Error('An active organization account is required to contact learners.');
  }
  const organizationSnapshot = await adminDb.ref(`organizations/${employer.organizationId}`).get();
  if (!organizationSnapshot.exists()) throw new Error('Your organization could not be verified.');
  const studentSnapshot = await adminDb.ref(`users/${payload.studentId}`).get();
  if (!studentSnapshot.exists()) throw new Error('The selected learner could not be found.');
  const message = payload.message.trim();
  if (message.length < 20 || message.length > 3000) throw new Error('Message must be between 20 and 3,000 characters.');
  const existingRef = adminDb.ref(`conversations/${payload.studentId}`);
  const committed = await existingRef.transaction((existing) => {
    if (existing?.organizationId && existing.organizationId !== employer.organizationId) return;
    const messages = Array.isArray(existing?.messages) ? [...existing.messages] : Object.values(existing?.messages || {});
    messages.push({ senderId: 'employer', authorUid: decoded.uid, text: message, timestamp: new Date().toISOString() });
    return {
      ...(existing || {}),
      studentId: payload.studentId,
      studentName: studentSnapshot.val().displayName || 'Learner',
      employerId: decoded.uid,
      employerName: employer.displayName || payload.employerName.trim(),
      employerPhotoUrl: employer.photoURL || '',
      organizationId: employer.organizationId,
      organizationName: organizationSnapshot.val().name,
      employerDetails: { email: payload.email.trim(), phone: payload.phone.trim() },
      messages,
      lastMessageAt: new Date().toISOString(),
    };
  });
  if (!committed.committed) throw new Error('This learner already has a conversation with another organization.');
}

export async function sendGeneralContactMessage(payload: { name: string; email: string; message: string }) {
    const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
    if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10 || message.length > 3000) {
        throw new Error('Please provide a valid name, email address, and message.');
    }

    const requestHeaders = await headers();
    const clientIp = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || email;
    const bucket = Math.floor(Date.now() / 600000);
    const rateKey = Buffer.from(clientIp).toString('base64url');
    const rateRef = adminDb.ref(`contactRateLimits/${rateKey}/${bucket}`);
    const rate = await rateRef.transaction((current) => {
        const count = Number(current?.count) || 0;
        if (count >= 5) return;
        return { count: count + 1, updatedAt: Date.now() };
    });
    if (!rate.committed) throw new Error('Too many messages have been sent. Please wait a few minutes and try again.');

    const contactRef = adminDb.ref('contactMessages').push();
    const notificationRef = adminDb.ref('notifications').push();
    if (!contactRef.key || !notificationRef.key) throw new Error('Could not save your message.');
    const now = new Date().toISOString();
    const adminUid = 'YlyqSWedlPfEqI9LlGzjN7zlRtC2';
    await adminDb.ref().update({
        [`contactMessages/${contactRef.key}`]: { name, email, message, createdAt: now, read: false },
        [`notifications/${notificationRef.key}`]: {
            userId: adminUid,
            title: `New Message from ${name}`,
            body: { fromName: name, fromEmail: email, message },
            link: '/admin/messages',
            createdAt: now,
            read: false,
        },
    });
}
