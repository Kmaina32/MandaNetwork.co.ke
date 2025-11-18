
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import type { Course, Lesson, TutorSettings } from '@/lib/types';
import { getCourseById, updateUserCourseProgress, getUserCourses, getTutorSettings, getAllCourses } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { CheckCircle, Lock, ArrowLeft, Menu } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { isWeekend, differenceInDays, differenceInWeeks } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { slugify } from '@/lib/utils';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { NotebookSheet } from '@/components/NotebookSheet';
import { checkCourseCompletionAchievements } from '@/lib/achievements';
import { CourseOutline } from '@/components/CourseOutline';
import { AiTutor } from '@/components/AiTutor';
import { CoursePlayerTabs } from '@/components/CoursePlayerTabs';

export default function CoursePlayerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>(); // This is now a slug
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [tutorSettings, setTutorSettings] = useState<TutorSettings | null>(null);
  
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [unlockedLessonsCount, setUnlockedLessonsCount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  useEffect(() => {
     if (!authLoading && !user) {
        router.push('/login');
     }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchCourseAndProgress = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const allCourses = await getAllCourses();
            const courseSlug = params.id;
            const fetchedCourse = allCourses.find(c => slugify(c.title) === courseSlug);
            
            if (!fetchedCourse) {
                notFound();
                return;
            }
            
            const [fetchedTutorSettings, userCourses] = await Promise.all([
                getTutorSettings(),
                getUserCourses(user.uid)
            ]);
            
            setCourse(fetchedCourse);
            setTutorSettings(fetchedTutorSettings);

            const lessons = fetchedCourse.modules?.flatMap(m => m.lessons) || [];
            setAllLessons(lessons);

            const currentUserCourse = userCourses.find(c => c.courseId === fetchedCourse.id);
            const enrolledDate = currentUserCourse?.enrollmentDate;
            
            if (currentUserCourse?.completedLessons) {
                setCompletedLessons(new Set(currentUserCourse.completedLessons));
            }
            
            if (enrolledDate && fetchedCourse.dripFeed !== 'off') {
                const enrollmentDate = new Date(enrolledDate);
                const today = new Date();
                let unlockedLessons = 0;

                if (fetchedCourse.dripFeed === 'daily') {
                    unlockedLessons = getWeekdayCount(enrollmentDate, today);
                } else if (fetchedCourse.dripFeed === 'weekly') {
                    unlockedLessons = differenceInWeeks(today, enrollmentDate) + 1;
                }
                setUnlockedLessonsCount(Math.min(unlockedLessons, lessons.length));
            } else {
                setUnlockedLessonsCount(lessons.length);
            }
            
            if (lessons.length > 0) {
                const firstIncompleteLessonIndex = lessons.findIndex(l => !currentUserCourse?.completedLessons?.includes(l.id));
                const lessonToShow = firstIncompleteLessonIndex !== -1 ? lessons[firstIncompleteLessonIndex] : lessons[0];
                setCurrentLesson(lessonToShow);
            }
        } catch (error) {
            console.error("Failed to load course data", error);
            toast({ title: "Error", description: "Could not load course data.", variant: "destructive"});
        } finally {
            setLoading(false);
        }
    }
    if (user) {
      fetchCourseAndProgress();
    }
  }, [params.id, user, toast]);
  

  const handleLessonClick = (lesson: Lesson, index: number) => {
      if(index < unlockedLessonsCount) {
          setCurrentLesson(lesson);
          if (isMobile) {
            setIsSheetOpen(false);
          }
      } else {
          toast({
              title: "Lesson Locked",
              description: "This lesson will be available soon. Keep up the great work!",
              variant: "default"
          })
      }
  }

  const handleExamClick = () => {
    if (!course) return;
    router.push(`/courses/${slugify(course.title)}/exam`);
    if (isMobile) {
        setIsSheetOpen(false);
    }
  }

  const handleCompleteLesson = async () => {
    if (!currentLesson || !user || !course) return;

    const newCompleted = new Set(completedLessons);
    newCompleted.add(currentLesson.id);
    setCompletedLessons(newCompleted);

    const newProgress = (newCompleted.size / allLessons.length) * 100;

    await updateUserCourseProgress(user.uid, course.id, {
        completedLessons: Array.from(newCompleted),
        progress: Math.round(newProgress),
        completed: newProgress === 100
    });

    if (newProgress === 100) {
        const achievement = await checkCourseCompletionAchievements(user.uid, course.id);
        if (achievement) {
            toast({
                title: 'Achievement Unlocked!',
                description: `${achievement.name}: ${achievement.description}`
            });
        }
    }

    const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
    const nextLessonIndex = currentIndex + 1;

    if(nextLessonIndex < allLessons.length) {
        if (nextLessonIndex < unlockedLessonsCount) {
             setCurrentLesson(allLessons[nextLessonIndex]);
        } else {
            toast({
                title: "Great job for today!",
                description: "You've completed all available lessons. The next lesson will unlock tomorrow.",
            });
        }
    } else {
        toast({
            title: "Course Section Complete!",
            description: "You've finished all the lessons. Time for the final exam!",
        });
        setCurrentLesson(null);
    }
  };

  const progress = allLessons.length > 0 ? (completedLessons.size / allLessons.length) * 100 : 0;

  if (loading || authLoading) {
    return (
        <div className="flex justify-center items-center h-screen bg-secondary">
            <LoadingAnimation showText={false} />
        </div>
    )
  }

  if (!course) {
    notFound();
  }
  
  return (
     <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
         {isMobile ? (
           <Header>
              <div className="flex items-center gap-2">
                 <button onClick={() => router.back()} className="p-2">
                   <ArrowLeft />
                 </button>
              </div>
               <div className="flex-1 text-center min-w-0">
                  <h1 className="text-lg font-semibold truncate px-2">{course.title}</h1>
               </div>
               <div className="flex items-center gap-2">
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
                       <CourseOutline 
                            course={course}
                            progress={progress}
                            completedLessons={completedLessons}
                            unlockedLessonsCount={unlockedLessonsCount}
                            currentLesson={currentLesson}
                            onLessonClick={handleLessonClick}
                            onExamClick={handleExamClick}
                            isMobileSheet={true}
                        />
                    </SheetContent>
                 </Sheet>
              </div>
           </Header>
         ) : <Header />}

        <div className="flex h-[calc(100vh-4rem)]">
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
            {!isMobile && (
              <aside className="w-full md:w-80 lg:w-96 bg-background border-r flex-shrink-0 overflow-y-auto">
                 <CourseOutline 
                    course={course}
                    progress={progress}
                    completedLessons={completedLessons}
                    unlockedLessonsCount={unlockedLessonsCount}
                    currentLesson={currentLesson}
                    onLessonClick={handleLessonClick}
                    onExamClick={handleExamClick}
                />
              </aside>
            )}

            <main className="flex-grow p-6 md:p-8 overflow-y-auto bg-secondary relative flex flex-col">
               {currentLesson ? (
                    <CoursePlayerTabs
                        course={course}
                        lesson={currentLesson}
                        onComplete={handleCompleteLesson}
                    />
               ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        {progress >= 100 ? (
                            <>
                                <CheckCircle className="h-24 w-24 text-green-500 mb-4" />
                                <h1 className="text-3xl font-bold mb-2 font-headline">You've completed all lessons!</h1>
                                <p className="text-muted-foreground mb-6">Great job. Now it's time to test your knowledge.</p>
                                <Button size="lg" onClick={() => router.push(`/courses/${slugify(course.title)}/exam`)}>
                                    Go to Final Exam
                                </Button>
                            </>
                        ) : (
                            <Alert>
                                <AlertTitle>No lesson selected</AlertTitle>
                                <AlertDescription>
                                    Please select an unlocked lesson from the sidebar to begin.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
               )}

                <AiTutor course={course} lesson={currentLesson} settings={tutorSettings} />
                <NotebookSheet courseId={course.id} courseTitle={course.title} />
            </main>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
