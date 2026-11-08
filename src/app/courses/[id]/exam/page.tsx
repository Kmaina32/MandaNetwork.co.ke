
'use client';

import { useState, useEffect, useMemo } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { getCourseById, createSubmission, getUserSubmissionsForCourse, getAllCourses } from '@/lib/firebase-service';
import type { Course, ExamQuestion, Submission } from '@/lib/mock-data';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Send, CheckCircle, ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/utils';
import { FeedbackForm, FeedbackSubmitted } from '@/components/FeedbackForm';
import { LoadingAnimation } from '@/components/LoadingAnimation';

const createAnswerSchema = (questionType: 'multiple-choice' | 'short-answer') => {
  if (questionType === 'multiple-choice') {
    return z.object({
      questionId: z.string(),
      answer: z.coerce.number({ invalid_type_error: 'Please select an option.' }),
    });
  }
  return z.object({
    questionId: z.string(),
    answer: z.string().min(10, 'Your answer must be at least 10 characters long.'),
  });
};

const createFormSchema = (exam: ExamQuestion[]) => {
  const shape: Record<string, z.ZodSchema<any>> = {};
  exam.forEach(q => {
    shape[q.id] = createAnswerSchema(q.type);
  });
  return z.object({ answers: z.object(shape) });
};


function ExamSubmittedView({ submission }: { submission: Submission }) {
  return (
      <Card className="text-center">
          <CardHeader>
              <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Exam Submitted!</CardTitle>
              <CardDescription>
                  Your answers have been received. Your submission is now awaiting review from an instructor.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <p className="text-sm text-muted-foreground">You can check the status of your submission on your assignments page.</p>
              <Button asChild className="mt-4">
                 <Link href="/assignments">View My Exams</Link>
              </Button>
          </CardContent>
      </Card>
  )
}

export default function ExamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically create the form schema based on the fetched exam
  const formSchema = useMemo(() => {
    if (!course?.exam) {
      return z.object({ answers: z.object({}) });
    }
    return createFormSchema(course.exam);
  }, [course]);

  type ExamFormValues = z.infer<typeof formSchema>;

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    let cancelled = false;
    const fetchCourseAndSubmission = async () => {
      if (!user) return;
      setLoading(true);
      setCourse(null);
      setSubmission(null);
      try {
        const allCourses = await getAllCourses();
        const courseData = allCourses.find(c => slugify(c.title) === params.id);
        if (!courseData) {
          if (!cancelled) notFound();
          return;
        }
        const userSubmissions = await getUserSubmissionsForCourse(user.uid, courseData.id);
        if (cancelled) return;
        setCourse(courseData);
        setSubmission(userSubmissions[0] || null);
      } catch (error) {
        console.error('Failed to load exam data', error);
        if (!cancelled) {
          toast({ title: 'Unable to load exam', description: 'Check your connection and retry the page.', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (!authLoading && user) fetchCourseAndSubmission();
    return () => { cancelled = true; };
  }, [params.id, user, authLoading, toast]);

  const onSubmit = async (data: ExamFormValues) => {
    if (!user || !course) return;
    setIsSubmitting(true);
    
  const answersArray = Object.entries(data.answers).map(([questionId, value]) => ({
    questionId,
    answer: (value as { answer: any }).answer,
  }));

    try {
      await createSubmission({
        userId: user.uid,
        userName: user.displayName || 'Anonymous User',
        userEmail: user.email || '',
        courseId: course.id,
        courseTitle: course.title,
        answers: answersArray,
        submittedAt: new Date().toISOString(),
        graded: false,
      });
      toast({
        title: "Submission Successful",
        description: "Your exam has been submitted for grading.",
      });
      // Refetch submission to show the submitted view
       const userSubmissions = await getUserSubmissionsForCourse(user.uid, course.id);
       setSubmission(userSubmissions[0]);
    } catch (error) {
      console.error(error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your exam. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSuccess = () => {
    router.push('/dashboard');
  }

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen"><LoadingAnimation /></div>;
  }
  
  if (!user) {
    router.push('/login');
    return null;
  }

  if (!course) {
    notFound();
    return null;
  }
  
  const hasFeedbackBeenSubmitted = submission?.graded;
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
            <div className="max-w-3xl mx-auto">
              {submission?.graded ? null : (
                 <Link href={`/courses/${slugify(course.title)}/learn`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Course
                 </Link>
              )}
             
              {submission?.graded ? (
                <FeedbackForm course={course} onSuccess={handleFeedbackSuccess} />
              ) : submission ? (
                <ExamSubmittedView submission={submission}/>
              ) : (
                <Card>
                  <CardHeader className="text-center">
                      <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                          <ListTodo className="h-8 w-8 text-secondary-foreground" />
                      </div>
                      <CardTitle className="mt-4 text-2xl font-headline">Final Exam: {course.title}</CardTitle>
                      <CardDescription>
                          Complete the following questions to the best of your ability.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {course.exam.map((q, index) => (
                          <Card key={q.id} className="p-6">
                            <FormLabel className="text-base font-semibold">{index + 1}. {q.question}</FormLabel>
                             <div className="mt-4">
{q.type === 'multiple-choice' && q.options ? (
  <FormField
    control={form.control}
    name={`answers.${q.id}.answer` as any}
    render={({ field }) => (
      <FormItem className="space-y-3">
        <FormControl>
          <RadioGroup
            onValueChange={(val) => field.onChange(parseInt(val, 10))}
            defaultValue={String((field.value as number) ?? '')}
            className="flex flex-col space-y-2"
          >
            {q.options?.map((option, i) => (
              <FormItem key={i} className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value={String(i)} />
                </FormControl>
                <FormLabel className="font-normal">{option}</FormLabel>
              </FormItem>
            ))}
          </RadioGroup>
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
) : (
  <FormField
    control={form.control}
    name={`answers.${q.id}.answer` as any}
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <Textarea
            placeholder="Type your detailed answer here..."
            className="min-h-[120px]"
            {...field}
            value={(field.value as string) || ''}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)}
                            </div>
                          </Card>
                        ))}
                         <div className="flex justify-end">
                            <Button type="submit" size="lg" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Submit Exam
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
