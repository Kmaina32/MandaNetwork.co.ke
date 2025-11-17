
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function OrganizationFormsPage() {
    const { loading } = useAuth();

    if (loading) {
        return <div className="flex justify-center items-center h-full"><LoadingAnimation /></div>
    }

    return (
        <div className="space-y-8">
             <Card>
                <CardHeader>
                    <CardTitle>Forms & Surveys</CardTitle>
                    <CardDescription>
                       Respond to forms and surveys assigned by the platform administrators.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>No forms have been assigned to your organization yet.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
