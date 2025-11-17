
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from 'lucide-react';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { getFormById, getFormSubmissions, getUserById } from '@/lib/firebase-service';
import type { Form as FormType, FormSubmission as SubmissionType, RegisteredUser } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface SubmissionWithUser extends SubmissionType {
    user?: RegisteredUser;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

export default function OrgFormSubmissionsPage() {
    const params = useParams<{ formId: string }>();
    const [form, setForm] = useState<FormType | null>(null);
    const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const formId = params.formId as string;
                const [formData, submissionsData] = await Promise.all([
                    getFormById(formId),
                    getFormSubmissions(formId),
                ]);
                
                if (!formData) notFound();
                setForm(formData);
                
                const submissionsWithUsers = await Promise.all(
                    submissionsData.map(async (sub) => {
                        const user = await getUserById(sub.userId);
                        return { ...sub, user };
                    })
                );

                setSubmissions(submissionsWithUsers);
            } catch (error) {
                console.error("Failed to fetch submission data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.formId]);

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><LoadingAnimation/></div>
    }
    
    if (!form) {
        notFound();
    }

    return (
        <div className="space-y-8">
            <Link href="/organization/forms" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Forms
            </Link>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText /> Submissions for "{form.title}"</CardTitle>
                    <CardDescription>
                        {submissions.length} {submissions.length === 1 ? 'response' : 'responses'} received.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     {submissions.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-4">
                            {submissions.map(sub => (
                                <AccordionItem value={sub.id} key={sub.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={sub.user?.photoURL || ''} />
                                                <AvatarFallback>{getInitials(sub.user?.displayName)}</AvatarFallback>
                                            </Avatar>
                                            <div className="text-left">
                                                <p className="font-semibold">{sub.user?.displayName}</p>
                                                <p className="text-xs text-muted-foreground">{format(new Date(sub.submittedAt), 'PPP p')}</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4 pl-12 pt-2">
                                            {form.questions.map(q => {
                                                const answer = sub.answers[q.id];
                                                return (
                                                    <div key={q.id}>
                                                        <p className="font-medium text-sm">{q.text}</p>
                                                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{String(answer)}</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No submissions have been received for this form yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
         </div>
    )
}
