
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getCourseBySlug, createProjectSubmission, getUserProjectSubmissionForCourse } from '@/lib/firebase-service';
import type { Course, ProjectSubmission } from '@/lib/types';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Send, CheckCircle, GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/utils';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const submissionSchema = z.object({
  title: z.string().min(5, 'Project title is required.'),
  description: z.string().min(20, 'Please provide a detailed description of your project.'),
  liveUrl: z.string().url('Please enter a valid live demo URL.'),
  sourceUrl: z.string().url('Please enter a valid GitHub/source code URL.'),
  imageUrl: z.string().url('Please enter a valid image URL for your project thumbnail.'),
});

function ProjectSubmittedView({ submission }: { submission: ProjectSubmission }) {
  return (
      <Card className="text-center">
          <CardHeader>
              <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Project Submitted!</CardTitle>
              <CardDescription>
                  Your project has been received and added to your portfolio. Great work!
              </CardDescription>
          </CardHeader>
          <CardContent>
              <Button asChild>
                 <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
          </CardContent>
      </Card>
  )
}

export default function ProjectSubmissionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [submission, setSubmission] = useState<ProjectSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      title: '',
      description: '',
      liveUrl: '',
      sourceUrl: '',
      imageUrl: 'https://picsum.photos/seed/project/600/400',
    },
  });

  useEffect(() => {
    const fetchCourseAndSubmission = async () => {
      if (!user) return;
      setLoading(true);
      const courseData = await getCourseBySlug(params.id);

      if (!courseData || !courseData.project) {
        notFound();
        return;
      }
      
      setCourse(courseData);
      form.setValue('title', courseData.project.title);
      form.setValue('description', courseData.project.description);

      const existingSubmission = await getUserProjectSubmissionForCourse(user.uid, courseData.id);
      if (existingSubmission) {
          setSubmission(existingSubmission);
      }

      setLoading(false);
    };

    if (!authLoading && user) {
      fetchCourseAndSubmission();
    }
  }, [params.id, user, authLoading, form]);

  const onSubmit = async (data: z.infer<typeof submissionSchema>) => {
    if (!user || !course) return;
    setIsSubmitting(true);
    
    try {
      await createProjectSubmission({
        userId: user.uid,
        courseId: course.id,
        courseTitle: course.title,
        submittedAt: new Date().toISOString(),
        ...data
      });
      toast({
        title: "Project Submitted!",
        description: "Your final project has been submitted successfully.",
      });
      const newSubmission = await getUserProjectSubmissionForCourse(user.uid, course.id);
      setSubmission(newSubmission);
    } catch (error) {
      console.error(error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your project. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen"><LoadingAnimation /></div>;
  }
  
  if (!user) {
    router.push('/login');
    return null;
  }

  if (!course || !course.project) {
    notFound();
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
            <div className="max-w-3xl mx-auto">
              <Link href={`/courses/${slugify(course.title)}/learn`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Course
              </Link>
             
              {submission ? (
                <ProjectSubmittedView submission={submission}/>
              ) : (
                <Card>
                  <CardHeader className="text-center">
                    <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                      <GitBranch className="h-8 w-8 text-secondary-foreground" />
                    </div>
                    <CardTitle className="mt-4 text-2xl font-headline">Final Project Submission</CardTitle>
                    <CardDescription>Submit your work for "{course.title}"</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-6">
                        <AlertTitle>Project Goal</AlertTitle>
                        <AlertDescription>{course.project.description}</AlertDescription>
                    </Alert>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                         <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Project Title</FormLabel> <FormControl> <Input {...field} readOnly disabled /> </FormControl> <FormMessage /> </FormItem> )} />
                         <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Your Project's Description</FormLabel> <FormControl> <Textarea placeholder="Explain what you built and what technologies you used." {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                         <FormField control={form.control} name="liveUrl" render={({ field }) => ( <FormItem> <FormLabel>Live Demo URL</FormLabel> <FormControl> <Input placeholder="https://your-project.vercel.app" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                         <FormField control={form.control} name="sourceUrl" render={({ field }) => ( <FormItem> <FormLabel>Source Code URL</FormLabel> <FormControl> <Input placeholder="https://github.com/your-username/your-repo" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                         <FormField control={form.control} name="imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Project Thumbnail Image URL</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                         
                         <div className="flex justify-end">
                            <Button type="submit" size="lg" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Submit Project
                            </Button>
                         </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

