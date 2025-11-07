
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getAllCalendarEvents, createNotification } from '@/lib/firebase-service';
import type { CalendarEvent } from '@/lib/types';
import { formatDistanceToNow, isToday, isPast } from 'date-fns';
import { Video } from 'lucide-react';
import { VideoOff } from 'lucide-react';
import { NoLiveSession } from '@/components/NoLiveSession';

function UpcomingSessionCard({ event, onGoLive }: { event: CalendarEvent, onGoLive: (event: CalendarEvent) => void }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const eventDate = new Date(event.date);
            // Assuming event time is start of day, adjust if time is stored
            eventDate.setHours(0,0,0,0);
            if (isToday(eventDate)) {
                 setTimeLeft("Today");
            } else {
                 setTimeLeft(formatDistanceToNow(eventDate, { addSuffix: true }));
            }
        };

        updateTimer();
        const timer = setInterval(updateTimer, 60000); // update every minute
        return () => clearInterval(timer);
    }, [event]);

    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Upcoming Session</span>
                </CardTitle>
                <CardDescription>{event.title}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
                <span className="text-sm font-semibold text-primary">{timeLeft}</span>
                <Button onClick={() => onGoLive(event)}>
                    <Video className="mr-2 h-4 w-4"/>
                    Start Session Now
                </Button>
            </CardContent>
        </Card>
    );
}

function NoSessionArea({ onGoLive }: { onGoLive: (event: CalendarEvent) => void }) {
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
    const [isFetchingEvents, setIsFetchingEvents] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setIsFetchingEvents(true);
            const allEvents = await getAllCalendarEvents();
            const upcoming = allEvents
                .filter(e => !isPast(new Date(e.date)))
                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setUpcomingEvents(upcoming);
            setIsFetchingEvents(false);
        };
        fetchEvents();
    }, []);
    
    const handleInstantSession = () => {
        const instantEvent: CalendarEvent = {
            id: `instant-${Date.now()}`,
            title: 'Instant Live Session',
            description: 'A spontaneous live session.',
            date: new Date().toISOString()
        };
        onGoLive(instantEvent);
    }

    if (isFetchingEvents) {
        return <div className="flex justify-center items-center h-full"><LoadingAnimation /></div>
    }

    if (upcomingEvents.length > 0 && isToday(new Date(upcomingEvents[0].date))) {
        return <UpcomingSessionCard event={upcomingEvents[0]} onGoLive={onGoLive} />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>No Active Session</CardTitle>
                <CardDescription>There is no live session currently running.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-10 border-2 border-dashed rounded-lg space-y-4">
                <div className="flex justify-center gap-4">
                    <Button variant="outline">
                        <Calendar className="mr-2 h-4 w-4"/>
                        Schedule Session
                    </Button>
                    <Button onClick={handleInstantSession}>
                        <VideoOff className="mr-2 h-4 w-4"/>
                        Start Session Now
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


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
                    <AdminHostView sessionId={sessionId} />
                ) : (
                    <MemberViewer sessionId={sessionId} />
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
                        <AdminHostView sessionId={sessionId} />
                    ) : (
                        <MemberViewer sessionId={sessionId} />
                    )}
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30}>
                 <div className="h-full flex flex-col pl-4 gap-6">
                    {isSessionActive ? (
                        <LiveChat sessionId={sessionId} />
                    ) : isHost ? (
                        <NoSessionArea onGoLive={(event) => console.log('start session')} />
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
