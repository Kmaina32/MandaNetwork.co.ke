
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Notebook, Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import type { UserCourse, Course } from '@/lib/types';
import { getUserCourses, getAllCourses } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';

type EnrolledCourse = UserCourse & Partial<Course>;

export default function NotebooksListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchCourses = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const userCourses = await getUserCourses(user.uid);
        const allCourses = await getAllCourses();
        const courseMap = new Map(allCourses.map(c => [c.id, c]));
        
        const enrolledCourses = userCourses.map(uc => ({
            ...uc,
            ...courseMap.get(uc.courseId)
        })).filter(c => c.title); // Filter out courses that couldn't be fetched

        if (active) setCourses(enrolledCourses);
      } catch (err) {
        console.error("Failed to fetch notebook courses:", err);
        if (active) setError('Your enrolled courses could not be loaded. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (!authLoading) {
      if (user) {
        fetchCourses();
      } else {
        router.push('/login');
      }
    }
    return () => { active = false; };
  }, [user, authLoading, router, retryKey]);
  
  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
     <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                            <Notebook className="h-8 w-8 text-secondary-foreground" />
                        </div>
                        <CardTitle className="mt-4 text-2xl font-headline">My Notebooks</CardTitle>
                        <CardDescription>Select a course to view or edit your notes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {error ? (
                        <div role="alert" className="py-8 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" onClick={() => setRetryKey(value => value + 1)} variant="outline">Try again</Button></div>
                      ) : courses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses.map((course) => (
                                <Link key={course.courseId} href={`/notebook/${course.courseId}`} passHref>
                                    <Card className="hover:bg-secondary/50 transition-colors h-full">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{course.title}</CardTitle>
                                            <CardDescription>Click to open your notebook for this course.</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-10">
                          <p>You are not enrolled in any courses. Enroll in a course to start taking notes.</p>
                           <Button asChild className="mt-4">
                               <Link href="/">Explore Courses</Link>
                           </Button>
                        </div>
                      )}
                    </CardContent>
                </Card>
            </div>
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
