
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { FilePen, CheckCircle, ArrowRight } from 'lucide-react';
import type { Form as FormType } from '@/lib/types';
import { getAllForms, getFormSubmissionsByUserId } from '@/lib/firebase-service';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OrganizationFormsPage() {
    const { organization, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [forms, setForms] = useState<FormType[]>([]);
    const [completedFormIds, setCompletedFormIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return; // Wait for authentication to resolve

        if (!user || !organization) {
            setLoading(false); // No user/org, so stop loading
            // Optional: redirect or show message if user should be logged in
            return;
        }

        const fetchFormsAndSubmissions = async () => {
            try {
                const [allForms, userSubmissions] = await Promise.all([
                    getAllForms(),
                    getFormSubmissionsByUserId(user.uid)
                ]);

                // Filter forms assigned to the org or public
                const assignedForms = allForms.filter(form => !form.organizationId || form.organizationId === organization.id);
                setForms(assignedForms);

                // Create a set of completed form IDs for quick lookup
                const completedIds = new Set(userSubmissions.map(sub => sub.formId));
                setCompletedFormIds(completedIds);

            } catch (error) {
                console.error("Failed to fetch forms and submissions:", error);
            } finally {
                setLoading(false); // Ensure loading is stopped in all cases
            }
        };

        fetchFormsAndSubmissions();
    }, [user, organization, authLoading]);


    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-full"><LoadingAnimation /></div>
    }

    return (
        <div className="space-y-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FilePen /> Forms & Surveys</CardTitle>
                    <CardDescription>
                       Respond to forms and surveys assigned by your organization or the platform administrators.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {forms.length > 0 ? (
                        <div className="space-y-4">
                            {forms.map(form => (
                                <Card key={form.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{form.title}</h3>
                                            {completedFormIds.has(form.id) && (
                                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                                    <CheckCircle className="h-3 w-3 mr-1"/>
                                                    Completed
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{form.description}</p>
                                    </div>
                                    <Button asChild disabled={completedFormIds.has(form.id)}>
                                        <Link href={`/forms/${form.id}`}>
                                            {completedFormIds.has(form.id) ? 'Submitted' : 'Fill Form'}
                                            {!completedFormIds.has(form.id) && <ArrowRight className="ml-2 h-4 w-4"/>}
                                        </Link>
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    ) : (
                       <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>No forms have been assigned to your organization yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
