
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { onValue, ref } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { NotebookSheet } from '@/components/NotebookSheet';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { AdminHostView } from '@/components/AdminHostView';
import { MemberViewer } from '@/components/MemberViewer';
import { ClientOnly } from '@/components/ClientOnly';
import { useIsMobile } from '@/hooks/use-mobile';
import { LiveChat } from '@/components/LiveChat';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageSquare, Calendar } from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { NoLiveSession } from '@/components/NoLiveSession';


export default function LivePage() {
    const { user, loading, isAdmin, isOrganizationAdmin, organization } = useAuth();
    const router = useRouter();
    const isMobile = useIsMobile();
    const [liveSessionDetails, setLiveSessionDetails] = useState<any>(null);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    
    const isHost = isAdmin || isOrganizationAdmin;

    let sessionId = 'live-session'; // Default public session
    if (organization?.id) {
        sessionId = `org-live-session-${organization.id}`;
    }

    // This effect determines if a session is active and sets details
    useEffect(() => {
        if (!sessionId) return;
        const offerRef = ref(db, `webrtc-offers/${sessionId}`);
        const unsubscribe = onValue(offerRef, (snapshot) => {
            const sessionExists = snapshot.exists();
            setIsSessionActive(sessionExists);
            setLiveSessionDetails(sessionExists ? snapshot.val() : null);
            setCheckingSession(false);
        });
        return () => unsubscribe();
    }, [sessionId]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?redirect=/live');
        }
    }, [user, loading, router]);

    if (loading || checkingSession) {
        return <div className="flex h-screen items-center justify-center"><LoadingAnimation /></div>;
    }

    const renderMobileLayout = () => (
        <div className="flex flex-col h-full">
            <div className="flex-grow flex items-center justify-center relative">
                {isHost ? (
                    <AdminHostView sessionId={sessionId} isSessionActive={isSessionActive} />
                ) : (
                    <MemberViewer sessionId={sessionId} isSessionActive={isSessionActive} />
                )}
            </div>
             <Sheet>
                <SheetTrigger asChild>
                    <Button className="fixed bottom-6 left-1/2 -translate-x-1/2 h-14 rounded-full shadow-lg z-30">
                        <MessageSquare className="mr-2 h-6 w-6" /> Chat
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0 rounded-t-lg">
                    <LiveChat sessionId={sessionId} />
                </SheetContent>
            </Sheet>
        </div>
    );
    
    const renderDesktopLayout = () => (
         <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={70}>
                <div className="flex flex-col h-full gap-4 pr-4">
                     {isHost ? (
                        <AdminHostView sessionId={sessionId} isSessionActive={isSessionActive} />
                    ) : (
                        <MemberViewer sessionId={sessionId} isSessionActive={isSessionActive} />
                    )}
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30}>
                 <div className="h-full flex flex-col pl-4 gap-6">
                    {isSessionActive ? (
                        <LiveChat sessionId={sessionId} />
                    ) : (
                         <div className="h-full flex items-center justify-center">
                            <NoLiveSession isLoading={false} hasPermission={true} />
                         </div>
                    )}
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    );

    return (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <Header />
            <div className="h-[calc(100vh-4rem)] bg-secondary/50 p-4">
                <ClientOnly>
                    {isMobile ? renderMobileLayout() : renderDesktopLayout()}
                </ClientOnly>
                {liveSessionDetails && <NotebookSheet courseId={sessionId} courseTitle={liveSessionDetails?.title || 'Live Session Notes'} />}
            </div>
          </SidebarInset>
        </SidebarProvider>
    );
}
