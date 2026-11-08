'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PortalSidebar } from '@/components/PortalSidebar';
import { useEffect } from 'react';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const requested = `${pathname || '/portal'}${typeof window !== 'undefined' ? window.location.search : ''}`;
      router.replace(`/login?redirect=${encodeURIComponent(requested)}`);
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center"><LoadingAnimation /></div>;
  }

  return (
    <SidebarProvider>
      <PortalSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          {children}
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
