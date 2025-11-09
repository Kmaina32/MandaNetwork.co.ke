
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';
import type { Bootcamp, Course, UserCourse } from "@/lib/types";
import { getBootcampById, getAllCourses, getUserCourses, enrollUserInCourse, registerUserForBootcamp } from '@/lib/firebase-service';
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight, BookOpen, Layers, CheckCircle, Award, Calendar, Clock, Star } from "lucide-react";
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { slugify } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { PaymentModal } from '@/components/PaymentModal';

export default function BootcampDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [bootcamp, setBootcamp] = useState<Bootcamp | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
        setLoading(true);
        try {
            const bootcampData = await getBootcampById(params.id);
            if (!bootcampData) {
                notFound();
                return;
            }

            const allCoursesData = await getAllCourses();
            const bootcampCourses = allCoursesData.filter(course =>
                bootcampData.courseIds.includes(course.id)
            );
            
            setBootcamp(bootcampData);
            setCourses(bootcampCourses);

            if(user) {
                const fetchedUserCourses = await getUserCourses(user.uid);
                setUserCourses(fetchedUserCourses);
            }

        } catch (error) {
            console.error("Failed to fetch bootcamp details:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchDetails();
  }, [params.id, user]);
  
  const enrolledCourseIds = new Set(userCourses.map(c => c.courseId));
  const isEnrolled = bootcamp?.participants && user?.uid && bootcamp.participants[user.uid];

  const handleEnroll = async (paymentMethod: UserCourse['paymentMethod'] = 'free') => {
      if (!user || !bootcamp) return;
      setIsEnrolling(true);
      try {
        await registerUserForBootcamp(bootcamp.id, user.uid);
        
        toast({ title: 'Enrolled Successfully!', description: `You are now enrolled in the ${bootcamp.title}.`});
        
        // Re-fetch bootcamp to get updated participant list
        const updatedBootcamp = await getBootcampById(params.id);
        setBootcamp(updatedBootcamp);

      } catch (error) {
           toast({ title: 'Enrollment Failed', description: "Could not enroll you in the bootcamp.", variant: 'destructive'});
      } finally {
          setIsEnrolling(false);
          setIsModalOpen(false);
      }
  }


  if (loading || authLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen px-4">
            <div className="flex items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-sm sm:text-base">Loading bootcamp details...</p>
            </div>
        </div>
    )
  }

  if (!bootcamp) {
    notFound();
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow bg-secondary/30">
             <section className="relative py-12 md:py-20">
                <div className="absolute inset-0">
                    <Image
                        src={bootcamp.imageUrl}
                        alt={bootcamp.title}
                        fill
                        className="object-cover"
                        data-ai-hint="tech bootcamp students"
                    />
                     <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="container mx-auto px-4 md:px-6 relative text-white text-center">
                    <Badge variant="secondary" className="mb-4 bg-red-500 text-white border-red-500">Intensive Bootcamp</Badge>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 font-headline leading-tight">
                        {bootcamp.title}
                    </h1>
                    <p className="text-lg md:text-xl max-w-3xl mx-auto">
                        {bootcamp.description}
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-6 text-sm">
                        <div className="flex items-center gap-2"><Clock /><span>{bootcamp.duration}</span></div>
                        <div className="flex items-center gap-2"><Calendar /><span>Starts: {format(new Date(bootcamp.startDate), 'PPP')}</span></div>
                        <div className="flex items-center gap-2"><Layers /><span>{courses.length} Courses</span></div>
                    </div>
                </div>
             </section>
             <div className="container mx-auto px-4 md:px-6 py-12 -mt-16 md:-mt-20 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Card className="shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                <Star className="h-6 w-6 text-primary" />
                                Bootcamp Curriculum
                                </CardTitle>
                                <CardDescription>
                                    Completing this bootcamp grants access to all courses listed below.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {courses.map(course => (
                                        <Card key={course.id} className="flex flex-col md:flex-row items-center gap-4 p-4 overflow-hidden">
                                            <div className="flex-grow">
                                                <h3 className="font-semibold">{course.title}</h3>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                    <span>{course.instructor}</span>
                                                    <span>&bull;</span>
                                                    <span>{course.duration}</span>
                                                </div>
                                            </div>
                                            {enrolledCourseIds.has(course.id) && (
                                                <Badge variant="secondary" className="flex-shrink-0 bg-green-100 text-green-800">
                                                    <CheckCircle className="h-3 w-3 mr-1"/>
                                                    Enrolled
                                                </Badge>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                     <div className="lg:col-span-1">
                        <Card className="sticky top-24 shadow-xl">
                            <CardHeader>
                                <p className="text-3xl font-bold text-primary mb-2">
                                    {bootcamp.price > 0 ? `Ksh ${bootcamp.price.toLocaleString()}` : 'Free'}
                                </p>
                                <CardDescription>Full price for the entire bootcamp curriculum and support.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isEnrolled ? (
                                    <Button size="lg" className="w-full" asChild>
                                        <Link href="/dashboard">Go to Dashboard</Link>
                                    </Button>
                                ) : (
                                    <Button size="lg" className="w-full" onClick={() => bootcamp.price > 0 ? setIsModalOpen(true) : handleEnroll('free')} disabled={isEnrolling}>
                                        {isEnrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Award className="mr-2 h-5 w-5" />}
                                        Enroll Now
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
             </div>
        </main>
        {bootcamp.price > 0 && (
            <PaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                itemId={bootcamp.id}
                itemName={bootcamp.title}
                price={bootcamp.price}
                onPaymentSuccess={handleEnroll}
            />
        )}
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
