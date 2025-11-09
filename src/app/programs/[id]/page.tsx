
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';
import type { Program, Course, UserCourse } from "@/lib/types";
import { getProgramById, getAllCourses, getUserCourses } from '@/lib/firebase-service';
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight, BookOpen, Layers, CheckCircle, Award, Share2, ArrowLeft } from "lucide-react";
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { slugify } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [program, setProgram] = useState<Program | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgramDetails = async () => {
        setLoading(true);
        try {
            const programData = await getProgramById(params.id);
            if (!programData) {
                notFound();
                return;
            }

            const allCoursesData = await getAllCourses();
            const programCourses = allCoursesData.filter(course =>
                programData.courseIds.includes(course.id)
            );
            
            setProgram(programData);
            setCourses(programCourses);

            if(user) {
                const fetchedUserCourses = await getUserCourses(user.uid);
                setUserCourses(fetchedUserCourses);
            }

        } catch (error) {
            console.error("Failed to fetch program details:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchProgramDetails();
  }, [params.id, user]);
  
  const handleShare = async () => {
    if (!program) return;

    const shareData = {
        title: program.title,
        text: program.description,
        url: `https://www.mandanetwork.co.ke/programs/${program.id}`
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            console.error('Error sharing:', error);
        }
    } else {
        // Fallback for desktop browsers
        navigator.clipboard.writeText(shareData.url);
        toast({
            title: "Link Copied!",
            description: "The program link has been copied to your clipboard.",
        });
    }
  };

  const completedCourseIds = new Set(userCourses.filter(c => c.completed || c.certificateAvailable).map(c => c.courseId));
  const allProgramCoursesCompleted = courses.length > 0 && courses.every(c => completedCourseIds.has(c.id));

  if (loading || authLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen px-4">
            <LoadingAnimation />
        </div>
    )
  }

  if (!program) {
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
                        src={program.certificateImageUrl}
                        alt={program.title}
                        fill
                        className="object-cover"
                        data-ai-hint="certificate background"
                    />
                     <div className="absolute inset-0 bg-black/60"></div>
                </div>
                <div className="container mx-auto px-4 md:px-6 relative text-white text-center">
                    <Badge variant="secondary" className="mb-4">Certificate Program</Badge>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 font-headline leading-tight">
                        {program.title}
                    </h1>
                    <p className="text-lg md:text-xl max-w-3xl mx-auto">
                        {program.description}
                    </p>
                </div>
             </section>
             <div className="container mx-auto px-4 md:px-6 py-12 -mt-16 md:-mt-20 relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <button 
                    onClick={() => router.back()} 
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                    </button>
                    <Button onClick={handleShare} variant="outline" size="sm">
                        <Share2 className="mr-2 h-4 w-4" /> Share Program
                    </Button>
                </div>
                <Card className="max-w-4xl mx-auto shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Layers className="h-6 w-6 text-primary" />
                           Courses in this Program ({courses.length})
                        </CardTitle>
                        <CardDescription>
                            Complete all courses below to earn your certificate for this program.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {courses.map(course => (
                                <div key={course.id}>
                                    <Card className="flex flex-col md:flex-row items-center gap-6 p-4 overflow-hidden">
                                       <Image
                                            src={course.imageUrl}
                                            alt={course.title}
                                            width={200}
                                            height={120}
                                            className="w-full md:w-48 h-auto object-cover rounded-md"
                                        />
                                        <div className="flex-grow">
                                            <h3 className="font-semibold text-lg">{course.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                                                {completedCourseIds.has(course.id) && (
                                                    <Badge variant="secondary" className="flex-shrink-0 bg-green-100 text-green-800">
                                                        <CheckCircle className="h-3 w-3 mr-1"/>
                                                        Completed
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <Button asChild className="w-full md:w-auto flex-shrink-0">
                                            <Link href={`/courses/${slugify(course.title)}`}>
                                                View Course
                                                <ArrowRight className="h-4 w-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </Card>
                                </div>
                            ))}
                             <div className="text-center pt-6">
                                <Button size="lg" disabled={!allProgramCoursesCompleted}>
                                    <Award className="mr-2 h-5 w-5" />
                                    Claim Your Certificate
                                </Button>
                                {!allProgramCoursesCompleted && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Complete all courses in the program to unlock your certificate.
                                    </p>
                                )}
                             </div>
                        </div>
                    </CardContent>
                </Card>
             </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
