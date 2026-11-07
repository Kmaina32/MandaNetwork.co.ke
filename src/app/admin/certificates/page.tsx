
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getAllCourses, getAllUsers, getCertificateSettings, saveCertificateSettings } from '@/lib/firebase-service';
import type { RegisteredUser, Course, UserCourse } from '@/lib/types';
import { Award, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';

interface IssuedCertificate {
    studentName: string;
    studentAvatar: string;
    courseTitle: string;
    issuedAt: string;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

export default function CertificatesPage() {
    const [issuedCertificates, setIssuedCertificates] = useState<IssuedCertificate[]>([]);
    const [admins, setAdmins] = useState<RegisteredUser[]>([]);
    const [academicDirector, setAcademicDirector] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [allUsers, allCourses, settings] = await Promise.all([
                    getAllUsers(),
                    getAllCourses(),
                    getCertificateSettings()
                ]);

                const courseMap = new Map(allCourses.map(c => [c.id, c]));
                const adminUsers = allUsers.filter(u => u.isAdmin);
                setAdmins(adminUsers);
                setAcademicDirector(settings.academicDirector || '');

                const certs: IssuedCertificate[] = [];
                allUsers.forEach(user => {
                    if (user.purchasedCourses) {
                        Object.entries(user.purchasedCourses).forEach(([courseId, uc]) => {
                            if (uc.certificateAvailable && uc.certificateId) {
                                const course = courseMap.get(courseId);
                                if (course) {
                                    certs.push({
                                        studentName: user.displayName || 'Unknown',
                                        studentAvatar: user.photoURL || '',
                                        courseTitle: course.title,
                                        issuedAt: uc.enrollmentDate, // Placeholder, ideally we'd store a completion date
                                    });
                                }
                            }
                        });
                    }
                });
                
                setIssuedCertificates(certs.sort((a,b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()));

            } catch (error) {
                console.error("Failed to load certificate data", error);
                toast({ title: "Error", description: "Could not load certificate data.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [toast]);
    
    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await saveCertificateSettings({ academicDirector });
            toast({ title: 'Settings Saved', description: 'The Academic Director has been updated.'});
        } catch (error) {
            toast({ title: 'Error', description: 'Could not save settings.', variant: 'destructive'});
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Award /> Certificate Management</CardTitle>
                    <CardDescription>Manage certificate settings and view all issued certificates.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <h3 className="font-semibold">Certificate Settings</h3>
                    <div className="flex items-end gap-4 p-4 border rounded-lg">
                        <div className="flex-grow">
                             <Label htmlFor="academic-director">Academic Director</Label>
                             <Select value={academicDirector} onValueChange={setAcademicDirector}>
                                <SelectTrigger id="academic-director">
                                    <SelectValue placeholder="Select an admin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {admins.map(admin => (
                                        <SelectItem key={admin.uid} value={admin.displayName || ''}>
                                            {admin.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">This name will appear on all issued certificates.</p>
                        </div>
                        <Button onClick={handleSaveSettings} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Save
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Issued Certificates</CardTitle>
                    <CardDescription>A log of all certificates that have been issued to students.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Date Issued</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {issuedCertificates.map((cert, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={cert.studentAvatar} />
                                                    <AvatarFallback>{getInitials(cert.studentName)}</AvatarFallback>
                                                </Avatar>
                                                <span>{cert.studentName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{cert.courseTitle}</TableCell>
                                        <TableCell>{format(new Date(cert.issuedAt), 'PPP')}</TableCell>
                                    </TableRow>
                                ))}
                                {issuedCertificates.length === 0 && (
                                     <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-10">No certificates have been issued yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
