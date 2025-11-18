
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { Hand, Loader2, PhoneOff, Maximize } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { onValue, ref, onChildAdded, set, remove, off } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { ViewerList } from '@/components/ViewerList';
import { SessionInfo } from '@/components/SessionInfo';
import { NoLiveSession } from '@/components/NoLiveSession';
import { LiveReactions } from './LiveReactions';
import { ReactionButton } from './ReactionButton';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

type ConnectionState = 'new' | 'connecting' | 'connected' | 'failed' | 'closed';

export function MemberViewer({ sessionId, isSessionActive }: { sessionId: string; isSessionActive: boolean }) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [liveSessionDetails, setLiveSessionDetails] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [handRaised, setHandRaised] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const connectionStateRef = useRef<ConnectionState>('new');
    const videoContainerRef = useRef<HTMLDivElement>(null);
    
     useEffect(() => {
        const requestMediaPermissions = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                stream.getTracks().forEach(track => track.stop());
                setHasCameraPermission(true);
            } catch (error) {
                console.error("Error getting media permissions", error);
                setHasCameraPermission(false);
                toast({
                    title: 'Permissions Required',
                    description: 'Please allow camera and microphone access to join the live session.',
                    variant: 'destructive',
                });
            }
        };
        requestMediaPermissions();
    }, [toast]);

    useEffect(() => {
        if (!user || hasCameraPermission === null) {
            setIsLoading(false);
            return;
        };

        const offerRef = ref(db, `webrtc-offers/${sessionId}`);
        const candidatesRef = ref(db, `webrtc-candidates/${sessionId}/admin/${user.uid}`);
        let unsubscribeOffer: () => void;
        let unsubscribeCandidates: () => void;


        unsubscribeOffer = onValue(offerRef, async (snapshot) => {
            if (snapshot.exists()) {
                if (connectionStateRef.current !== 'new' && connectionStateRef.current !== 'closed') return;
                
                connectionStateRef.current = 'connecting';
                
                const sessionData = snapshot.val();
                setLiveSessionDetails(sessionData);
                setIsLoading(false);
                
                const offerDescription = sessionData;
                const pc = new RTCPeerConnection(ICE_SERVERS);
                peerConnectionRef.current = pc;

                pc.onicecandidate = (event) => {
                    if (event.candidate && user) {
                        set(ref(db, `webrtc-candidates/${sessionId}/student/${user.uid}/${Date.now()}`), event.candidate.toJSON());
                    }
                };

                pc.ontrack = (event) => {
                    if (videoRef.current && event.streams[0]) {
                        videoRef.current.srcObject = event.streams[0];
                    }
                };
                
                pc.onconnectionstatechange = () => {
                    if(pc.connectionState === 'connected') connectionStateRef.current = 'connected';
                };
                
                await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
                const answerDescription = await pc.createAnswer();
                await pc.setLocalDescription(answerDescription);

                await set(ref(db, `webrtc-answers/${sessionId}/${user.uid}`), {
                    type: answerDescription.type,
                    sdp: answerDescription.sdp,
                });
                
                unsubscribeCandidates = onChildAdded(candidatesRef, (candidateSnapshot) => {
                    const candidate = candidateSnapshot.val();
                    if(candidate) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding ICE candidate:", e));
                });


            } else {
                setLiveSessionDetails(null);
                setIsLoading(false);
                if (peerConnectionRef.current) {
                    peerConnectionRef.current.close();
                    peerConnectionRef.current = null;
                }
                if (videoRef.current) videoRef.current.srcObject = null;
                connectionStateRef.current = 'closed';
            }
        });

        return () => {
            if (unsubscribeOffer) unsubscribeOffer();
            if (unsubscribeCandidates) unsubscribeCandidates();
            if (peerConnectionRef.current) peerConnectionRef.current.close();
            if (user) {
                remove(ref(db, `webrtc-answers/${sessionId}/${user.uid}`));
                remove(ref(db, `webrtc-candidates/${sessionId}/student/${user.uid}`));
            }
            connectionStateRef.current = 'closed';
        };

    }, [user, hasCameraPermission, sessionId, toast]);

    const handleLeave = () => router.push('/dashboard');
    
    const toggleHandRaised = async () => {
        if (!user || !sessionId) return;
        const newHandRaisedState = !handRaised;
        setHandRaised(newHandRaisedState);
        const handRaisedRef = ref(db, `webrtc-answers/${sessionId}/${user.uid}/handRaised`);
        await set(handRaisedRef, newHandRaisedState);
    };

    const handleFullScreen = () => {
        if (videoContainerRef.current && !document.fullscreenElement) {
            videoContainerRef.current.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };
    
    return (
        <>
            <div ref={videoContainerRef} className="aspect-video w-full h-full bg-black flex items-center justify-center relative rounded-lg border shadow-lg p-1">
                <LiveReactions sessionId={sessionId} />
                {isSessionActive ? (
                    <>
                        <video ref={videoRef} className="w-full h-full object-contain rounded-md" autoPlay playsInline />
                        <SessionInfo title={liveSessionDetails?.title || 'Live Session'} description={liveSessionDetails?.description || 'Welcome to the class!'} />
                        {sessionId && (
                            <div className="absolute top-4 right-4 z-20">
                                <ViewerList sessionId={sessionId} />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <NoLiveSession isLoading={isLoading} hasPermission={hasCameraPermission} />
                    </div>
                )}
            </div>
            
            {isSessionActive && (
                 <div className="bg-background/80 mt-4 backdrop-blur-sm text-foreground p-3 rounded-lg flex items-center justify-center gap-4 text-sm shadow-md">
                    <ReactionButton sessionId={sessionId} />
                    <Button size="icon" variant={handRaised ? 'default' : 'secondary'} onClick={toggleHandRaised} className="rounded-full h-12 w-12 shadow-lg">
                        <Hand className="h-6 w-6" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={handleLeave} className="rounded-full h-14 w-14 shadow-lg">
                        <PhoneOff className="h-6 w-6" />
                    </Button>
                    <Button size="icon" variant="secondary" onClick={handleFullScreen} className="rounded-full h-12 w-12 shadow-lg">
                        <Maximize className="h-6 w-6" />
                    </Button>
                     <div className="w-12 h-12"></div>
                </div>
            )}
        </>
    );
}
