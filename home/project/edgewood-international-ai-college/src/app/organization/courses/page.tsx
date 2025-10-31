
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { Course } from '@/lib/types';
import { getAllCourses, enrollUserInCourse } from '@/lib/firebase-service';
import { Loader2 } from 'lucide-react';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export default function OrganizationCoursesPage() {
    const { organization, members } = useAuth();
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchCourses = async () => {
            const allCourses = await getAllCourses();
            setCourses(allCourses);
            setLoading(false);
        };
        fetchCourses();
    }, []);

    const handleSelectCourse = (courseId: string) => {
        setSelectedCourses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(courseId)) {
                newSet.delete(courseId);
            } else {
                newSet.add(courseId);
            }
            return newSet;
        });
    };

    const handleAssignCourses = async () => {
        if (!organization || members.length === 0 || selectedCourses.size === 0) {
            toast({
                title: "Cannot Assign Courses",
                description: "There are no members in your organization to assign courses to.",
                variant: 'destructive'
            });
            return;
        }

        setIsAssigning(true);
        toast({
            title: 'Assigning Courses...',
            description: `Assigning ${selectedCourses.size} course(s) to ${members.length} member(s). This may take a moment.`
        });
        
        try {
            const assignmentPromises = [];
            for (const member of members) {
                for (const courseId of selectedCourses) {
                    assignmentPromises.push(enrollUserInCourse(member.uid, courseId));
                }
            }
            await Promise.all(assignmentPromises);
            toast({
                title: 'Courses Assigned!',
                description: `Successfully assigned courses to all members.`
            });
            setSelectedCourses(new Set());
        } catch (error) {
            console.error("Failed to assign courses:", error);
            toast({
                title: 'Assignment Failed',
                description: 'Could not assign courses to members. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="space-y-8">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Manage Courses</CardTitle>
                        <CardDescription>Assign courses to your team members.</CardDescription>
                    </div>
                     <Button onClick={handleAssignCourses} disabled={selectedCourses.size === 0 || isAssigning}>
                        {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Assign {selectedCourses.size > 0 ? `${selectedCourses.size} ` : ''}{selectedCourses.size === 1 ? 'Course' : 'Courses'}
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10"><LoadingAnimation /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                    </TableHead>
                                    <TableHead>Course Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {courses.map(course => (
                                    <TableRow key={course.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedCourses.has(course.id)}
                                                onCheckedChange={() => handleSelectCourse(course.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{course.title}</TableCell>
                                        <TableCell>{course.category}</TableCell>
                                        <TableCell>{course.duration}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                       </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
