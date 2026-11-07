

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ListTodo, Loader2, Edit, Star, Briefcase } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import type { Course, Submission, UserCourse } from '@/lib/types';
import { getUserCourses, getSubmissionsByUserId, getAllCourses } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingAnimation } from '@/components/LoadingAnimation';


type UserCourseWithDetails = UserCourse & Partial<Course>;

function ExamsList() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<UserCourseWithDetails[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [userCoursesData, submissionsData] = await Promise.all([
                    getUserCourses(user.uid),
                    getSubmissionsByUserId(user.uid)
                ]);

                const allCourses = await getAllCourses();
                const courseMap = new Map(allCourses.map(c => [c.id, c]));

                const enrichedCourses = userCoursesData.map(uc => ({
                    ...uc,
                    ...courseMap.get(uc.courseId)
                })).filter(c => c.title && c.exam && c.exam.length > 0);

                setCourses(enrichedCourses);
                setSubmissions(submissionsData);
            } catch (err) {
                console.error("Failed to fetch data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const getSubmissionStatus = (courseId: string) => {
        const submission = submissions.find(s => s.courseId === courseId);
        if (!submission) return <Badge variant="secondary">Not Submitted</Badge>;
        if (submission.graded) {
            const score = submission.pointsAwarded || 0;
            const maxPoints = courses.find(c => c.id === courseId)?.exam?.reduce((acc, q) => acc + q.maxPoints, 0) || 1;
            return <Badge>Graded: {score}/{maxPoints}</Badge>
        }
        return <Badge variant="outline">Submitted for Grading</Badge>
    }

    if(loading) {
        return <div className="flex justify-center items-center py-10"><LoadingAnimation /></div>;
    }

    return (
         <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {courses.map((course) => (
                <TableRow key={course.courseId}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>{getSubmissionStatus(course.courseId)}</TableCell>
                    <TableCell className="text-right">
                    <Button asChild size="sm" disabled={course.progress !== 100}>
                        <Link href={`/courses/${slugify(course.title!)}/exam`}>
                            <Star className="mr-2 h-4 w-4" />
                            {submissions.some(s => s.courseId === course.courseId) ? 'View Exam' : 'Take Exam'}
                        </Link>
                    </Button>
                    </TableCell>
                </TableRow>
                ))}
                {courses.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                            You are not enrolled in any courses with exams.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

export default function MyAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <LoadingAnimation />
        </div>
    );
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
                            <ListTodo className="h-8 w-8 text-secondary-foreground" />
                        </div>
                        <CardTitle className="mt-4 text-2xl font-headline">My Exams</CardTitle>
                        <CardDescription>View and complete your course final exams.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ExamsList />
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
