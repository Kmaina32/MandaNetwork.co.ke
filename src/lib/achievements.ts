
import { db } from './firebase';
import { ref, get, set, update } from 'firebase/database';
import type { RegisteredUser, UserCourse, Submission } from './types';

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string; // Lucide icon name
    unlockedAt: string; // ISO String
}

export const achievementList = {
    FIRST_ENROLLMENT: { name: "First Steps", description: "Enrolled in your first course.", icon: "Footprints" },
    COURSE_COMPLETED: { name: "Course Conqueror", description: "Completed your first course.", icon: "CheckCircle" },
    FIVE_COURSES_COMPLETED: { name: "Serial Learner", description: "Completed 5 courses.", icon: "BookOpenCheck" },
    TOP_PERFORMER: { name: "Top Performer", description: "Scored 90% or higher on an exam.", icon: "Star" },
    HACKATHON_PARTICIPANT: { name: "Competitor", description: "Registered for a hackathon.", icon: "Swords" },
    STREAK_7_DAYS: { name: "Learning Streak", description: "Completed a lesson every day for 7 days.", icon: "Flame" },
};

export type AchievementId = keyof typeof achievementList;

export async function awardAchievement(userId: string, achievementId: AchievementId) {
    const userAchievementsRef = ref(db, `users/${userId}/achievements`);
    const snapshot = await get(userAchievementsRef);
    const existingAchievements = snapshot.val() || {};

    if (!existingAchievements[achievementId]) {
        const achievementData = achievementList[achievementId];
        await update(userAchievementsRef, {
            [achievementId]: {
                ...achievementData,
                id: achievementId,
                unlockedAt: new Date().toISOString()
            }
        });
        // Return the achievement so the client can show a toast
        return { ...achievementData, id: achievementId };
    }
    return null;
}

// === Achievement Check Functions ===

// To be called after a user enrolls in any course for the first time
export async function checkFirstEnrollmentAchievement(userId: string) {
    const userCoursesRef = ref(db, `users/${userId}/purchasedCourses`);
    const snapshot = await get(userCoursesRef);
    if (snapshot.exists() && Object.keys(snapshot.val()).length === 1) {
        return awardAchievement(userId, 'FIRST_ENROLLMENT');
    }
    return null;
}

// To be called after a course's progress reaches 100%
export async function checkCourseCompletionAchievements(userId: string, completedCourseId: string) {
    const userCoursesRef = ref(db, `users/${userId}/purchasedCourses`);
    const snapshot = await get(userCoursesRef);
    if (snapshot.exists()) {
        const userCourses: Record<string, UserCourse> = snapshot.val();
        const completedCourses = Object.values(userCourses).filter(c => c.progress === 100);

        if (completedCourses.length === 1) {
            return awardAchievement(userId, 'COURSE_COMPLETED');
        }
        if (completedCourses.length === 5) {
            return awardAchievement(userId, 'FIVE_COURSES_COMPLETED');
        }
    }
    return null;
}

// To be called after an exam is graded
export async function checkTopPerformerAchievement(userId: string, submission: Submission, courseTotalPoints: number) {
    if (submission.pointsAwarded !== undefined) {
        const score = (submission.pointsAwarded / courseTotalPoints) * 100;
        if (score >= 90) {
            return awardAchievement(userId, 'TOP_PERFORMER');
        }
    }
    return null;
}

// To be called after registering for a hackathon
export async function checkHackathonParticipantAchievement(userId: string) {
    return awardAchievement(userId, 'HACKATHON_PARTICIPANT');
}
