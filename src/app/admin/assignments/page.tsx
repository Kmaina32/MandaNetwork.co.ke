
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllSubmissions, getCourseById, getAllCourses } from '@/lib/firebase-service';
import type { Submission, Course } from '@/lib/types';
import { ArrowLeft, Loader2, Star, CheckCircle, Edit, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingAnimation } from '@/components/LoadingAnimation';


type SubmissionWithCourse = Submission & { course?: Course };

function SubmissionsList() {
  const [submissions, setSubmissions] = useState<SubmissionWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const fetchedSubmissions = await getAllSubmissions();

        const submissionsWithCourses = await Promise.all(
          fetchedSubmissions.map(async (sub) => {
            const course = await getCourseById(sub.courseId);
            return { ...sub, course };
          })
        );
        
        setSubmissions(submissionsWithCourses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
      } catch (err) {
        console.error("Failed to fetch data:", err);
        toast({ title: "Error", description: "Failed to load submissions.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [toast]);

  return (
    loading ? (
       <div className="flex justify-center items-center py-10">
          <LoadingAnimation />
       </div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Submitted At</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell className="font-medium">{submission.userName}</TableCell>
              <TableCell>{submission.courseTitle}</TableCell>
              <TableCell>{format(new Date(submission.submittedAt), "PPP p")}</TableCell>
              <TableCell>
                {submission.graded ? (
                    <Badge>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Graded ({submission.pointsAwarded || 0} / {(submission.course?.exam?.reduce((acc, q) => acc + q.maxPoints, 0)) || 10})
                    </Badge>
                ) : (
                    <Badge variant="secondary">Pending Review</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm">
                  <Link href={`/admin/assignments/grade/${submission.id}`}>
                      <Star className="mr-2 h-4 w-4" />
                      {submission.graded ? 'View Grade' : 'Grade Now'}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
           {submissions.length === 0 && (
            <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No submissions found.
                </TableCell>
            </TableRow>
           )}
        </TableBody>
      </Table>
    )
  );
}

function CourseAssignmentsList() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

     const fetchCourses = async () => {
        try {
            setLoading(true);
            const fetchedCourses = await getAllCourses();
            setCourses(fetchedCourses);
        } catch(err) {
             console.error("Failed to fetch courses:", err);
             toast({ title: "Error", description: "Failed to load courses.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCourses();
    }, []);
    
    
    return (
    loading ? (
       <div className="flex justify-center items-center py-10">
          <LoadingAnimation />
       </div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course Title</TableHead>
            <TableHead>Assignment Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id}>
              <TableCell className="font-medium">{course.title}</TableCell>
              <TableCell>
                {course.project ? (
                    <Badge variant="default">Project</Badge>
                ) : course.exam && course.exam.length > 0 ? (
                    <Badge variant="secondary">Exam</Badge>
                ) : (
                    <Badge variant="outline">None</Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/assignments/edit/${course.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit / Create
                    </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
           {courses.length === 0 && (
            <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                    No courses found. Create a course first.
                </TableCell>
            </TableRow>
           )}
        </TableBody>
      </Table>
    )
  );
}


export default function AdminAssignmentsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
             <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
               <ArrowLeft className="h-4 w-4" />
               Back to Admin Dashboard
            </Link>
            <Tabs defaultValue="submissions">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Briefcase className="h-6 w-6"/>Manage Exams & Projects</CardTitle>
                      <CardDescription>Review student submissions and manage final assignments for courses.</CardDescription>
                      <TabsList className="grid w-full grid-cols-2 mt-4">
                        <TabsTrigger value="submissions">Submissions</TabsTrigger>
                        <TabsTrigger value="assignments">Course Assignments</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="submissions">
                        <SubmissionsList />
                    </TabsContent>
                    <TabsContent value="assignments">
                        <CourseAssignmentsList />
                    </TabsContent>
                  </CardContent>
              </Card>
            </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
