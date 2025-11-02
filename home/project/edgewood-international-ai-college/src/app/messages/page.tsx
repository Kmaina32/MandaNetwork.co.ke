
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from "@/components/Footer";
import { ArrowLeft, Mail, Loader2, Send } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import type { Conversation } from '@/lib/types';
import { getConversationsForUser, getMessagesForConversation, sendMessage } from '@/lib/firebase-service';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { NoConversationSelected } from '@/components/shared/NoConversationSelected';

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 && names[1] ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Conversation['messages']>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/messages');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const unsubscribe = getConversationsForUser(user.uid, (convos) => {
        setConversations(convos);
        setLoadingConversations(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      setLoadingMessages(true);
      const unsubscribe = getMessagesForConversation(selectedConversation.id, (msgs) => {
        setMessages(msgs);
        setLoadingMessages(false);
      });
      return () => unsubscribe();
    }
  }, [selectedConversation]);
  
  const handleSendMessage = async () => {
    if (!reply.trim() || !selectedConversation || !user) return;
    setIsSending(true);
    try {
        await sendMessage(selectedConversation.id, {
            senderId: user.uid,
            text: reply,
            timestamp: new Date().toISOString(),
        });
        setReply('');
    } catch(e) {
        toast({title: 'Error', description: 'Could not send message.', variant: 'destructive'});
    } finally {
        setIsSending(false);
    }
  }

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center"><LoadingAnimation /></div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="h-[calc(100vh-4rem)]">
          <ResizablePanelGroup direction="horizontal" className="h-full max-w-full">
            <ResizablePanel defaultSize={30} minSize={25} className="min-w-[300px]">
              <div className="flex h-full flex-col">
                <div className="p-4 border-b">
                   <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5"/> Inbox</h2>
                   <p className="text-sm text-muted-foreground">{conversations.length} conversations</p>
                </div>
                <ScrollArea className="flex-1">
                    {loadingConversations ? <LoadingAnimation /> : conversations.map(convo => {
                        const otherParticipantKey = Object.keys(convo.participants).find(id => id !== user?.uid);
                        if (!otherParticipantKey) return null;
                        const otherParticipant = convo.participants[otherParticipantKey];
                        
                        return (
                            <button 
                                key={convo.id}
                                onClick={() => setSelectedConversation(convo)}
                                className={cn(
                                    "flex w-full items-center gap-3 p-4 text-left hover:bg-secondary transition-colors",
                                    selectedConversation?.id === convo.id && 'bg-secondary'
                                )}
                            >
                                <Avatar className="h-10 w-10 relative">
                                    <AvatarImage src={otherParticipant.photoURL} />
                                    <AvatarFallback>{getInitials(otherParticipant.name)}</AvatarFallback>
                                    {otherParticipant.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"/>}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{otherParticipant.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{convo.lastMessage?.text || 'No messages yet'}</p>
                                </div>
                                <p className="text-xs text-muted-foreground self-start">{convo.lastMessage ? formatDistanceToNow(new Date(convo.lastMessage.timestamp), { addSuffix: true }) : ''}</p>
                            </button>
                        )
                    })}
                </ScrollArea>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70}>
                {selectedConversation ? (
                     <div className="flex flex-col h-full">
                        <div className="p-4 border-b flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={selectedConversation.participants[Object.keys(selectedConversation.participants).find(id => id !== user?.uid)!].photoURL} />
                                <AvatarFallback>{getInitials(selectedConversation.participants[Object.keys(selectedConversation.participants).find(id => id !== user?.uid)!].name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-semibold">{selectedConversation.participants[Object.keys(selectedConversation.participants).find(id => id !== user?.uid)!].name}</h3>
                                <p className="text-xs text-muted-foreground">Replying to your portfolio inquiry</p>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 p-6">
                            {loadingMessages ? <LoadingAnimation /> : (
                                <div className="space-y-6">
                                    {Object.values(messages || {}).map((msg, index) => (
                                        <div key={index} className={cn("flex items-end gap-2", msg.senderId === user?.uid ? 'justify-end' : 'justify-start')}>
                                            {msg.senderId !== user?.uid && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={selectedConversation.participants[msg.senderId]?.photoURL} />
                                                    <AvatarFallback>{getInitials(selectedConversation.participants[msg.senderId]?.name)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={cn(
                                                "max-w-md rounded-lg px-4 py-2",
                                                msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-secondary"
                                            )}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                             {msg.senderId === user?.uid && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user?.photoURL || ''} />
                                                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <div className="p-4 border-t bg-background">
                            <div className="relative">
                                <Textarea 
                                    placeholder="Type your message..."
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                    className="pr-16"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <Button 
                                    size="icon" 
                                    className="absolute right-2 bottom-2" 
                                    onClick={handleSendMessage}
                                    disabled={isSending || !reply.trim()}
                                >
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                     </div>
                ) : (
                    <NoConversationSelected />
                )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
