

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import type { Course, Lesson, TutorSettings } from '@/lib/types';
import { getCourseById, updateUserCourseProgress, getUserCourses, getTutorSettings, getAllCourses } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { isWeekend, differenceInWeeks } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { slugify } from '@/lib/utils';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { NotebookSheet } from '@/components/NotebookSheet';
import { checkCourseCompletionAchievements } from '@/lib/achievements';
import { CourseOutline } from '@/components/CourseOutline';
import { AiTutor } from '@/components/AiTutor';
import { CoursePlayerTabs } from '@/components/CoursePlayerTabs';
import { CoursePlayerHeader } from '@/components/CoursePlayerHeader';


// Calculate the number of weekdays between two dates
function getWeekdayCount(startDate: Date, endDate: Date): number {
  let count = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (!isWeekend(currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return count;
}

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
  const [timeLeft, setTimeLeft] = useState(0);
  const [lessonProgress, setLessonProgress] = useState(0);
  
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

            // Authentication alone must not grant access to paid course lessons.
            // Send non-enrolled learners back to the course page to review/enroll.
            const currentUserCourse = userCourses.find(c => c.courseId === fetchedCourse.id);
            if (!currentUserCourse) {
                router.replace(`/courses/${slugify(fetchedCourse.title)}`);
                return;
            }
            
            setCourse(fetchedCourse);
            setTutorSettings(fetchedTutorSettings);

            const lessons = fetchedCourse.modules?.flatMap(m => m.lessons) || [];
            setAllLessons(lessons);

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

    if (allLessons.length === 0) return;
    const newCompleted = new Set(completedLessons);
    newCompleted.add(currentLesson.id);
    const newProgress = (newCompleted.size / allLessons.length) * 100;

    try {
      await updateUserCourseProgress(user.uid, course.id, {
          completedLessons: Array.from(newCompleted),
          progress: Math.round(newProgress),
          completed: newProgress === 100
      });
      setCompletedLessons(newCompleted);
    } catch (error) {
      console.error('Failed to save lesson progress:', error);
      toast({ title: 'Progress not saved', description: 'Your lesson could not be marked complete. Please try again.', variant: 'destructive' });
      return;
    }

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

  useEffect(() => {
    if (!currentLesson) {
      setLessonProgress(100);
      setTimeLeft(0);
      return;
    }

    const durationInMinutes = parseInt(currentLesson.duration.split(' ')[0], 10);
    const durationInSeconds = isNaN(durationInMinutes) ? 300 : durationInMinutes * 60; // Default 5 mins if invalid
    
    setTimeLeft(durationInSeconds);
    setLessonProgress(0);

    const interval = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) {
                clearInterval(interval);
                handleCompleteLesson();
                return 0;
            }
            const newTimeLeft = prev - 1;
            setLessonProgress(100 - (newTimeLeft / durationInSeconds) * 100);
            return newTimeLeft;
        });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLesson]);

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
         <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
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
                    <SheetContent side="right" className="w-[min(88vw,380px)] overflow-y-auto p-0">
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
        
        <CoursePlayerHeader progress={lessonProgress} timeLeft={timeLeft} />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
            {!isMobile && (
              <aside className="hidden w-72 shrink-0 overflow-y-auto overscroll-contain border-r bg-background lg:block xl:w-80">
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

            <main className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-x-hidden overflow-y-auto overscroll-y-contain bg-secondary px-3 pb-32 pt-4 sm:px-5 sm:pb-28 md:p-6 lg:p-8">
              <div className="flex w-full max-w-4xl min-w-0 flex-1 flex-col">
                <CoursePlayerTabs
                    course={course}
                    lesson={currentLesson}
                />
              </div>
              <AiTutor course={course} lesson={currentLesson} settings={tutorSettings} />
              <NotebookSheet courseId={course.id} courseTitle={course.title} />
            </main>
          </div>
        </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
