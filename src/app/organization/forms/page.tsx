

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { FilePen } from 'lucide-react';
import type { Form as FormType } from '@/lib/types';

export default function OrganizationFormsPage() {
    const { organization, loading } = useAuth();
    const [forms, setForms] = useState<FormType[]>([]);
    const [loadingForms, setLoadingForms] = useState(true);

    useEffect(() => {
        const fetchForms = async () => {
            if (!organization) return;
            setLoadingForms(true);
            // TODO: Implement getFormsByOrganization(organization.id)
            // For now, it will be an empty array.
            setForms([]); 
            setLoadingForms(false);
        };

        if (!loading) {
            fetchForms();
        }
    }, [organization, loading]);


    if (loading || loadingForms) {
        return <div className="flex justify-center items-center h-full"><LoadingAnimation /></div>
    }

    return (
        <div className="space-y-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FilePen /> Forms & Surveys</CardTitle>
                    <CardDescription>
                       Respond to forms and surveys assigned by the platform administrators.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {forms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Map through forms here */}
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
