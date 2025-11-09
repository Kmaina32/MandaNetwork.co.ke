
'use client'

import { useState, useEffect } from 'react';
import { notFound, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';
import type { Course, UserCourse } from "@/lib/mock-data";
import { getCourseBySlug, enrollUserInCourse, getUserCourses, getAllCourses } from '@/lib/firebase-service';
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { PlayCircle, CheckCircle, Award, Loader2, ArrowLeft, BookOpen, Clock, Check, AlertCircle } from "lucide-react";
import { PaymentModal } from '@/components/PaymentModal';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/utils';
import Head from 'next/head';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { checkFirstEnrollmentAchievement } from '@/lib/achievements';

function PurchaseCard({ 
    course, 
    onEnrollFree, 
    onPurchase, 
    isEnrolling, 
    isEnrolled,
    prerequisite,
    prerequisiteMet
}: { 
    course: Course, 
    onEnrollFree: () => void, 
    onPurchase: () => void, 
    isEnrolling: boolean, 
    isEnrolled: boolean,
    prerequisite: Course | null,
    prerequisiteMet: boolean
}) {

    const isActionDisabled = isEnrolling || (!!prerequisite && !prerequisiteMet);
    
    return (
        <Card className="w-full overflow-hidden">
            <CardHeader className="p-0">
                <Image
                  src={course.imageUrl}
                  alt={course.title}
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover rounded-t-lg"
                  data-ai-hint="online course"
                />
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
                <p className="text-2xl sm:text-3xl font-bold text-primary mb-4 break-words overflow-wrap-anywhere">
                {course.price > 0 ? `Ksh ${course.price.toLocaleString()}` : 'Free'}
                </p>

                {isEnrolled ? (
                    <div className="space-y-2">
                        <Button size="lg" className="w-full text-sm" disabled>
                           <Check className="mr-2 h-4 w-4 flex-shrink-0"/> Enrolled
                        </Button>
                         <Button size="lg" variant="outline" asChild className="w-full text-sm">
                           <Link href={`/courses/${slugify(course.title)}/learn`}>Go to Course</Link>
                        </Button>
                    </div>
                ) : course.price > 0 ? (
                <>
                    <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm" onClick={onPurchase} disabled={isActionDisabled}>
                        Purchase Course
                    </Button>
                </>
                ) : (
                    <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm" onClick={onEnrollFree} disabled={isActionDisabled}>
                    {isEnrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" /> : <BookOpen className="mr-2 h-4 w-4 flex-shrink-0"/>}
                    {isEnrolling ? 'Enrolling...' : 'Enroll for Free'}
                </Button>
                )}

                {prerequisite && !prerequisiteMet && (
                     <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Prerequisite Required</AlertTitle>
                        <AlertDescription>
                           You must complete "<Link href={`/courses/${slugify(prerequisite.title)}`} className="underline font-semibold">{prerequisite.title}</Link>" before enrolling in this course.
                        </AlertDescription>
                    </Alert>
                )}
                
                <Separator className="my-4" />
                <h3 className="font-semibold mb-2 font-headline text-sm sm:text-base">This course includes:</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="break-words overflow-wrap-anywhere">{course.duration} to complete</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="break-words">Drip-fed video lessons</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="break-words">Final exam</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="break-words">Certificate of completion</span>
                    </li>
                </ul>
            </CardContent>
        </Card>
    )
}

function CourseSchema({ course }: { course: Course }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.longDescription,
    "provider": {
      "@type": "Organization",
      "name": "Manda Network",
      "sameAs": "https://mkenya-skilled.vercel.app"
    },
    "courseCode": course.category,
    "educationalCredentialAwarded": "Certificate of Completion",
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "instructor": {
        "@type": "Person",
        "name": course.instructor
      }
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}


export default function CourseDetailPage() {
  const params = useParams<{ id: string }>(); // This 'id' is now the slug
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [prerequisite, setPrerequisite] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [prerequisiteMet, setPrerequisiteMet] = useState(false);


   useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchCourseAndProgress = async () => {
        if (!user) return;
        setLoading(true);
        
        const courseSlug = params.id;
        const fetchedCourse = await getCourseBySlug(courseSlug);
        
        if (!fetchedCourse) {
            notFound();
            return;
        }

        const [userCourses, allCourses] = await Promise.all([
          getUserCourses(user.uid),
          getAllCourses()
        ]);
        
        if(userCourses.some(c => c.courseId === fetchedCourse.id)) {
            setIsEnrolled(true);
        }

        setCourse(fetchedCourse);

        // Check for prerequisite
        if (fetchedCourse.prerequisiteCourseId) {
            const prereqCourse = allCourses.find(c => c.id === fetchedCourse.prerequisiteCourseId);
            setPrerequisite(prereqCourse || null);
            const userHasCompletedPrereq = userCourses.some(c => c.courseId === fetchedCourse.prerequisiteCourseId && c.completed);
            setPrerequisiteMet(userHasCompletedPrereq);
        } else {
            setPrerequisite(null);
            setPrerequisiteMet(true); // No prerequisite, so it's met
        }

        setLoading(false);
    }
    if (user) {
      fetchCourseAndProgress();
    }
  }, [params.id, user]);


  if (loading || authLoading || !user) {
    return (
        <div className="flex justify-center items-center min-h-screen px-4">
            <LoadingAnimation />
        </div>
    )
  }

  if (!course) {
    notFound();
  }
  
  const handlePaymentSuccess = async (paymentMethod: UserCourse['paymentMethod']) => {
    if (!user) return;
    try {
      await enrollUserInCourse(user.uid, course.id, paymentMethod);
      const achievement = await checkFirstEnrollmentAchievement(user.uid);
      if (achievement) {
          toast({ title: "Achievement Unlocked!", description: `${achievement.name}: ${achievement.description}` });
      } else {
          toast({ title: 'Payment Successful!', description: `You have successfully enrolled in ${course.title}.` });
      }
      setIsEnrolled(true);
      setIsModalOpen(false);
    } catch(error) {
       toast({ title: 'Enrollment Failed', description: 'Your payment was successful, but we failed to enroll you in the course. Please contact support.', variant: 'destructive'});
    }
  }

  const handleEnrollFree = async () => {
    if (!user) {
        toast({ title: 'Not Logged In', description: 'You must be logged in to enroll.', variant: 'destructive' });
        router.push('/login');
        return;
    }
    setIsEnrolling(true);
    try {
      await enrollUserInCourse(user.uid, course.id, 'free');
      const achievement = await checkFirstEnrollmentAchievement(user.uid);
       if (achievement) {
          toast({ title: "Achievement Unlocked!", description: `${achievement.name}: ${achievement.description}` });
      } else {
          toast({ title: 'Enrolled!', description: `You have successfully enrolled in ${course.title}.` });
      }
      setIsEnrolled(true);
    } catch(error) {
      console.error("Free enrollment failed", error);
      toast({ title: 'Error', description: 'Something went wrong during enrollment.', variant: 'destructive'});
    } finally {
      setIsEnrolling(false);
    }
  }

  return (
    <>
    <Head>
        <title>{`${course.title} | Manda Network`}</title>
        <meta name="description" content={course.description} />
        {course && <CourseSchema course={course} />}
    </Head>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow py-8 sm:py-12 md:py-16 overflow-x-hidden">
          <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
            <button 
              onClick={() => router.back()} 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6"
            >
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Back</span>
            </button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 xl:gap-12">
              <div className="lg:col-span-2 min-w-0">
                <Badge variant="secondary" className="mb-2 text-xs sm:text-sm break-words max-w-full">
                  {course.instructor}
                </Badge>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 font-headline break-words overflow-wrap-anywhere leading-tight">
                  {course.title}
                </h1>
                
                {/* Purchase Card for Mobile View */}
                <div className="lg:hidden mb-6 sm:mb-8">
                    <PurchaseCard 
                      course={course} 
                      onEnrollFree={handleEnrollFree} 
                      onPurchase={() => setIsModalOpen(true)} 
                      isEnrolling={isEnrolling} 
                      isEnrolled={isEnrolled}
                      prerequisite={prerequisite}
                      prerequisiteMet={prerequisiteMet}
                    />
                </div>

                <h2 className="text-xl sm:text-2xl font-bold mb-4 font-headline">Course Description</h2>
                <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mb-6 break-words overflow-wrap-anywhere leading-relaxed">
                  {course.longDescription}
                </p>
                
                <h2 className="text-xl sm:text-2xl font-bold mb-4 font-headline">Course Content</h2>
                <Accordion type="single" collapsible className="w-full">
                  {course.modules && course.modules.map((module) => (
                    <AccordionItem value={module.id} key={module.id}>
                      <AccordionTrigger className="text-base sm:text-lg font-semibold break-words overflow-wrap-anywhere text-left pr-2">
                        {module.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-3 p-2 sm:p-4">
                          {module.lessons.map((lesson) => (
                            <li key={lesson.id} className="flex items-start sm:items-center justify-between gap-2">
                              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                                <span className="text-sm sm:text-base break-words overflow-wrap-anywhere">
                                  {lesson.title}
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 whitespace-nowrap">
                                {lesson.duration}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                  {(!course.modules || course.modules.length === 0) && 
                    <p className="text-muted-foreground p-4 text-sm sm:text-base">Course content coming soon!</p>
                  }
                  <AccordionItem value="exam">
                      <AccordionTrigger className="text-base sm:text-lg font-semibold text-left pr-2">
                        Final Exam
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex items-center gap-3 p-2 sm:p-4">
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm sm:text-base break-words">
                              Test your knowledge to earn your certificate.
                            </span>
                        </div>
                      </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              
              {/* Purchase Card for Desktop View */}
              <div className="lg:col-span-1 hidden lg:block">
                <div className="sticky top-24">
                  <PurchaseCard 
                    course={course} 
                    onEnrollFree={handleEnrollFree} 
                    onPurchase={() => setIsModalOpen(true)} 
                    isEnrolling={isEnrolling} 
                    isEnrolled={isEnrolled}
                    prerequisite={prerequisite}
                    prerequisiteMet={prerequisiteMet}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
        {course.price > 0 && (
            <PaymentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            itemId={course.id}
            itemName={course.title}
            price={course.price}
            onPaymentSuccess={handlePaymentSuccess}
            />
        )}
        <Footer />
      </SidebarInset>
    </SidebarProvider>
    </>
  );
}
