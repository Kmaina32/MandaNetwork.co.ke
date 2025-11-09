

import { z } from 'zod';
import type { Metadata as NextMetadata } from 'next';

export type Metadata = NextMetadata;

export interface YoutubeLink {
  title: string;
  url: string;
}

export interface GoogleDriveLink {
  title: string;
  url: string;
}

export interface Lesson {
  id: string;
  title:string;
  duration: string;
  content: string;
  youtubeLinks?: YoutubeLink[];
  googleDriveLinks?: GoogleDriveLink[];
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface ExamQuestion {
    id: string;
    type: 'multiple-choice' | 'short-answer';
    question: string;
    options?: string[];
    correctAnswer?: number;
    referenceAnswer?: string;
    maxPoints: number;
}

export interface ShortAnswerQuestion extends ExamQuestion {
    type: 'short-answer';
    referenceAnswer: string;
}


export interface Submission {
    id: string;
    courseId: string;
    userId: string;
    userName: string;
    userEmail: string;
    courseTitle: string;
    submittedAt: string; // ISO String
    answers: { questionId: string; answer: string | number }[];
    graded: boolean;
    pointsAwarded?: number;
    grade?: number;
    feedback?: string;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
}

export interface PortfolioProject {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    liveUrl?: string;
    sourceUrl?: string;
    technologies: string[];
}

export interface Course {
  id: string;
  title: string;
  instructor: string;
  category: string;
  description: string;
  longDescription: string;
  price: number;
  imageUrl: string;
  duration: string; // e.g., "5 Weeks"
  dripFeed: 'daily' | 'weekly' | 'off';
  modules: Module[];
  exam: ExamQuestion[];
  createdAt: string; // ISO string
  project?: PortfolioProject;
  prerequisiteCourseId?: string;
  discussionPrompt?: string;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  courseIds: string[];
  certificateImageUrl: string;
}

export interface Bundle {
  id: string;
  title: string;
  description: string;
  price: number;
  courseIds: string[];
  imageUrl: string;
}

export interface Bootcamp {
  id: string;
  title: string;
  description: string;
  price: number;
  courseIds: string[];
  imageUrl: string;
  duration: string;
  startDate: string; // ISO String
  participants?: Record<string, boolean>;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  author: string;
  category: string;
  content: string;
  isPublished: boolean;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}


export const user = {
    name: 'Jomo Kenyatta',
    purchasedCourses: [
        { courseId: 'digital-marketing-101', progress: 50, completed: false, certificateAvailable: false, completedLessons: [], enrollmentDate: '2024-01-01T12:00:00.000Z' },
        { courseId: 'graphic-design-canva', progress: 100, completed: true, certificateAvailable: true, completedLessons: [], enrollmentDate: '2024-0-01T12:00:00.000Z' }
    ]
}

export interface UserCourse {
    courseId: string;
    progress: number;
    completed: boolean;
    certificateAvailable: boolean;
    certificateId?: string;
    enrollmentDate: string; // ISO String
    completedLessons?: string[];
    feedbackSubmitted?: boolean;
    paymentMethod?: 'mpesa' | 'card' | 'paypal' | 'free' | 'crypto';
}

export type TutorMessage = {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  suggestions?: string[];
};

export interface Notification {
    id: string;
    title: string;
    body: any; // Can be a string or a structured object
    link?: string;
    createdAt: string;
    cohort?: string;
    userId?: string; // For targeted notifications
    archived?: boolean;
    read?: boolean;
    actions?: Array<{
        title: string;
        action: 'accept_org_invite';
        payload: {
            inviteId: string;
            organizationId: string;
        };
    }>
}

export interface DiscussionReply {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    createdAt: string; // ISO String
}

export interface DiscussionThread {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    createdAt: string; // ISO String
    replies?: DiscussionReply[];
}

export interface LiveSession {
    isActive: boolean;
    streamData: any; // This would hold the WebRTC signaling data
    title: string;
    description?: string;
    speakers?: string;
    target: 'all' | 'cohort' | 'students';
    cohort?: string;
    studentIds?: string[];
}

export interface UserContent {
    id: string;
    type: 'course' | 'program' | 'bundle';
    title: string;
    description: string;
    status: 'draft' | 'published';
}

export const ContentStrategyOutputSchema = z.object({
  coursesCreated: z.number(),
  programTitle: z.string(),
  bundleTitle: z.string(),
});
export type ContentStrategyOutput = z.infer<typeof ContentStrategyOutputSchema>;

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    createdAt: string; // ISO String
    userId: string;
}

export interface WorkExperience {
    id: string;
    jobTitle: string;
    companyName: string;
    startDate: string;
    endDate: string;
    description?: string;
}

export interface Education {
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationYear: string;
}

export interface Portfolio {
    aboutMe?: string;
    phone?: string;
    address?: {
        poBox?: string;
        country?: string;
    };
    socialLinks?: {
        github?: string;
        gitlab?: string;
        bitbucket?: string;
    };
    public?: boolean;
    projects?: PortfolioProject[];
    workExperience?: WorkExperience[];
    education?: Education[];
}

export interface LearningGoal {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt: string;
}

export interface CourseFeedback {
    id: string;
    courseId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
}

export interface ProjectSubmission {
    id: string;
    courseId: string;
    userId: string;
    title: string;
    description: string;
    liveUrl: string;
    sourceUrl: string;
    imageUrl: string;
    submittedAt: string;
}

export interface Organization {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string; // ISO String
    subscriptionTier: 'trial' | 'basic' | 'pro';
    subscriptionExpiresAt: string | null;
    memberLimit: number;
    logoUrl?: string;
    welcomeMessage?: string;
}


export interface RegisteredUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    createdAt?: string; // ISO String
    slug?: string;
    cohort?: string;
    purchasedCourses?: Record<string, Omit<UserCourse, 'courseId'>>;
    plan?: 'free' | 'basic' | 'pro';
    apiCallCount?: number;
    isAdmin?: boolean;
    isOrganizationAdmin?: boolean;
    organizationId?: string;
    adminExpiresAt?: string | null;
    isOnline?: boolean;
    lastSeen?: string | number;
    portfolio?: Portfolio;
    learningGoals?: Record<string, LearningGoal>;
    achievements?: Record<string, Achievement>;
    photoURL?: string;
    affiliateId?: string;
}

export interface PermissionRequest {
    id: string;
    requesterId: string;
    requesterName: string;
    action: 'delete_course' | 'delete_program' | 'delete_bundle' | 'create_bootcamp';
    itemId: string;
    itemName: string;
    itemData?: any;
    status: 'pending' | 'approved' | 'denied';
    createdAt: string; // ISO String
    resolvedAt?: string; // ISO String
}

export interface Invitation {
    id: string;
    email: string;
    organizationId: string;
    organizationName: string;
    status: 'pending' | 'accepted';
    createdAt: string; // ISO String
    userId?: string; // Added to link to the user being invited
}

export interface PricingPlan {
    id: string;
    name: string;
    price: number;
    priceDetail: string; // e.g., 'per user / month'
    features: string[];
    isPrimary: boolean; // For highlighting a recommended plan
}


// Payment Input Types
export interface CardPaymentInput {
    itemId: string;
    itemName: string;
    amount: number;
}

export interface PayPalPaymentInput {
    itemId: string;
    itemName: string;
    amount: number;
}

export interface Hackathon {
  id: string;
  title: string;
  description: string;
  prizeMoney: number;
  entryFee: number;
  startDate: string; // ISO String
  endDate: string; // ISO String
  imageUrl: string;
  externalUrl?: string;
  participants?: Record<string, boolean>;
}

export interface HackathonSubmission {
  id: string;
  hackathonId: string;
  hackathonTitle: string;
  userId: string;
  userName: string;
  projectName: string;
  githubUrl: string;
  liveUrl: string;
  description: string;
  submittedAt: string; // ISO String
}

export interface LeaderboardEntry {
    userId: string;
    userName: string;
    userAvatar: string;
    score: number;
    hackathonCount: number;
}

export interface Advertisement {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    ctaText: string;
    ctaLink: string;
    isActive: boolean;
}

export interface UserActivity {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    type: 'signup' | 'enrollment' | 'page_visit';
    details: any;
    timestamp: string; // ISO string;
    path: string;
}

export interface ConversationMessage {
    senderId: string;
    text: string;
    timestamp: string;
}

export interface ConversationParticipant {
    name: string;
    photoURL: string;
}

export interface Conversation {
    id: string;
    participants: Record<string, ConversationParticipant>;
    lastMessage: ConversationMessage;
    updatedAt: string;
    readBy?: Record<string, boolean>;
    messages?: Record<string, ConversationMessage>;
}


