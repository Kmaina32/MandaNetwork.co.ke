

'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Course, UserCourse, RegisteredUser, LearningGoal, LeaderboardEntry, Achievement } from "@/lib/types";
import { getUserCourses, getAllCourses, saveUser, getUserById, createLearningGoal, updateLearningGoal, deleteLearningGoal, getLeaderboard } from '@/lib/firebase-service';
import { Award, BookOpen, User, Loader2, Trophy, BookCopy, ListTodo, Calendar, Briefcase, PlusCircle, Trash2, CheckCircle, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { slugify } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { formatDistanceToNowStrict } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import * as LucideIcons from 'lucide-react';
import { achievementList } from '@/lib/achievements';


type PurchasedCourseDetail = UserCourse & Partial<Course>;

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const goalFormSchema = z.object({
    goalText: z.string().min(3, "Goal must be at least 3 characters.")
});

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};


// Learning Goals Widget
function LearningGoalsWidget({ dbUser, onGoalUpdate }: { dbUser: RegisteredUser, onGoalUpdate: () => void }) {
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const form = useForm({ resolver: zodResolver(goalFormSchema), defaultValues: { goalText: '' }});

    const goals = useMemo(() => Object.values(dbUser.learningGoals || {}).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [dbUser.learningGoals]);

    const handleAddGoal = async (values: { goalText: string }) => {
        setIsAdding(true);
        try {
            await createLearningGoal(dbUser.uid, values.goalText);
            form.reset();
            onGoalUpdate();
        } catch (error) {
            toast({ title: "Error", description: "Failed to add goal.", variant: "destructive" });
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggleGoal = async (goal: LearningGoal) => {
        try {
            await updateLearningGoal(dbUser.uid, goal.id, { completed: !goal.completed });
            onGoalUpdate();
        } catch (error) {
             toast({ title: "Error", description: "Failed to update goal.", variant: "destructive" });
        }
    };
    
    const handleDeleteGoal = async (goalId: string) => {
        try {
            await deleteLearningGoal(dbUser.uid, goalId);
            onGoalUpdate();
        } catch (error) {
             toast({ title: "Error", description: "Failed to delete goal.", variant: "destructive" });
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">My Goals</CardTitle>
                <CardDescription>Add and track your personal learning objectives.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddGoal)} className="flex items-start gap-2 mb-4">
                        <FormField control={form.control} name="goalText" render={({ field }) => (
                            <FormItem className="flex-grow"><FormControl><Input placeholder="e.g., Finish React module..." {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <Button type="submit" size="icon" disabled={isAdding}>{isAdding ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4" />}</Button>
                    </form>
                </Form>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {goals.length > 0 ? goals.map((goal, index) => (
                        <div key={`${goal.id}-${index}`} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-secondary">
                            <div className="flex items-center gap-3">
                                <Checkbox id={`goal-${goal.id}`} checked={goal.completed} onCheckedChange={() => handleToggleGoal(goal)} />
                                <label htmlFor={`goal-${goal.id}`} className={`text-sm ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>{goal.text}</label>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )) : <p className="text-sm text-muted-foreground text-center py-4">No goals added yet.</p>}
                </div>
            </CardContent>
        </Card>
    )
}

// Portfolio Progress Widget
function PortfolioProgressWidget({ dbUser }: { dbUser: RegisteredUser }) {
    const score = useMemo(() => {
        let currentScore = 0;
        if (dbUser.displayName && dbUser.displayName !== 'New Member') currentScore += 25;
        if (dbUser.portfolio?.aboutMe) currentScore += 25;
        if (dbUser.portfolio?.socialLinks?.github) currentScore += 25;
        if (dbUser.portfolio?.public) currentScore += 25;
        return currentScore;
    }, [dbUser]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Portfolio Strength</CardTitle>
                <CardDescription>Complete your profile to attract employers.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center gap-4">
                    <div className="relative h-24 w-24">
                         <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                className="stroke-current text-secondary"
                                fill="none"
                                strokeWidth="3"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                className="stroke-current text-primary"
                                fill="none"
                                strokeWidth="3"
                                strokeDasharray={`${score}, 100`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{score}%</div>
                    </div>
                    <ul className="text-sm space-y-2">
                        <li className={`flex items-center gap-2 ${dbUser.displayName && dbUser.displayName !== 'New Member' ? 'text-muted-foreground line-through' : ''}`}><CheckCircle className="h-4 w-4"/>Set your full name</li>
                        <li className={`flex items-center gap-2 ${dbUser.portfolio?.aboutMe ? 'text-muted-foreground line-through' : ''}`}><CheckCircle className="h-4 w-4"/>Add a profile summary</li>
                        <li className={`flex items-center gap-2 ${dbUser.portfolio?.socialLinks?.github ? 'text-muted-foreground line-through' : ''}`}><CheckCircle className="h-4 w-4"/>Link your GitHub</li>
                        <li className={`flex items-center gap-2 ${dbUser.portfolio?.public ? 'text-muted-foreground line-through' : ''}`}><CheckCircle className="h-4 w-4"/>Make portfolio public</li>
                    </ul>
                </div>
            </CardContent>
             <CardFooter>
                <Button asChild className="w-full" variant="outline"><Link href="/profile">Edit Profile</Link></Button>
            </CardFooter>
        </Card>
    );
}

// Recent Achievements Widget
function AchievementsWidget({ achievements, isSuperAdmin }: { achievements: Achievement[], isSuperAdmin: boolean }) {
    
    let achievementsToShow = achievements;

    if (!isSuperAdmin && achievements) {
        achievementsToShow = [...achievements] // Create a shallow copy to avoid mutating the original prop
            .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
            .slice(0, 3);
    }
    
    const Icon = ({ name, ...props }: { name: string } & LucideIcons.LucideProps) => {
        const LucideIcon = (LucideIcons as any)[name];
        if (!LucideIcon) return <Award {...props} />; // Fallback icon
        return <LucideIcon {...props} />;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Recent Achievements</CardTitle>
                <CardDescription>Your latest unlocked awards.</CardDescription>
            </CardHeader>
            <CardContent>
                {achievementsToShow.length > 0 ? (
                    <div className="space-y-4">
                        {achievementsToShow.map(ach => (
                            <div key={ach.id || ach.name} className="flex items-center gap-4">
                                <div className="p-3 bg-secondary rounded-full">
                                    <Icon name={ach.icon} className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">{ach.name}</p>
                                    <p className="text-sm text-muted-foreground">{ach.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No achievements unlocked yet. Keep learning!</p>
                )}
            </CardContent>
        </Card>
    )
}

// Community Leaderboard Widget
function CommunityLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getLeaderboard().then(data => {
            setLeaderboard(data.slice(0, 5));
            setLoading(false);
        });
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Community Leaderboard</CardTitle>
                <CardDescription>Top performers across all activities.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : (
                    <ul className="space-y-3">
                        {leaderboard.map((entry, index) => (
                            <li key={entry.userId} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold w-4">{index + 1}.</span>
                                    <Avatar className="h-8 w-8"><AvatarImage src={entry.userAvatar} /><AvatarFallback>{getInitials(entry.userName)}</AvatarFallback></Avatar>
                                    <span className="font-medium">{entry.userName}</span>
                                </div>
                                <div className="flex items-center gap-1 font-bold text-primary">
                                    <Flame className="h-4 w-4"/>
                                    {entry.score}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const { user, loading: authLoading, isOrganizationAdmin, setUser: setAuthUser, isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [purchasedCourses, setPurchasedCourses] = useState<PurchasedCourseDetail[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [dbUser, setDbUser] = useState<RegisteredUser | null>(null);

  // Redirect organization admins to their specific dashboard, but not site admins
  useEffect(() => {
    if (!authLoading && isOrganizationAdmin && !isAdmin) {
      router.replace('/organization/dashboard');
    }
  }, [authLoading, isOrganizationAdmin, isAdmin, router]);

  const fetchDashboardData = async () => {
      setLoadingCourses(true);
      
      if (user) {
        const [allCoursesData, userCoursesData, userProfile] = await Promise.all([
            getAllCourses(),
            getUserCourses(user.uid),
            getUserById(user.uid),
        ]);
        
        setDbUser(userProfile);

        const courseDetailsPromises = allCoursesData.map(async (course) => {
            const userCourse = userCoursesData.find(c => c.courseId === course.id);
            if (userCourse) {
                 return { ...userCourse, ...course };
            }
            return null;
        });

        const detailedCourses = (await Promise.all(courseDetailsPromises)).filter(Boolean) as PurchasedCourseDetail[];
        setPurchasedCourses(detailedCourses.filter(c => c.title));
      }
      setLoadingCourses(false);
    };

  useEffect(() => {
    if (isOrganizationAdmin && !isAdmin) return; // Don't fetch student data for org admins

    if (!authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading, isOrganizationAdmin, isAdmin]);
  
  const inProgressCourses = purchasedCourses.filter(c => !(isAdmin || c.completed || c.certificateAvailable));
  const completedCourses = purchasedCourses.filter(c => isAdmin || c.completed || c.certificateAvailable);

  const handleOnboardingComplete = (newDisplayName: string) => {
      if (dbUser) {
          setDbUser({ ...dbUser, displayName: newDisplayName });
      }
      if (auth.currentUser) {
          setAuthUser(auth.currentUser);
      }
  }


  const renderContent = () => {
    if (authLoading || (loadingCourses && user) || (isOrganizationAdmin && !isAdmin)) {
        return <div className="flex justify-center items-center py-10 h-full"><LoadingAnimation /></div>
    }

    if (!user || !dbUser) {
        return (
            <div className="text-center h-full flex flex-col justify-center">
                <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold mb-2 font-headline">Access Denied</h1>
                <p className="text-muted-foreground mb-4">Please log in to view your dashboard.</p>
                <Button asChild>
                    <Link href="/login">Login</Link>
                </Button>
            </div>
        )
    }

    const achievementsToDisplay = isSuperAdmin
      ? Object.values(achievementList)
      : Object.values(dbUser.achievements || {});

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-1 font-headline">Welcome Back, {dbUser.displayName?.split(' ')[0]}!</h1>
                <p className="text-muted-foreground">Let's continue your learning journey.</p>
            </div>
            
             <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Courses in Progress</CardTitle>
                        <BookCopy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inProgressCourses.length}</div>
                        <p className="text-xs text-muted-foreground">Keep up the great work!</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Completed Courses</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedCourses.length}</div>
                         <p className="text-xs text-muted-foreground">View your achievements below.</p>
                    </CardContent>
                </Card>
                <div className="sm:col-span-2 lg:col-span-2">
                    <PortfolioProgressWidget dbUser={dbUser} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
                 <div className="lg:col-span-1">
                     <LearningGoalsWidget dbUser={dbUser} onGoalUpdate={fetchDashboardData} />
                </div>
                <div className="lg:col-span-1">
                     <AchievementsWidget achievements={achievementsToDisplay as Achievement[]} isSuperAdmin={isSuperAdmin} />
                </div>
                 <div className="lg:col-span-1">
                    <CommunityLeaderboard />
                </div>
            </div>

            <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4 font-headline">Continue Learning</h2>
                 {inProgressCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {inProgressCourses.map((course) => (
                            course.id && course.title && (
                            <Card key={course.id} className="flex flex-col">
                                <CardHeader>
                                <CardTitle className="font-headline text-xl">{course.title}</CardTitle>
                                <CardDescription>{course.instructor}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                     <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm text-muted-foreground">Progress</span>
                                        <span className="text-sm font-medium text-primary">{course.progress}%</span>
                                    </div>
                                    <Progress value={course.progress} className="h-2" />
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full">
                                        <Link href={`/courses/${slugify(course.title)}/learn`}>
                                            <BookOpen className="mr-2 h-4 w-4" />
                                            Jump Back In
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                            )
                        ))}
                    </div>
                 ) : (
                    <Card className="text-center py-10">
                        <CardContent>
                            {purchasedCourses.length === 0 && !loadingCourses ? (
                                <>
                                    <p className="text-muted-foreground mb-4">You are not currently enrolled in any courses.</p>
                                    <Button asChild>
                                        <Link href="/">Explore Courses</Link>
                                    </Button>
                                </>
                            ) : (
                                <p className="text-muted-foreground">You've completed all your courses! Well done.</p>
                            )}
                        </CardContent>
                    </Card>
                 )}
            </div>
            
             <div>
                <h2 className="text-2xl font-bold mb-4 font-headline">My Certificates</h2>
                 {completedCourses.length > 0 ? (
                    <Card>
                        <CardContent className="pt-6">
                             <ul className="space-y-4">
                                {completedCourses.map((course, index) => (
                                course.id && course.title && (
                                    <li key={course.id}>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                             <div>
                                                <h3 className="font-semibold">{course.title}</h3>
                                                <p className="text-sm text-muted-foreground">Completed on {new Date().toLocaleDateString()}</p>
                                             </div>
                                             <Button asChild variant="outline" className="mt-2 sm:mt-0">
                                                <Link href={`/dashboard/certificate/${slugify(course.title)}`}>
                                                    <Award className="mr-2 h-4 w-4" />
                                                    View Certificate
                                                 </Link>
                                             </Button>
                                        </div>
                                        {index < completedCourses.length - 1 && <Separator className="my-4" />}
                                    </li>
                                )
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                 ) : (
                    <Card className="text-center py-10">
                        <CardContent>
                            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">You haven't earned any certificates yet. Complete a course to see it here!</p>
                        </CardContent>
                    </Card>
                 )}
            </div>

        </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16 bg-secondary/50">
           {renderContent()}
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
