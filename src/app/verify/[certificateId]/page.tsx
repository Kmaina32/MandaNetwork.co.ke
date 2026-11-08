
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { getVerifiedCertificateData } from '@/lib/firebase-service';
import type { RegisteredUser, Course } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface VerificationResult {
    isValid: boolean;
    student?: Pick<RegisteredUser, 'displayName' | 'photoURL'>;
    course?: Pick<Course, 'id' | 'title'>;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

export default function VerifyCertificatePage() {
    const params = useParams<{ certificateId: string }>();
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verify = async () => {
            if (!params.certificateId) {
                setResult({ isValid: false });
                setLoading(false);
                return;
            }
            try {
                const verificationData = await getVerifiedCertificateData(params.certificateId);
                setResult(verificationData);
            } catch (error) {
                console.error("Verification failed:", error);
                setResult({ isValid: false });
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [params.certificateId]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
            <Card className="w-full max-w-lg text-center">
                {loading ? (
                    <CardContent className="p-10">
                        <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">Verifying certificate...</p>
                    </CardContent>
                ) : result?.isValid && result.student && result.course ? (
                    <>
                        <CardHeader>
                            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                            <CardTitle>Certificate Verified</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <Avatar className="h-24 w-24 mx-auto border-2 border-primary">
                                <AvatarImage src={result.student.photoURL || ''} />
                                <AvatarFallback className="text-3xl">{getInitials(result.student.displayName)}</AvatarFallback>
                            </Avatar>
                            <p>This is to certify that</p>
                            <p className="font-bold text-2xl">{result.student.displayName}</p>
                            <p>successfully completed the course</p>
                            <p className="font-bold text-xl text-primary">{result.course.title}</p>
                        </CardContent>
                    </>
                ) : (
                     <CardHeader>
                        <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                            <XCircle className="h-10 w-10 text-destructive" />
                        </div>
                        <CardTitle>Certificate Invalid</CardTitle>
                        <CardDescription>
                            This certificate could not be verified or does not exist.
                        </CardDescription>
                    </CardHeader>
                )}
                 <CardContent>
                    <Button asChild variant="outline">
                        <Link href="/">Back to Home</Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
