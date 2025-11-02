
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, FileSignature, FileText, Loader2, Presentation, Milestone } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DocumentEditor, DocType } from '@/components/shared/DocumentEditor';

const TABS_CONFIG = [
    { value: "PITCH_DECK", label: "Pitch Deck", icon: Presentation },
    { value: "FRAMEWORK", label: "Framework", icon: BookOpen },
    { value: "API", label: "API", icon: FileText },
    { value: "B2B_STRATEGY", label: "B2B Strategy", icon: FileSignature },
    { value: "SEO_STRATEGY", label: "SEO Strategy", icon: FileSignature },
    { value: "VISUAL_FRAMEWORK", label: "Visual Framework", icon: FileSignature },
    { value: "PORTFOLIO_ROADMAP", label: "Portfolio Roadmap", icon: Milestone },
];

export default function AdminDocumentsPage() {
    const { user, isSuperAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    
    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.push('/admin');
        }
    }, [isSuperAdmin, authLoading, router]);
    
    if (authLoading || !isSuperAdmin) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
    }


  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </Link>
          <Tabs defaultValue="PITCH_DECK" className="w-full flex-grow flex flex-col">
            <Card className="flex-grow flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Manage Documents
                </CardTitle>
                <CardDescription>View, edit, and generate formal documentation for your application.</CardDescription>
                 <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mt-4">
                    {TABS_CONFIG.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <TabsTrigger key={tab.value} value={tab.value}><Icon className="mr-2 h-4 w-4"/>{tab.label}</TabsTrigger>
                        )
                    })}
                 </TabsList>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                 {TABS_CONFIG.map(tab => (
                    <TabsContent key={tab.value} value={tab.value} className="h-full mt-0 flex-grow">
                        <DocumentEditor docType={tab.value as DocType} />
                    </TabsContent>
                ))}
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
