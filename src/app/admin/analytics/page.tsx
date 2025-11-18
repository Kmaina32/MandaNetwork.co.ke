

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/shared/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Sparkles, Users, BookOpen, UserPlus, LineChart, ExternalLink, DollarSign, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runContentStrategy } from '@/app/actions';
import type { ContentStrategyOutput, Course, RegisteredUser, UserActivity } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getAllCourses, getAllUsers, getActivityLogs } from '@/lib/firebase-service';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ComposedChart, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { format, subDays, parseISO } from 'date-fns';

type AnalyticsData = {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  userSignups: { date: string; count: number }[];
  courseEnrollments: { title: string; enrollments: number }[];
  courseRevenue: { title: string; revenue: number }[];
  recentActivities: UserActivity[];
};

const chartConfig = {
  enrollments: {
    label: "Enrollments",
    color: "hsl(var(--primary))",
  },
   revenue: {
    label: "Revenue (Ksh)",
    color: "hsl(var(--accent))",
  },
  signups: {
    label: "Sign-ups",
    color: "hsl(var(--accent))",
  },
  trend: {
    label: "Trend",
    color: "hsl(var(--foreground))",
  }
};

export default function AdminAnalyticsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const [users, courses, activityLogs] = await Promise.all([
            getAllUsers(), 
            getAllCourses(),
            getActivityLogs(5) // Fetch last 5 activities
        ]);
        
        let totalEnrollments = 0;
        let totalRevenue = 0;
        const courseEnrollmentCounts: { [key: string]: number } = {};
        const courseRevenueCounts: { [key: string]: number } = {};
        courses.forEach(c => {
            courseEnrollmentCounts[c.id] = 0;
            courseRevenueCounts[c.id] = 0;
        });

        const userSignupCounts: { [key: string]: number } = {};
        const thirtyDaysAgo = subDays(new Date(), 30);

        users.forEach(user => {
            if (user.purchasedCourses) {
                const userEnrollments = Object.keys(user.purchasedCourses).length;
                totalEnrollments += userEnrollments;
                 Object.keys(user.purchasedCourses).forEach(courseId => {
                    if (courseEnrollmentCounts[courseId] !== undefined) {
                        courseEnrollmentCounts[courseId]++;
                    }
                    const course = courses.find(c => c.id === courseId);
                    if(course) {
                        totalRevenue += course.price;
                        courseRevenueCounts[course.id] = (courseRevenueCounts[course.id] || 0) + course.price;
                    }
                });
            }
            if (user.createdAt) {
                const signupDate = parseISO(user.createdAt);
                if (signupDate > thirtyDaysAgo) {
                    const dateKey = format(signupDate, 'yyyy-MM-dd');
                    userSignupCounts[dateKey] = (userSignupCounts[dateKey] || 0) + 1;
                }
            }
        });

        const courseEnrollments = courses.map(course => ({
          title: course.title,
          enrollments: courseEnrollmentCounts[course.id] || 0
        })).sort((a,b) => b.enrollments - a.enrollments).slice(0, 10);

        const courseRevenue = courses.map(course => ({
          title: course.title,
          revenue: courseRevenueCounts[course.id] || 0
        })).sort((a,b) => b.revenue - a.revenue).slice(0, 5);

        const userSignups = Object.entries(userSignupCounts).map(([date, count]) => ({
          date,
          count
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        setAnalyticsData({
          totalUsers: users.length,
          totalCourses: courses.length,
          totalEnrollments,
          totalRevenue,
          courseEnrollments,
          courseRevenue,
          userSignups,
          recentActivities: activityLogs,
        });

      } catch (error) {
        console.error("Failed to load analytics data", error);
        toast({ title: 'Error', description: 'Could not load analytics data.', variant: 'destructive'});
      }
      setLoadingAnalytics(false);
    }
    fetchAnalytics();
  }, [toast]);

  const handleGenerate = async () => {
    setIsLoading(true);
    toast({
      title: 'Starting AI Content Strategy...',
      description: 'The AI is generating new courses, a program, and a bundle. This may take a minute or two.',
    });
    try {
      const result: ContentStrategyOutput = await runContentStrategy();
      toast({
        title: 'Content Strategy Complete!',
        description: `Successfully created ${result.coursesCreated} courses, the "${result.programTitle}" program, and the "${result.bundleTitle}" bundle.`,
        duration: 10000,
      });
    } catch (error) {
      console.error("Content strategy flow failed:", error);
      toast({
        title: 'Error',
        description: 'An error occurred during content generation. Please check the server logs for details.',
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Content Strategy</CardTitle>
              <CardDescription>
                View platform analytics and use AI to autonomously generate new content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {loadingAnalytics ? (
                <div className="flex justify-center items-center py-10">
                  <LoadingAnimation />
                </div>
              ) : analyticsData ? (
                <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                       <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                       <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">Ksh {analyticsData.totalRevenue.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                       <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                       <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.totalUsers}</div>
                    </CardContent>
                  </Card>
                   <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                       <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                       <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.totalCourses}</div>
                    </CardContent>
                  </Card>
                   <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                       <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                       <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.totalEnrollments}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Vercel Speed Insights</CardTitle>
                                <CardDescription>Real-time performance metrics for your application.</CardDescription>
                            </div>
                            <Button asChild variant="outline">
                                <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
                                    View Analytics <ExternalLink className="ml-2 h-4 w-4" />
                                </a>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Click the button to open your Vercel dashboard and view detailed analytics on page load speeds, Core Web Vitals, and user traffic patterns.</p>
                        </CardContent>
                    </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 Enrolled Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart data={analyticsData.courseEnrollments} layout="vertical" margin={{ left: 50 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="title" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={200} />
                          <CartesianGrid horizontal={false} />
                           <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                          <Bar dataKey="enrollments" fill="var(--color-enrollments)" radius={4} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                   <div className="grid gap-8 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>User Signups (Last 30 Days)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                    <ComposedChart data={analyticsData.userSignups}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'MMM d')} tickLine={false} axisLine={false} />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Bar dataKey="count" fill="var(--color-signups)" radius={4} name="Signups" />
                                        <Line type="monotone" dataKey="count" stroke="var(--color-trend)" strokeWidth={2} name="Trend" dot={false} />
                                    </ComposedChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity /> Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <div className="space-y-4">
                                   {analyticsData.recentActivities.map((activity) => (
                                       <div key={activity.id} className="flex items-center gap-3">
                                           <p className="text-sm">
                                                <span className="font-semibold">{activity.userName}</span> {activity.type === 'enrollment' ? 'enrolled in' : 'visited'} <Link href={activity.path} className="text-primary hover:underline">{activity.type === 'enrollment' ? activity.details.courseTitle : activity.path}</Link>
                                           </p>
                                       </div>
                                   ))}
                               </div>
                            </CardContent>
                        </Card>
                   </div>
                </div>
                </>
              ) : (
                <p>Could not load analytics data.</p>
              )}

              <div className="p-6 border rounded-lg bg-secondary/50">
                <h3 className="text-lg font-semibold">Autonomous Content Generation</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Click the button below to have the AI generate 10 new, relevant courses and automatically group them into a new program and a new bundle.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {isLoading ? 'Generating Content...' : 'Generate Daily Content'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Content Generation</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will run a powerful AI flow that creates 10 courses, 1 program, and 1 bundle. This action can take up to 2 minutes and will incur costs. Are you sure you want to proceed?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleGenerate}>Yes, Generate</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
