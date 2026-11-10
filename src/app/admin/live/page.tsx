
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Video, PhoneOff, Users, Hand, Mic, MicOff, Calendar, Maximize } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ref, onValue, set, remove, onChildAdded, query } from 'firebase/database';
import { createNotification, getAllCalendarEvents } from '@/lib/firebase-service';
import type { CalendarEvent } from '@/lib/mock-data';
import { LiveChat } from '@/components/LiveChat';
import { format, isPast, isToday, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EventForm } from '@/components/EventForm';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { NotebookSheet } from '@/components/NotebookSheet';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ViewerList } from '@/components/ViewerList';
import { NoLiveSession } from '@/components/NoLiveSession';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { SessionInfo } from '@/components/SessionInfo';
import { ClientOnly } from '@/components/ClientOnly';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

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

function NoSessionCard({ onGoLive, onScheduleSuccess }: { onGoLive: (event: CalendarEvent) => void; onScheduleSuccess: () => void; }) {
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    
    const handleInstantSession = () => {
        const instantEvent: CalendarEvent = {
            id: `instant-${Date.now()}`,
            title: 'Instant Live Session',
            description: 'A spontaneous live session.',
            date: new Date().toISOString()
        };
        onGoLive(instantEvent);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>No Active Session</CardTitle>
                <CardDescription>There is no live session currently running.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-10 border-2 border-dashed rounded-lg space-y-4">
                <NoLiveSession isLoading={false} hasPermission={true} />
                <div className="flex justify-center gap-4">
                     <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                        <DialogTrigger asChild>
                           <Button variant="outline">
                                <Calendar className="mr-2 h-4 w-4"/>
                                Schedule Session
                           </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[480px]">
                            <DialogHeader>
                                <DialogTitle>Create New Live Event</DialogTitle>
                                <DialogDescription>
                                    Fill out the form to schedule a new live session.
                                </DialogDescription>
                            </DialogHeader>
                            <EventForm
                                selectedDate={new Date()}
                                onSuccess={() => {
                                    setIsFormDialogOpen(false);
                                    onScheduleSuccess();
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                    <Button onClick={handleInstantSession}>
                        <Video className="mr-2 h-4 w-4"/>
                        Start Session Now
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


export default function AdminLivePage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const supabase = getSupabaseBrowserClient();
    const [isLive, setIsLive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingEvents, setIsFetchingEvents] = useState(true);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
    const [pastEvents, setPastEvents] = useState<CalendarEvent[]>([]);
    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);


    const videoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    const sessionId = 'live-session';
    const offerRef = ref(db, `webrtc-offers/${sessionId}`);
    const answersRef = ref(db, `webrtc-answers/${sessionId}`);
    
    const fetchEvents = async () => {
        setIsFetchingEvents(true);
        const allEvents = await getAllCalendarEvents();
        const now = new Date();
        const upcoming = allEvents
            .filter(e => !isPast(new Date(e.date)))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const past = allEvents
            .filter(e => isPast(new Date(e.date)))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setUpcomingEvents(upcoming);
        setPastEvents(past.slice(0, 5)); // show last 5
        setIsFetchingEvents(false);
    }
    
    useEffect(() => {
        fetchEvents();
        // Check for existing live session on page load
        onValue(offerRef, (snapshot) => {
            if (snapshot.exists()) {
                setIsLive(true);
            }
        }, { onlyOnce: true });

        return () => {
            if(isLive) {
                handleStopLive();
            }
        };
    }, []);
    
    const getCameraPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setHasCameraPermission(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            localStreamRef.current = stream;
            return stream;
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
                variant: 'destructive',
                title: 'Camera Access Denied',
                description: 'Please enable camera permissions to start a live session.',
            });
            return null;
        }
    };


    const handleGoLive = async (event: CalendarEvent) => {
        setIsLoading(true);
        const stream = await getCameraPermission();
        if (!stream) {
            setIsLoading(false);
            return;
        }

        if (!user) { setIsLoading(false); toast({ title: 'Sign in required', description: 'Sign in again to start a live class.', variant: 'destructive' }); return; }
        const { error: sessionError } = await supabase.from('live_sessions').upsert({
            id: sessionId, host_id: user.uid, title: event.title, status: 'live',
            metadata: { description: event.description || '' }, updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        if (sessionError) { setIsLoading(false); toast({ title: 'Could not start live chat', description: sessionError.message, variant: 'destructive' }); return; }

        const notificationPayload = {
            title: `🔴 Live Now: ${event.title}`,
            body: event.description || 'A live session has started. Join now!',
            link: '/live',
        };
        await createNotification(notificationPayload);
        toast({ title: 'Notifications Sent!', description: 'Students have been notified.'});

        // Create a single offer for the session
        const singlePc = new RTCPeerConnection(ICE_SERVERS);
        stream.getTracks().forEach(track => singlePc.addTrack(track, stream));
        const offer = await singlePc.createOffer();
        await singlePc.setLocalDescription(offer);

        await set(offerRef, { 
            sdp: offer.sdp, 
            type: offer.type,
            ...event
        });
        singlePc.close(); // Close this temp PC. We'll create new ones for each student.

        setActiveEvent(event);
        setIsLive(true);
        setIsLoading(false);
        toast({ title: 'You are now live!', description: 'Waiting for students to join.' });

        // Listen for answers from students
        onChildAdded(answersRef, async (snapshot) => {
            const studentId = snapshot.key;
            const studentAnswer = snapshot.val();
            
            if (!studentId || !studentAnswer || peerConnectionsRef.current.has(studentId)) return;

            console.log(`Received answer from ${studentId}`);

            const peerConnection = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionsRef.current.set(studentId, peerConnection);

            // Add local media tracks to the new connection
            localStreamRef.current?.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamRef.current!);
            });

            await peerConnection.setRemoteDescription(new RTCSessionDescription(studentAnswer));

            // Handle ICE candidates for this specific student
            peerConnection.onicecandidate = iceEvent => {
                if (iceEvent.candidate) {
                    set(ref(db, `webrtc-candidates/${sessionId}/admin/${studentId}/${Date.now()}`), iceEvent.candidate.toJSON());
                }
            };
            
            onChildAdded(ref(db, `webrtc-candidates/${sessionId}/student/${studentId}`), (candidateSnapshot) => {
                const candidate = candidateSnapshot.val();
                if (candidate) {
                   peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding ICE candidate:", e));
                }
            });
        });
    };

    const handleStopLive = async () => {
        setIsLoading(true);
        
        peerConnectionsRef.current.forEach(pc => pc.close());
        peerConnectionsRef.current.clear();

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        await supabase.from('live_sessions').update({ status: 'ended', updated_at: new Date().toISOString() }).eq('id', sessionId);
        await Promise.all([
            remove(offerRef),
            remove(answersRef),
            remove(ref(db, `webrtc-candidates/${sessionId}`)),
            remove(ref(db, `liveChat/${sessionId}`))
        ]);

        setIsLive(false);
        setActiveEvent(null);
        toast({ title: 'Stream Ended', description: 'You have stopped the live session.' });
        setIsLoading(false);
    };

    const toggleMute = () => {
        if(localStreamRef.current) {
            const wasMuted = isMuted;
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = wasMuted;
            });
            setIsMuted(!wasMuted);
        }
    }

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
                <div className="max-w-7xl mx-auto">
                    <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Admin Dashboard
                    </Link>
                    <ClientOnly>
                        <ResizablePanelGroup direction="horizontal">
                            <ResizablePanel defaultSize={70}>
                                <div className="flex flex-col h-full gap-4 pr-4">
                                    <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative shadow-lg border p-1">
                                        <video ref={videoRef} className="w-full h-full rounded-md object-cover" autoPlay muted playsInline />
                                        
                                        {isLive && activeEvent && <SessionInfo title={activeEvent.title} description={activeEvent.description} />}

                                        {isLive && (
                                            <div className="absolute top-4 right-4 z-20 pointer-events-auto">
                                                <ViewerList sessionId={sessionId} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center p-4">
                                            {!isLive && <NoLiveSession isLoading={hasCameraPermission === null} hasPermission={hasCameraPermission} />}
                                        </div>
                                    </div>

                                    {isLive && (
                                        <div className="bg-background/80 backdrop-blur-sm text-foreground p-3 rounded-lg flex items-center justify-center gap-4 text-sm shadow-md">
                                            <Button size="icon" variant={isMuted ? 'destructive' : 'secondary'} onClick={toggleMute} className="rounded-full h-12 w-12 shadow-lg">
                                                {isMuted ? <MicOff className="h-6 w-6"/> : <Mic className="h-6 w-6" />}
                                            </Button>
                                            <Button size="icon" variant="destructive" onClick={handleStopLive} disabled={isLoading} className="rounded-full h-14 w-14 shadow-lg">
                                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <PhoneOff className="h-6 w-6" />}
                                            </Button>
                                            <div className="w-12 h-12"></div>
                                        </div>
                                    )}
                                </div>
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={30}>
                                <div className="h-full flex flex-col pl-4 gap-6">
                                    {isLive ? (
                                        <LiveChat sessionId={sessionId} />
                                    ) : (
                                        <div className="space-y-6">
                                            {isFetchingEvents ? (
                                                <div className="flex justify-center items-center h-full"><LoadingAnimation /></div>
                                            ) : upcomingEvents.length > 0 && isToday(new Date(upcomingEvents[0].date)) ? (
                                                <UpcomingSessionCard event={upcomingEvents[0]} onGoLive={handleGoLive} />
                                            ) : (
                                                <NoSessionCard onGoLive={handleGoLive} onScheduleSuccess={fetchEvents} />
                                            )}
                                            
                                        <Card>
                                                <CardHeader>
                                                    <CardTitle>Upcoming Sessions</CardTitle>
                                                    <CardDescription>Your next scheduled live events.</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    {upcomingEvents.length > 0 ? (
                                                        <ScrollArea>
                                                            <div className="flex space-x-4 pb-4">
                                                                {upcomingEvents.map(event => (
                                                                <div key={event.id} className="min-w-[250px]">
                                                                    <Card>
                                                                    <CardHeader>
                                                                        <CardTitle className="text-base truncate">{event.title}</CardTitle>
                                                                        <CardDescription>{format(new Date(event.date), 'PPP')}</CardDescription>
                                                                    </CardHeader>
                                                                    </Card>
                                                                </div>
                                                                ))}
                                                            </div>
                                                            <ScrollBar orientation="horizontal" />
                                                        </ScrollArea>
                                                    ) : (
                                                        <p className="text-muted-foreground text-sm text-center py-4">No upcoming sessions scheduled.</p>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Past Sessions</CardTitle>
                                                    <CardDescription>A log of your recent live events.</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    {isFetchingEvents ? (
                                                        <p className="text-muted-foreground text-sm">Loading...</p>
                                                    ) : pastEvents.length > 0 ? (
                                                        <ul className="space-y-3">
                                                            {pastEvents.map(event => (
                                                                <li key={event.id} className="flex items-center justify-between text-sm">
                                                                    <span className="font-medium">{event.title}</span>
                                                                    <span className="text-muted-foreground">{format(new Date(event.date), 'PPP')}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-muted-foreground text-sm text-center py-4">No past sessions found.</p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ClientOnly>
                     {isLive && activeEvent && <NotebookSheet courseId={sessionId} courseTitle={activeEvent.title} />}
                </div>
            </main>
        </div>
    );
}
