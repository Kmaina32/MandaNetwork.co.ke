
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { createNotification, getAllCalendarEvents, createCalendarEvent } from '@/lib/firebase-service';
import { Loader2, PhoneOff, VideoOff, Mic, MicOff, Video, Calendar } from 'lucide-react';
import { onValue, ref, onChildAdded, set, remove, query } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { ViewerList } from '@/components/ViewerList';
import { NoLiveSession } from '@/components/NoLiveSession';
import { LiveReactions } from './LiveReactions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { EventForm } from './EventForm';
import type { CalendarEvent } from '@/lib/types';
import { formatDistanceToNow, isToday, isPast } from 'date-fns';


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
            eventDate.setHours(0,0,0,0);
            if (isToday(eventDate)) {
                 setTimeLeft("Today");
            } else {
                 setTimeLeft(formatDistanceToNow(eventDate, { addSuffix: true }));
            }
        };

        updateTimer();
        const timer = setInterval(updateTimer, 60000);
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

function NoSessionControls({ onGoLive, onScheduleSuccess }: { onGoLive: (event: CalendarEvent) => void; onScheduleSuccess: () => void; }) {
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
    const [isFetchingEvents, setIsFetchingEvents] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setIsFetchingEvents(true);
            const allEvents = await getAllCalendarEvents();
            const upcoming = allEvents
                .filter(e => !isPast(new Date(e.date)))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setUpcomingEvents(upcoming);
            setIsFetchingEvents(false);
        };
        fetchEvents();
    }, [onScheduleSuccess]);
    
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
        return <div className="p-4"><Loader2 className="animate-spin" /></div>;
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
                        <VideoOff className="mr-2 h-4 w-4"/>
                        Start Instant Session
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function AdminHostView({ sessionId, isSessionActive }: { sessionId: string; isSessionActive: boolean }) {
    const { organization } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [eventsNeedRefresh, setEventsNeedRefresh] = useState(false);


    const videoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    
    const offerRef = ref(db, `webrtc-offers/${sessionId}`);
    const answersRef = ref(db, `webrtc-answers/${sessionId}`);
    const candidatesRef = ref(db, `webrtc-candidates/${sessionId}`);
    
     useEffect(() => {
        const getCameraPermissionOnInit = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                localStreamRef.current = stream;
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
            }
        };

        getCameraPermissionOnInit();

        return () => {
            if (isSessionActive) {
                handleStopLive();
            }
        }
    }, []);

     const handleGoLive = async (event: CalendarEvent) => {
        if (!localStreamRef.current) {
             toast({
                variant: 'destructive',
                title: 'Camera Access Denied',
                description: 'Please enable camera permissions to start a live session.',
            });
            return;
        }

        setIsLoading(true);

        const notificationPayload = {
            title: `🔴 Live Now: ${event.title}`,
            body: event.description || 'A live session has started. Join now!',
            link: '/live',
            ...(organization && { cohort: organization.id }), // Target org members if applicable
        };
        await createNotification(notificationPayload);
        toast({ title: 'Notifications Sent!', description: 'Your organization members have been notified.'});

        const singlePc = new RTCPeerConnection(ICE_SERVERS);
        localStreamRef.current.getTracks().forEach(track => singlePc.addTrack(track, localStreamRef.current!));
        const offer = await singlePc.createOffer();
        await singlePc.setLocalDescription(offer);

        await set(offerRef, { sdp: offer.sdp, type: offer.type, title: event.title, description: event.description });
        singlePc.close();
        
        toast({ title: 'You are now live!', description: 'Waiting for members to join.' });

        onChildAdded(answersRef, async (snapshot) => {
            const studentId = snapshot.key;
            const studentAnswer = snapshot.val();
            
            if (!studentId || !studentAnswer || peerConnectionsRef.current.has(studentId)) return;

            const peerConnection = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionsRef.current.set(studentId, peerConnection);

            localStreamRef.current?.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamRef.current!);
            });

            await peerConnection.setRemoteDescription(new RTCSessionDescription(studentAnswer));

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
        
        await Promise.all([
            remove(offerRef),
            remove(answersRef),
            remove(candidatesRef),
            remove(ref(db, `liveChat/${sessionId}`)),
            remove(ref(db, `liveReactions/${sessionId}`))
        ]);
        
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

    if (!isSessionActive) {
        return <NoSessionControls onGoLive={handleGoLive} onScheduleSuccess={() => setEventsNeedRefresh(true)} />;
    }

    return (
        <>
            <div className="w-full h-full bg-black flex items-center justify-center relative rounded-lg border shadow-lg p-1">
                <LiveReactions sessionId={sessionId} />
                <video ref={videoRef} className="w-full h-full rounded-md object-cover" autoPlay muted playsInline />
                
                <div className="absolute top-4 right-4 z-20 pointer-events-auto">
                    <ViewerList sessionId={sessionId} />
                </div>
            </div>

            <div className="bg-background/80 mt-4 backdrop-blur-sm text-foreground p-3 rounded-lg flex items-center justify-center gap-4 text-sm shadow-md">
                <Button size="icon" variant={isMuted ? 'destructive' : 'secondary'} onClick={toggleMute} className="rounded-full h-12 w-12 shadow-lg">
                    {isMuted ? <MicOff className="h-6 w-6"/> : <Mic className="h-6 w-6" />}
                </Button>
                <Button size="icon" variant="destructive" onClick={handleStopLive} disabled={isLoading} className="rounded-full h-14 w-14 shadow-lg">
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <PhoneOff className="h-6 w-6" />}
                </Button>
                <div className="w-12 h-12"></div> {/* Spacer */}
            </div>
        </>
    );
}
