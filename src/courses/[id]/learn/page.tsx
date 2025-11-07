
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import { Course, Lesson, Module, TutorMessage } from '@/lib/mock-data';
import { getCourseById, updateUserCourseProgress, getUserCourses, saveTutorHistory, getTutorHistory, getTutorSettings, TutorSettings, getUserNotes, saveUserNotes, getAllCourses } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Lock, PlayCircle, Star, Loader2, ArrowLeft, Youtube, Video, AlertCircle, Menu, Bot, User, Send, MessageSquare, Volume2, Mic, MicOff, BrainCircuit, FileText, Sparkles, Pencil, VolumeX, Link as LinkIcon, Download, Gem, MessageCircle, ArrowRight } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { format as formatDate, isWeekend, differenceInDays, differenceInWeeks } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { courseTutor } from '@/app/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRecorder } from '@/hooks/use-recorder';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscussionForum } from '@/components/DiscussionForum';
import { slugify } from '@/lib/utils';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { NotebookSheet } from '@/components/NotebookSheet';
import { checkCourseCompletionAchievements } from '@/lib/achievements';


function getYouTubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  let videoId: string | null = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v');
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch(e) {
    return null; // Invalid URL
  }
}

function calculateModuleProgress(module: Module, completedLessons: Set<string>): number {
    if (!module.lessons || module.lessons.length === 0) return 0;
    const completedInModule = module.lessons.filter(l => completedLessons.has(l.id)).length;
    return (completedInModule / module.lessons.length) * 100;
}

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

function Markdown({ content }: { content: string }) {
    const html = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br />');
    return <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: html }} />;
}

const GoogleDriveIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
        <path d="M330.2 284.4l-15.1 26.2-70.2-121.5L200 81l130.2 203.4z" fill="#ffc107"/>
        <path d="M117.9 284.4L73 368.8l102.3-177.2L219.7 121l-101.8 163.4z" fill="#03a9f4"/>
        <path d="M375.1 368.8L440 256H199.3l-47.5 82.3 223.3.5z" fill="#4caf50"/>
    </svg>
);


function CourseOutline({ course, progress, completedLessons, unlockedLessonsCount, currentLesson, onLessonClick, onExamClick, isMobileSheet = false }: {
    course: Course;
    progress: number;
    completedLessons: Set<string>;
    unlockedLessonsCount: number;
    currentLesson: Lesson | null;
    onLessonClick: (lesson: Lesson, index: number) => void;
    onExamClick: () => void;
    isMobileSheet?: boolean;
}) {
     const router = useRouter();

    return (
       <div className="p-4">
            {isMobileSheet ? (
                <SheetHeader className="mb-4 text-left">
                    <SheetTitle>Course Outline</SheetTitle>
                </SheetHeader>
            ) : (
                <button onClick={() => router.push(`/courses/${slugify(course.title)}`)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Course Details
                </button>
            )}
            <h2 className="text-xl font-bold mb-1 font-headline">{course.title}</h2>
            <p className="text-sm text-muted-foreground mb-2">{course.duration}</p>
            <div className="flex items-center gap-2 mb-4">
                <Progress value={progress} className="h-2 flex-grow" />
                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Accordion type="multiple" defaultValue={course.modules?.map(m => m.id)} className="w-full">
            {course.modules?.map((module, moduleIndex) => {
                const moduleProgress = calculateModuleProgress(module, completedLessons);
                return (
                    <AccordionItem value={module.id} key={module.id}>
                        <AccordionTrigger className="font-semibold px-4">
                            <div className="w-full">
                                <p>{module.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Progress value={moduleProgress} className="h-1 flex-grow bg-secondary" />
                                    <span className="text-xs font-normal text-muted-foreground">{Math.round(moduleProgress)}%</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                        <ul className="space-y-1 p-2">
                            {module.lessons.map((lesson, lessonIndex) => {
                                const overallLessonIndex = course.modules.slice(0, moduleIndex).reduce((acc, m) => acc + m.lessons.length, 0) + lessonIndex;
                                const isUnlocked = overallLessonIndex < unlockedLessonsCount;
                                const isCompleted = completedLessons.has(lesson.id);
                                const hasVideo = lesson.youtubeLinks && lesson.youtubeLinks.length > 0;

                                return (
                                <li key={lesson.id}>
                                    <button
                                    onClick={() => onLessonClick(lesson, overallLessonIndex)}
                                    disabled={!isUnlocked && !isCompleted}
                                    className={`w-full text-left flex items-center justify-between gap-3 p-2 rounded-md transition-colors ${
                                        currentLesson?.id === lesson.id ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isCompleted ? (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            ) : isUnlocked ? (
                                                <PlayCircle className="h-5 w-5 text-muted-foreground" />
                                            ) : (
                                                <Lock className="h-5 w-5 text-muted-foreground" />
                                            )}
                                            <span className="text-sm">{lesson.title}</span>
                                        </div>
                                        {hasVideo && <Youtube className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                    </button>
                                </li>
                                )
                            })}
                        </ul>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
            <AccordionItem value="exam">
                <AccordionTrigger className="font-semibold px-4">Final Exam</AccordionTrigger>
                <AccordionContent>
                    <div className="p-2">
                    <button
                        onClick={onExamClick}
                        disabled={progress < 100}
                        className="w-full text-left flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {progress < 100 ? (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                        ) : (
                            <Star className="h-5 w-5 text-yellow-500" />
                        )}
                        <span className="text-sm">Take the Final Exam</span>
                    </button>
                    </div>
                </AccordionContent>
            </AccordionItem>
            </Accordion>
        </div>
    )
}

function AiTutor({ course, lesson, settings }: { course: Course, lesson: Lesson | null, settings: TutorSettings | null }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<TutorMessage[]>([]);
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const { isRecording, startRecording, stopRecording } = useRecorder();

    const initialPrompts = [
        { label: 'Summarize', icon: FileText, action: 'summarize' as const },
        { label: 'Quiz Me', icon: Sparkles, action: 'quiz' as const },
        { label: 'Tutor Me', icon: Pencil, action: 'tutor_me' as const },
    ];
    
    useEffect(() => {
        const loadHistory = async () => {
            if (user && course && lesson) {
                setIsLoading(true);
                const history = await getTutorHistory(user.uid, course.id, lesson.id);
                setMessages(history);
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [user, course, lesson]);

    const sendTutorRequest = async (currentQuestion?: string, action?: 'summarize' | 'quiz') => {
        if (!lesson || !user || !course) return;
        if (!currentQuestion && !action) return;

        const userMessageContent = action === 'summarize' 
            ? 'Summarize this lesson for me.' 
            : action === 'quiz'
            ? 'Give me a quiz on this lesson.'
            : currentQuestion!;

        const userMessage: TutorMessage = { role: 'user', content: userMessageContent };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setQuestion('');
        setIsLoading(true);

        try {
            const result = await courseTutor({ 
                question: action ? undefined : currentQuestion,
                action,
                courseTitle: course.title,
                courseContext: lesson.content,
                history: messages.map(({ audioUrl, suggestions, ...rest }) => rest), // pass clean history
                voice: settings?.voice,
                speed: settings?.speed
            });
            
            const tutorMessage: TutorMessage = { 
                role: 'assistant', 
                content: result.answer, 
                suggestions: result.suggestions
            };

            const finalMessages = [...newMessages, tutorMessage];
            setMessages(finalMessages);
            
            await saveTutorHistory(user.uid, course.id, lesson.id, finalMessages);

        } catch (error) {
            console.error("AI Tutor failed:", error);
            toast({ title: 'Error', description: 'The AI Tutor is currently unavailable. Please try again later.', variant: 'destructive'});
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    }

    const handleTutorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        sendTutorRequest(question);
    }

    const handleActionClick = (action: 'summarize' | 'quiz' | 'tutor_me') => {
        if (action === 'tutor_me') {
            sendTutorRequest("Tutor me");
        } else {
            sendTutorRequest(undefined, action);
        }
    }
    
    if (!lesson) return null;

    return (
        <>
            <audio ref={audioRef} className="hidden" />
            <Sheet>
                <SheetTrigger asChild>
                    <Button className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg">
                        <MessageSquare className="h-7 w-7" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[480px] flex flex-col p-0 rounded-l-lg">
                     <SheetHeader className="p-6 pb-2 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <SheetTitle>Chat with Gina</SheetTitle>
                                <SheetDescription>
                                    Your AI tutor for this lesson.
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    <ScrollArea className="flex-grow p-6">
                        <div className="space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center text-muted-foreground text-sm py-8 space-y-4">
                                    <BrainCircuit className="h-10 w-10 mx-auto text-primary/50" />
                                    <div>
                                     <p className="font-semibold mb-2">How can I help you learn?</p>
                                     <div className="grid grid-cols-1 gap-2">
                                        {initialPrompts.map(prompt => (
                                            <Button key={prompt.action} variant="outline" size="sm" onClick={() => handleActionClick(prompt.action)}>
                                                <prompt.icon className="mr-2 h-4 w-4" />
                                                {prompt.label}
                                            </Button>
                                        ))}
                                     </div>
                                    </div>
                                </div>
                            )}
                            {messages.map((message, index) => (
                                <div key={index}>
                                    <div className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                        {message.role === 'assistant' && (
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarImage src={settings?.avatarUrl || ''} />
                                                <AvatarFallback><Bot/></AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={`rounded-lg px-3 py-2 max-w-md ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                            <Markdown content={message.content} />
                                        </div>
                                            {message.role === 'user' && (
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarImage src={user?.photoURL || ''} />
                                                <AvatarFallback><User /></AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                    {message.role === 'assistant' && message.suggestions && (
                                        <div className="flex flex-wrap gap-2 mt-3 ml-11">
                                            {message.suggestions.map((suggestion, i) => (
                                                <Button key={i} size="sm" variant="outline" onClick={() => sendTutorRequest(suggestion)}>
                                                    {suggestion}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarImage src={settings?.avatarUrl || ''} />
                                        <AvatarFallback><Bot/></AvatarFallback>
                                    </Avatar>
                                    <div className="rounded-lg px-4 py-3 bg-secondary flex items-center">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="border-t p-6 bg-background">
                        <form onSubmit={handleTutorSubmit} className="flex items-start gap-2">
                             <Button type="button" size="icon" variant={isRecording ? 'destructive' : 'outline'} onClick={isRecording ? stopRecording : startRecording} disabled={isLoading}>
                                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </Button>
                            <Textarea 
                                placeholder="e.g., Can you explain this concept..." 
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                className="min-h-0 resize-none"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleTutorSubmit(e);
                                    }
                                    }}
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !question.trim()} id="tutor-form-submit">
                                <Send className="h-4 w-4"/>
                            </Button>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}

function LessonContent({ lesson, onComplete }: { lesson: Lesson | null; onComplete: () => void; }) {
  if (!lesson) return null;

  return (
    <div className="flex flex-col h-full">
        <ScrollArea className="flex-grow">
          <div className="pr-4">
            <h1 className="text-3xl font-bold font-headline mb-4">{lesson.title}</h1>
            <div className="prose max-w-none text-foreground/90 mb-6">
                <p>{lesson.content}</p>
            </div>

            {lesson.googleDriveLinks && lesson.googleDriveLinks.length > 0 && (
                <div className="mt-8">
                    <Separator />
                    <h3 className="text-lg font-semibold my-4">Lesson Resources</h3>
                    <div className="space-y-2">
                        {lesson.googleDriveLinks.map(link => (
                            <a
                                href={link.url}
                                key={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-background border rounded-md hover:bg-secondary transition-colors"
                            >
                                <GoogleDriveIcon className="h-6 w-6 flex-shrink-0" />
                                <span className="text-sm font-medium text-primary">{link.title}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </ScrollArea>

        <div className="pt-6 mt-auto flex-shrink-0">
             <Button size="lg" className="w-full bg-accent hover:bg-accent/90" onClick={onComplete}>
                Mark as Completed &amp; Continue
             </Button>
        </div>
    </div>
  );
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
  
  const allLessons = course?.modules?.flatMap(m => m.lessons) || [];
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [unlockedLessonsCount, setUnlockedLessonsCount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);


  useEffect(() => {
     if (!authLoading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchCourseAndProgress = async () => {
        if (!user) return;
        setLoading(true);

        const allCourses = await getAllCourses();
        const courseSlug = params.id;
        const fetchedCourse = allCourses.find(c => slugify(c.title) === courseSlug);
        
        if (!fetchedCourse) {
            notFound();
            return;
        }
        
        const fetchedTutorSettings = await getTutorSettings();
        
        setCourse(fetchedCourse);
        setTutorSettings(fetchedTutorSettings);

        if (fetchedCourse) {
          const userCourses = await getUserCourses(user.uid);
          const currentUserCourse = userCourses.find(c => c.courseId === fetchedCourse.id);
          
          if (currentUserCourse?.completedLessons) {
            setCompletedLessons(new Set(currentUserCourse.completedLessons));
          }
          
            const allLessons = fetchedCourse.modules?.flatMap(m => m.lessons) || [];

            if (currentUserCourse?.enrollmentDate && fetchedCourse.dripFeed !== 'off') {
              const enrollmentDate = new Date(currentUserCourse.enrollmentDate);
              const today = new Date();
              let unlockedLessons = 0;

              if (fetchedCourse.dripFeed === 'daily') {
                unlockedLessons = getWeekdayCount(enrollmentDate, today);
              } else if (fetchedCourse.dripFeed === 'weekly') {
                 unlockedLessons = differenceInWeeks(today, enrollmentDate) + 1;
              }
              setUnlockedLessonsCount(Math.min(unlockedLessons, allLessons.length));
              
            } else {
              setUnlockedLessonsCount(allLessons.length);
            }
            
            if (allLessons.length > 0) {
                setCurrentLesson(allLessons[0]);
            }
        }
        setLoading(false);
    }
    if (user) {
      fetchCourseAndProgress();
    }
  }, [params.id, user]);
  

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
    router.push(`/courses/${slugify(course!.title)}/exam`);
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
        setCurrentLesson(null);
    }
  };

  const handleVideoClick = async () => {
    const videoUrl = currentLesson?.youtubeLinks?.[0]?.url;
    if (videoUrl && videoRef.current) {
        if(document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            videoRef.current.src = getYouTubeEmbedUrl(videoUrl) || '';
            videoRef.current.play().catch(() => { /* Autoplay might be blocked */ });
            // Wait for video to load before requesting PiP
            videoRef.current.onloadedmetadata = async () => {
                 try {
                    await videoRef.current?.requestPictureInPicture();
                 } catch (error) {
                    console.error("PiP failed:", error);
                    toast({title: "Could not open Picture-in-Picture", description: "Your browser may not support this feature.", variant: "destructive"});
                 }
            };
        }
    }
  };

  const progress = allLessons.length > 0 ? (completedLessons.size / allLessons.length) * 100 : 0;
  const hasVideo = !!currentLesson?.youtubeLinks?.[0]?.url;

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
            <video ref={videoRef} className="hidden" />
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
               <Tabs defaultValue="lesson" className="w-full flex-grow flex flex-col">
                  <TabsList className="mb-4 flex-shrink-0">
                    <TabsTrigger value="lesson">
                        <FileText className="mr-2 h-4 w-4" />
                        Lesson
                    </TabsTrigger>
                     <TabsTrigger value="video" disabled={!hasVideo} onClick={handleVideoClick}>
                        <Video className="mr-2 h-4 w-4" />
                        Video
                    </TabsTrigger>
                    <TabsTrigger value="discussion">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Discussion
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="lesson" className="flex-grow">
                     {currentLesson ? (
                        <LessonContent lesson={currentLesson} onComplete={handleCompleteLesson} />
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
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>No lesson selected</AlertTitle>
                                    <AlertDescription>
                                        Please select an unlocked lesson from the sidebar to begin.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                  </TabsContent>
                   <TabsContent value="discussion">
                     <DiscussionForum courseId={course.id} />
                  </TabsContent>
                </Tabs>
                <AiTutor course={course} lesson={currentLesson} settings={tutorSettings} />
                <NotebookSheet courseId={course.id} courseTitle={course.title} />
            </main>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
