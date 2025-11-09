
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/shared/Footer";
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DocumentEditor, DocType } from '@/components/shared/DocumentEditor';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

export default function AdminTwitterPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.push('/admin');
        }
    }, [isSuperAdmin, authLoading, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </Link>
          <Card className="flex-grow flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon icon="simple-icons:x" className="h-6 w-6" />
                  Twitter (X) Integration Guide
                </CardTitle>
                <CardDescription>
                    Follow these steps to set up API access for posting automated notifications to your Twitter/X account.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                 <DocumentEditor docType={'TWITTER_SETUP' as DocType} />
              </CardContent>
            </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
