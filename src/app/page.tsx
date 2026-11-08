import { adminDb } from "@/lib/firebase-admin";
import type { Course } from "@/lib/mock-data";
import { HomeLandingClient } from "@/components/HomeLandingClient";

export const dynamic = "force-dynamic";

async function getPublicCourses(): Promise<{ courses: Course[]; error: string | null }> {
  try {
    const snapshot = await adminDb.ref("courses").get();
    if (!snapshot.exists()) return { courses: [], error: null };
    const courses = Object.entries(snapshot.val()).map(([id, course]) => ({
      id,
      ...(course as Omit<Course, "id">),
    }));
    return { courses, error: null };
  } catch (error) {
    console.error("Failed to load public courses:", error);
    return { courses: [], error: "We couldn't load the course catalogue. Please refresh to try again." };
  }
}

export default async function Home() {
  const { courses, error } = await getPublicCourses();
  return <HomeLandingClient initialCourses={courses} initialError={error} />;
}
