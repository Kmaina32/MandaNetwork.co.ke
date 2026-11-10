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

import { checkHackathonParticipantAchievement } from '@/lib/achievements';
import { assertNvidiaConfigured } from '@/lib/nvidia-models';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseUserClient } from '@/lib/supabase/user-client';


const SERVER_ACTION_WINDOW_MS = 10 * 60 * 1000;
const SERVER_ACTION_LIMIT = 12;

/**
 * Bootstrap the single configured administrator from a verified Supabase identity.
 * The client cannot choose a target UID or email; both are derived from the verified token.
 */
export async function ensureConfiguredAdmin(idToken: string): Promise<void> {
  const { client, user } = await createSupabaseUserClient(idToken);
  const allowedEmails = ['bonfacewana3072@gmail.com','macos8388@gmail.com','gmaina424@gmail.com'];
  if (!user.email || !allowedEmails.includes(user.email.toLowerCase()) || !user.email_confirmed_at) throw new Error('This account is not authorized for administrator access.');
  const { data, error } = await client.rpc('has_role', { check_user_id: user.id, allowed_roles: ['admin','super_admin'] });
  if (error || !data) throw new Error('Administrator access has not been assigned to this account.');
}

async function enforceServerActionRateLimit(actionName: string, maxCalls = SERVER_ACTION_LIMIT): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in to use this feature.');
  const { data, error } = await supabase.rpc('consume_server_action_rate_limit', {
    p_action: actionName, p_max_calls: maxCalls, p_window_seconds: Math.floor(SERVER_ACTION_WINDOW_MS / 1000),
  });
  if (error) throw error;
  if (!data) throw new Error('Too many requests. Please wait a few minutes and try again.');
}

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
  const { client } = await createSupabaseUserClient(idToken);
  const { error } = await client.rpc('award_manual_leaderboard_points', { p_target_user_id: targetUserId, p_points: points });
  if (error) throw new Error(error.message || 'Points could not be saved.');
}

export async function getPortfolioFeedback(input: GetPortfolioFeedbackInput): Promise<GetPortfolioFeedbackOutput> {
    await enforceServerActionRateLimit('getPortfolioFeedback');
    const { getPortfolioFeedback } = await import('@/ai/flows/portfolio-advisor');
    return getPortfolioFeedback(input);
}

export async function sendContactMessage(payload: { idToken: string; studentId: string; employerName: string; email: string; phone: string; message: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(payload.studentId)) throw new Error('Invalid learner identifier.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.phone.trim().length < 10 || payload.phone.length > 30) throw new Error('Please provide valid contact details.');
  const message = payload.message.trim();
  if (message.length < 20 || message.length > 3000) throw new Error('Message must be between 20 and 3,000 characters.');
  const { client, user } = await createSupabaseUserClient(payload.idToken);
  const { data: membership, error: memberError } = await client.from('organization_members').select('organization_id,member_role')
    .eq('user_id',user.id).eq('status','active').in('member_role',['owner','admin']).limit(1).maybeSingle();
  if (memberError || !membership) throw new Error('An active organization account is required to contact learners.');
  const { data: organization, error: orgError } = await client.from('organizations').select('id,name').eq('id',membership.organization_id).maybeSingle();
  if (orgError || !organization) throw new Error('Your organization could not be verified.');
  const { data: existing, error: readError } = await client.from('conversations').select('content,participant_ids').eq('id',payload.studentId).maybeSingle();
  if (readError) throw readError;
  if (existing?.content?.organizationId && existing.content.organizationId !== organization.id) throw new Error('This learner already has a conversation with another organization.');
  const { data: student } = await client.from('profiles').select('display_name').eq('id',payload.studentId).maybeSingle();
  const now = new Date().toISOString();
  const { error: upsertError } = await client.from('conversations').upsert({
    id: payload.studentId, user_id: payload.studentId, participant_ids: [...new Set([payload.studentId,user.id])],
    content: { ...(existing?.content || {}), studentId: payload.studentId, studentName: student?.display_name || 'Learner',
      employerId: user.id, employerName: user.user_metadata?.display_name || payload.employerName.trim(),
      employerPhotoUrl: user.user_metadata?.avatar_url || '', organizationId: organization.id, organizationName: organization.name,
      employerDetails: { email: payload.email.trim(), phone: payload.phone.trim() }, lastMessageAt: now },
    updated_at: now,
  }, { onConflict: 'id' });
  if (upsertError) throw upsertError;
  const { error: messageError } = await client.from('conversation_messages').insert({
    conversation_id: payload.studentId, user_id: user.id, content: { senderId: user.id, text: message, timestamp: now },
  });
  if (messageError) throw messageError;
}

export async function sendGeneralContactMessage(payload: { name: string; email: string; message: string }) {
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
  if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10 || message.length > 3000) throw new Error('Please provide a valid name, email address, and message.');
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from('contact_messages').insert({ name, email, message, content: { source: 'public_contact_form' } });
  if (error) throw error;
}

export async function saveExamGradeAndCertificate(input: {
  idToken: string; submissionId: string; pointsAwarded: number; feedback: string;
  certificate?: { certificateId: string; studentName: string; courseId: string; courseTitle: string; issuedAt: string };
}): Promise<void> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.submissionId) || !Number.isFinite(input.pointsAwarded) || input.pointsAwarded < 0 || input.feedback.length > 50000) throw new Error('Invalid grade payload.');
  if (input.certificate && (input.certificate.courseId.length > 128 || !/^[A-Za-z0-9_-]{1,128}$/.test(input.certificate.certificateId))) throw new Error('Certificate does not match this submission.');
  const { client } = await createSupabaseUserClient(input.idToken);
  const { error } = await client.rpc('grade_submission_and_issue_certificate', {
    p_submission_id: input.submissionId, p_points: input.pointsAwarded, p_feedback: input.feedback, p_certificate: input.certificate || null,
  });
  if (error) throw new Error(error.message || 'Could not save the grade.');
}

async function requireActiveAdmin(idToken: string, requireSuperAdmin = false) {
  const { client, user } = await createSupabaseUserClient(idToken);
  const { data, error } = await client.rpc('has_role', {
    check_user_id: user.id, allowed_roles: requireSuperAdmin ? ['super_admin'] : ['admin','super_admin'],
  });
  if (error || !data) throw new Error('Administrator access is required.');
  return { ...user, client };
}

export async function getBootcampParticipantCounts(idToken: string): Promise<Record<string, number>> {
  const admin = await requireActiveAdmin(idToken);
  const { data, error } = await admin.client.from('bootcamp_registrations').select('bootcamp_id');
  if (error) throw error;
  return (data || []).reduce((counts: Record<string,number>, row: any) => { counts[row.bootcamp_id] = (counts[row.bootcamp_id] || 0) + 1; return counts; }, {});
}

export async function deleteBootcampAndRegistrations(idToken: string, bootcampId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(bootcampId)) throw new Error('Invalid bootcamp identifier.');
  const admin = await requireActiveAdmin(idToken,true);
  const { error } = await admin.client.from('bootcamps').delete().eq('id',bootcampId);
  if (error) throw error;
}

export async function getBootcampRegistrationStatus(idToken: string, bootcampId: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(bootcampId)) throw new Error('Invalid bootcamp identifier.');
  const { client, user } = await createSupabaseUserClient(idToken);
  const { data, error } = await client.from('bootcamp_registrations').select('id').eq('bootcamp_id',bootcampId).eq('user_id',user.id).maybeSingle();
  if (error) throw error; return Boolean(data);
}

export async function registerFreeBootcamp(idToken: string, bootcampId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(bootcampId)) throw new Error('Invalid bootcamp identifier.');
  const { client, user } = await createSupabaseUserClient(idToken);
  const { data: bootcamp, error } = await client.from('bootcamps').select('id,content').eq('id',bootcampId).eq('is_published',true).maybeSingle();
  if (error || !bootcamp) throw new Error('This bootcamp is no longer available.');
  const content = (bootcamp.content || {}) as Record<string,any>;
  if (!Number.isFinite(Number(content.price || 0)) || Number(content.price || 0) > 0) throw new Error('Paid bootcamp registration is unavailable until verified bootcamp payment processing is enabled.');
  const { error: registrationError } = await client.from('bootcamp_registrations').upsert({ bootcamp_id:bootcampId,user_id:user.id },{ onConflict:'bootcamp_id,user_id' });
  if (registrationError) throw registrationError;
  for (const courseId of Array.isArray(content.courseIds) ? content.courseIds : []) {
    if (typeof courseId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(courseId)) continue;
    const { data: course, error: courseError } = await client.from('courses').select('id,price,is_published').eq('id',courseId).eq('is_published',true).maybeSingle();
    if (courseError) throw courseError;
    if (!course || Number(course.price) > 0) continue;
    const { error } = await client.from('enrollments').upsert({ user_id:user.id,course_id:courseId,progress:0,completed:false,content:{ enrollmentDate:new Date().toISOString(),paymentMethod:'free',completedLessons:[] } },{ onConflict:'user_id,course_id',ignoreDuplicates:true });
    if (error) throw error;
  }
}
