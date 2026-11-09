'use client';

import { useAuth } from '@/hooks/use-auth';
import { AdminSidebar } from '@/components/AdminSidebar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';
import { LoadingAnimation } from '@/components/LoadingAnimation';

function AdminAccessDenied() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow flex items-center justify-center bg-secondary/50">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-headline">Access Denied</CardTitle>
            <CardDescription>You do not have permission to view this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Homepage
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminAccessDenied />;
  }

  // isAdmin is the authorization decision from the auth provider. In particular,
  // the configured super-admin UID is authorized even if its optional profile
  // record has not yet been created or cannot be loaded.
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="min-w-0 w-full max-w-full overflow-x-clip">
        <Header />
        <div data-admin-content className="min-w-0 w-full max-w-full overflow-x-clip [&>*]:min-w-0 [&>*]:max-w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
