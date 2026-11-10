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

import { adminDb } from '@/lib/supabase/admin-records';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifySupabaseAccessToken } from '@/lib/supabase/verify-access-token';
import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { checkHackathonParticipantAchievement } from '@/lib/achievements';
import { assertNvidiaConfigured } from '@/lib/nvidia-models';


const SERVER_ACTION_WINDOW_MS = 10 * 60 * 1000;
const SERVER_ACTION_LIMIT = 12;

/**
 * Bootstrap the single configured administrator from a verified Firebase identity.
 * The client cannot choose a target UID or email; both are derived from the verified token.
 */
export async function ensureConfiguredAdmin(idToken: string): Promise<void> {
  const decoded = await verifySupabaseAccessToken(idToken);
  const allowedEmails = ['bonfacewana3072@gmail.com','macos8388@gmail.com','gmaina424@gmail.com'];
  if (!decoded.email || !allowedEmails.includes(decoded.email.toLowerCase())) throw new Error('This account is not authorized for administrator access.');
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from('user_roles').select('role').eq('user_id',decoded.id).in('role',['admin','super_admin']);
  if (error) throw error;
  if (!data?.length) throw new Error('Administrator access must be granted by an existing platform administrator.');
}

async function enforceServerActionRateLimit(actionName: string, maxCalls = SERVER_ACTION_LIMIT): Promise<void> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-vercel-forwarded-for')
    || requestHeaders.get('x-forwarded-for')
    || requestHeaders.get('x-real-ip')
    || '';
  const clientIp = forwarded.split(',')[0].trim();
  if (!clientIp) throw new Error('Unable to verify request origin. Please retry.');
  const key = createHash('sha256').update(clientIp).digest('hex');
  const rateRef = adminDb.ref(`serverActionRateLimits/${actionName}/${key}`);
  const now = Date.now();
  const result = await rateRef.transaction((current) => {
    const windowStart = Number(current?.windowStart) || 0;
    const count = windowStart > 0 && now - windowStart < SERVER_ACTION_WINDOW_MS
      ? Number(current?.count) || 0
      : 0;
    if (count >= maxCalls) return;
    return { windowStart: count === 0 ? now : windowStart, count: count + 1, updatedAt: now };
  });
  if (!result.committed) throw new Error('Too many requests. Please wait a few minutes and try again.');
}

// Each function dynamically imports its corresponding flow, ensuring that the AI logic
// is only loaded on the server when the action is executed.

export async function getLearningPath(input: LearningPathInput): Promise<LearningPathOutput> {
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('getLearningPath');
  const { getLearningPath } = await import('@/ai/flows/career-coach');
  return getLearningPath(input);
}

export async function runContentStrategy(): Promise<ContentStrategyOutput> {
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('runContentStrategy');
  const { runContentStrategy } = await import('@/ai/flows/content-strategy');
  return runContentStrategy();
}

export async function courseTutor(input: CourseTutorInput): Promise<CourseTutorOutput> {
    // Students on shared school/mobile networks should not exhaust a tiny global IP quota.
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('courseTutor', 60);
  const { courseTutor } = await import('@/ai/flows/course-tutor');
  return courseTutor(input);
}

export async function generateApiKey(input: GenerateApiKeyInput): Promise<ApiKey> {
    await enforceServerActionRateLimit('generateApiKey');
  const { generateApiKey } = await import('@/ai/flows/generate-api-key');
  return generateApiKey(input);
}

export async function generateCourseContent(input: GenerateCourseContentInput): Promise<GenerateCourseContentOutput> {
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('generateCourseContent');
  const { generateCourseContent } = await import('@/ai/flows/generate-course-content');
  return generateCourseContent(input);
}

export async function generateExam(input: GenerateExamInput): Promise<GenerateExamOutput> {
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('generateExam');
  const { generateExam } = await import('@/ai/flows/generate-exam');
  return generateExam(input);
}

export async function generateProject(input: GenerateProjectInput): Promise<GenerateProjectOutput> {
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('generateProject');
    const { generateProject } = await import('@/ai/flows/generate-project');
    return generateProject(input);
}

export async function gradeShortAnswerExam(input: GradeShortAnswerExamInput): Promise<GradeShortAnswerExamOutput> {
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('gradeShortAnswerExam');
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
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('siteHelp');
  const { siteHelp } = await import('@/ai/flows/site-help');
  return siteHelp(input);
}

export async function studentHelp(input: StudentHelpInput): Promise<StudentHelpOutput> {
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('studentHelp');
  const { studentHelp } = await import('@/ai/flows/student-help');
  return studentHelp(input);
}

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
    await enforceServerActionRateLimit('textToSpeech');
    const { textToSpeech } = await import('@/ai/flows/text-to-speech');
    return textToSpeech(input);
}

export async function speechToText(input: SpeechToTextInput): Promise<SpeechToTextOutput> {
    await enforceServerActionRateLimit('speechToText');
    const { speechToText } = await import('@/ai/flows/text-to-speech');
    return speechToText(input);
}

export async function sendOrganizationInvite(input: SendOrgInviteInput): Promise<SendOrgInviteOutput> {
    await enforceServerActionRateLimit('sendOrganizationInvite');
    const { createOrganizationInvite } = await import('@/ai/flows/send-org-invite');
    return createOrganizationInvite(input);
}

export async function generateFormalDocument(input: { docType: string; content: string; }): Promise<GenerateFormalDocumentOutput> {
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('generateFormalDocument');
    const { generateFormalDocument } = await import('@/ai/flows/generate-document');
    const result = await generateFormalDocument({ docType: input.docType as any, content: input.content });
    // The result is returned to the client, which will then call saveDocumentContent.
    return result;
}

export async function generateHackathonIdeas(input: GenerateHackathonIdeasInput): Promise<GenerateHackathonIdeasOutput> {
    assertNvidiaConfigured();
    await enforceServerActionRateLimit('generateHackathonIdeas');
    const { generateHackathonIdeas } = await import('@/ai/flows/generate-hackathon-ideas');
    const result = await generateHackathonIdeas(input);
    if(result.ideas.length > 0) {
        await checkHackathonParticipantAchievement(input.count.toString());
    }
    return result;
}

export async function awardPoints(idToken: string, targetUserId: string, points: number): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) throw new Error('Invalid learner identifier.');
  if (!Number.isInteger(points) || points < 1 || points > 1000) throw new Error('Points must be an integer between 1 and 1,000.');
  const decoded = await verifySupabaseAccessToken(idToken); const admin = getSupabaseAdminClient();
  const { data: roles, error: roleError } = await admin.from('user_roles').select('role').eq('user_id',decoded.id).in('role',['admin','super_admin']);
  if (roleError) throw roleError; if (!roles?.length) throw new Error('Administrator access is required.');
  const { data: target, error: targetError } = await admin.from('profiles').select('id,display_name,avatar_path').eq('id',targetUserId).maybeSingle();
  if (targetError) throw targetError; if (!target) throw new Error('The selected learner no longer exists.');
  const current = await adminDb.ref('leaderboard/'+targetUserId).get(); const value = current.val() || {};
  await adminDb.ref('leaderboard/'+targetUserId).set({...value,userId:targetUserId,userName:target.display_name||'Learner',userAvatar:target.avatar_path||'',score:(Number(value.score)||0)+points,hackathonCount:Number(value.hackathonCount)||0});
}

export async function getPortfolioFeedback(input: GetPortfolioFeedbackInput): Promise<GetPortfolioFeedbackOutput> {
    await enforceServerActionRateLimit('getPortfolioFeedback');
    const { getPortfolioFeedback } = await import('@/ai/flows/portfolio-advisor');
    return getPortfolioFeedback(input);
}

export async function sendContactMessage(payload: { idToken:string; studentId:string; employerName:string; email:string; phone:string; message:string; }) {
  if (!/^[0-9a-f-]{36}$/i.test(payload.studentId)) throw new Error('Invalid learner identifier.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.phone.trim().length < 10 || payload.phone.length > 30) throw new Error('Please provide valid contact details.');
  const decoded=await verifySupabaseAccessToken(payload.idToken); const admin=getSupabaseAdminClient();
  const [{data:employerProfile,error:employerError},{data:studentProfile,error:studentError},{data:membership,error:membershipError}]=await Promise.all([
    admin.from('profiles').select('display_name,avatar_path').eq('id',decoded.id).maybeSingle(),
    admin.from('profiles').select('display_name').eq('id',payload.studentId).maybeSingle(),
    admin.from('organization_members').select('organization_id,member_role,status').eq('user_id',decoded.id).eq('status','active').in('member_role',['owner','admin']).limit(1).maybeSingle(),
  ]);
  if(employerError)throw employerError;if(studentError)throw studentError;if(membershipError)throw membershipError;
  if(!employerProfile||!studentProfile||!membership)throw new Error('An active organization account is required to contact learners.');
  const organizationId=membership.organization_id;
  const {data:organization,error:orgError}=await admin.from('organizations').select('id,name').eq('id',organizationId).maybeSingle();
  if(orgError)throw orgError;if(!organization)throw new Error('Your organization could not be verified.');
  const message=payload.message.trim();if(message.length<20||message.length>3000)throw new Error('Message must be between 20 and 3,000 characters.');
  const existingRef=adminDb.ref('conversations/'+payload.studentId);const existing=(await existingRef.get()).val()||{};
  if(existing.organizationId&&existing.organizationId!==organizationId)throw new Error('This learner already has a conversation with another organization.');
  const messages=Array.isArray(existing.messages)?[...existing.messages]:Object.values(existing.messages||{});
  messages.push({senderId:'employer',authorUid:decoded.id,text:message,timestamp:new Date().toISOString()});
  await existingRef.set({...existing,studentId:payload.studentId,studentName:studentProfile.display_name||'Learner',employerId:decoded.id,employerName:employerProfile.display_name||payload.employerName.trim(),employerPhotoUrl:employerProfile.avatar_path||'',organizationId,organizationName:organization.name,employerDetails:{email:payload.email.trim(),phone:payload.phone.trim()},messages,lastMessageAt:new Date().toISOString()});
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


/** Atomically persist an approved exam grade, course certificate entitlement and public verification record. */
export async function saveExamGradeAndCertificate(input:{idToken:string;submissionId:string;pointsAwarded:number;feedback:string;certificate?:{certificateId:string;studentName:string;courseId:string;courseTitle:string;issuedAt:string}}):Promise<void>{
  const decoded=await verifySupabaseAccessToken(input.idToken);const admin=getSupabaseAdminClient();
  const {data:roles,error:roleError}=await admin.from('user_roles').select('role').eq('user_id',decoded.id).in('role',['admin','super_admin']);
  if(roleError)throw roleError;if(!roles?.length)throw new Error('Administrator access is required.');
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(input.submissionId)||!Number.isFinite(input.pointsAwarded)||input.pointsAwarded<0||input.feedback.length>50000)throw new Error('Invalid grade payload.');
  const {data:submission,error:submissionError}=await admin.from('submissions').select('*').eq('id',input.submissionId).maybeSingle();
  if(submissionError)throw submissionError;if(!submission)throw new Error('Submission not found.');
  if(submission.graded_at)throw new Error('This submission has already been graded.');
  const content={...(submission.content||{}),graded:true,pointsAwarded:input.pointsAwarded,feedback:input.feedback};
  const {error:updateError}=await admin.from('submissions').update({content,graded_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',input.submissionId).is('graded_at',null);
  if(updateError)throw updateError;
  if(input.certificate){const cert=input.certificate;if(cert.courseId!==submission.course_id||!/^[A-Za-z0-9_-]{1,128}$/.test(cert.certificateId))throw new Error('Certificate does not match this submission.');
    const {data:enrollment,error:readError}=await admin.from('enrollments').select('content').eq('user_id',submission.user_id).eq('course_id',submission.course_id).maybeSingle();
    if(readError)throw readError;if(!enrollment)throw new Error('Course enrollment not found.');
    const {error}=await admin.from('enrollments').update({content:{...(enrollment.content||{}),certificateAvailable:true,certificateId:cert.certificateId},updated_at:new Date().toISOString()}).eq('user_id',submission.user_id).eq('course_id',submission.course_id);
    if(error)throw error;await adminDb.ref('publicCertificates/'+cert.certificateId).set({...cert,status:'valid'});
  }
}

async function requireActiveAdmin(idToken:string,requireSuperAdmin=false) {
  const decoded=await verifySupabaseAccessToken(idToken);const admin=getSupabaseAdminClient();
  const allowed=requireSuperAdmin?['super_admin']:['admin','super_admin'];
  const {data,error}=await admin.from('user_roles').select('role').eq('user_id',decoded.id).in('role',allowed);
  if(error)throw error;if(!data?.length)throw new Error('Administrator access is required.');return decoded;
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
    const decoded = await verifySupabaseAccessToken(idToken);
    const snapshot = await adminDb.ref(`bootcampParticipants/${bootcampId}/${decoded.id}`).get();
    return snapshot.val() === true;
}

export async function registerFreeBootcamp(idToken: string, bootcampId: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(bootcampId)) throw new Error('Invalid bootcamp identifier.');
    const decoded = await verifySupabaseAccessToken(idToken);
    const bootcampSnapshot = await adminDb.ref(`bootcamps/${bootcampId}`).get();
    if (!bootcampSnapshot.exists()) throw new Error('This bootcamp is no longer available.');
    const bootcamp = bootcampSnapshot.val();
    const price = Number(bootcamp.price);
    if (!Number.isFinite(price) || price > 0) throw new Error('Paid bootcamp registration is unavailable until verified bootcamp payment processing is enabled.');
    const courseIds = Array.isArray(bootcamp.courseIds) ? bootcamp.courseIds : [];
    const purchasedRef = adminDb.ref(`users/${decoded.id}/purchasedCourses`);
    const purchasedSnapshot = await purchasedRef.get();
    const purchased = purchasedSnapshot.val() || {};
    const enrolledAt = new Date().toISOString();
    const updates: Record<string, unknown> = { [`bootcampParticipants/${bootcampId}/${decoded.id}`]: true };
    for (const courseId of courseIds) {
        if (typeof courseId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(courseId) || purchased[courseId]) continue;
        const courseSnapshot = await adminDb.ref(`courses/${courseId}`).get();
        if (!courseSnapshot.exists()) continue;
        updates[`users/${decoded.id}/purchasedCourses/${courseId}`] = {
            progress: 0, completed: false, certificateAvailable: false, completedLessons: [],
            enrollmentDate: enrolledAt, paymentMethod: 'free',
        };
    }
    await adminDb.ref().update(updates);
}
