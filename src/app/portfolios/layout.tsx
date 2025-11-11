
'use client';

import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { OrganizationSidebar } from '@/components/OrganizationSidebar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { ClientOnly } from '@/components/ClientOnly';

export default function PortfoliosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOrganizationAdmin, isAdmin, loading } = useAuth();

  const isEmployer = isOrganizationAdmin || isAdmin;

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><LoadingAnimation /></div>;
  }

  return (
    <ClientOnly>
        <SidebarProvider>
        {isEmployer ? <OrganizationSidebar /> : <AppSidebar />}
        <SidebarInset>
            <Header />
            <div className="flex flex-col min-h-screen">
            {children}
            <Footer />
            </div>
        </SidebarInset>
        </SidebarProvider>
    </ClientOnly>
  );
}
