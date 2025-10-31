
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Users, BarChart, CreditCard, Loader2, Trophy, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAllCourses, getUserCourses } from '@/lib/firebase-service';
import type { Course, UserCourse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { LoadingAnimation } from '@/components/LoadingAnimation';

type EnrolledCourse = UserCourse & Partial<Course>;

export default function OrganizationHomePage() {
    const { user, organization, loading } = useAuth();
    const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);

    useEffect(() => {
        if (loading) return;
        if (!user || !organization) return;

        const fetchCourses = async () => {
            setLoadingCourses(true);
            try {
                const [allCourses, userCourses] = await Promise.all([
                    getAllCourses(),
                    getUserCourses(user.uid)
                ]);
                
                const courseMap = new Map(allCourses.map(c => [c.id, c]));

                const coursesForOrg = userCourses
                    .filter(uc => courseMap.has(uc.courseId))
                    .map(uc => ({
                        ...uc,
                        ...courseMap.get(uc.courseId)
                    }));
                setEnrolledCourses(coursesForOrg as EnrolledCourse[]);
            } catch (error) {
                console.error("Failed to fetch courses:", error);
            } finally {
                setLoadingCourses(false);
            }
        };

        fetchCourses();

    }, [user, organization, loading]);

    if (loading || loadingCourses) {
        return <div className="flex justify-center items-center h-full"><LoadingAnimation /></div>
    }

    return (
        <div className="space-y-8">
             <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline">Welcome to {organization?.name}</h1>
                <p className="text-muted-foreground">{organization?.welcomeMessage || "Your learning journey starts here. Access your assigned courses below."}</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>My Courses</CardTitle>
                    <CardDescription>Courses assigned to you by your organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    {enrolledCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {enrolledCourses.map(course => (
                                <Card key={course.courseId} className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="text-lg">{course.title}</CardTitle>
                                        <CardDescription>{course.category}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm text-muted-foreground">Progress</span>
                                            <span className="text-sm font-medium text-primary">{course.progress}%</span>
                                        </div>
                                        <Progress value={course.progress} className="h-2" />
                                    </CardContent>
                                    <CardContent>
                                        <Button asChild className="w-full">
                                            <Link href={`/courses/${slugify(course.title!)}/learn`}>
                                                <BookOpen className="mr-2 h-4 w-4" />
                                                Start Learning
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No courses have been assigned to you yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
