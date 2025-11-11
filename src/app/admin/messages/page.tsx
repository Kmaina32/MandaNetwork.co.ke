
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Mail, Trash2, Eye, Archive, Inbox, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';
import type { ContactMessage } from '@/lib/types';
import { getContactMessages, deleteContactMessage, markContactMessageAsRead } from '@/lib/firebase-service';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function AdminMessagesPage() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const { toast } = useToast();

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const fetchedMessages = await getContactMessages();
            setMessages(fetchedMessages);
            if(fetchedMessages.length > 0 && !selectedMessage) {
                setSelectedMessage(fetchedMessages[0]);
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error);
            toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleSelectMessage = async (message: ContactMessage) => {
        setSelectedMessage(message);
        if (!message.read) {
            await markContactMessageAsRead(message.id);
            const updatedMessages = messages.map(m => m.id === message.id ? { ...m, read: true } : m);
            setMessages(updatedMessages);
        }
    };

    const handleDelete = async (messageId: string) => {
        const nextMessageIndex = messages.findIndex(m => m.id === messageId) -1;
        
        try {
            await deleteContactMessage(messageId);
            toast({ title: "Message Deleted", description: "The message has been permanently deleted." });
            
            const newMessages = messages.filter(m => m.id !== messageId);
            setMessages(newMessages);

            if (newMessages.length > 0) {
                 setSelectedMessage(newMessages[Math.max(0, nextMessageIndex)]);
            } else {
                setSelectedMessage(null);
            }
        } catch (error) {
            toast({ title: "Error", description: "Could not delete the message.", variant: "destructive" });
        }
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-full"><LoadingAnimation /></div>
    }

    return (
        <div className="max-w-7xl mx-auto h-full flex flex-col">
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Admin Dashboard
            </Link>

            <Card className="flex-grow">
                <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
                    <ResizablePanel defaultSize={30} minSize={25}>
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5"/> Inbox</h2>
                                <p className="text-sm text-muted-foreground">{messages.length} messages</p>
                            </div>
                             <div className="flex-grow overflow-y-auto">
                               {messages.length > 0 ? messages.map(message => (
                                    <button
                                        key={message.id}
                                        onClick={() => handleSelectMessage(message)}
                                        className={cn(
                                            "w-full text-left p-4 border-b hover:bg-secondary transition-colors",
                                            selectedMessage?.id === message.id && "bg-secondary"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className={cn("font-semibold text-sm", !message.read && "text-foreground")}>{message.name}</p>
                                            {!message.read && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5"></span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{message.email}</p>
                                        <p className={cn("text-xs text-muted-foreground truncate mt-1", !message.read && "font-semibold text-foreground/80")}>
                                            {message.message}
                                        </p>
                                         <p className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</p>
                                    </button>
                               )) : (
                                   <div className="p-4 text-center text-sm text-muted-foreground">
                                       <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2"/>
                                       No messages.
                                   </div>
                               )}
                            </div>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={70}>
                        {selectedMessage ? (
                             <div className="flex flex-col h-full">
                                <div className="p-4 border-b flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold">{selectedMessage.name}</h3>
                                        <a href={`mailto:${selectedMessage.email}`} className="text-sm text-muted-foreground hover:underline">{selectedMessage.email}</a>
                                    </div>
                                    <div className="flex gap-2">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(selectedMessage.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button asChild variant="default">
                                            <a href={`mailto:${selectedMessage.email}`}>
                                                <Mail className="mr-2 h-4 w-4" />
                                                Reply
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                                 <div className="p-6 text-sm whitespace-pre-wrap flex-grow overflow-y-auto">
                                   {selectedMessage.message}
                                </div>
                                <div className="p-4 border-t text-xs text-muted-foreground text-right">
                                    Received: {format(new Date(selectedMessage.createdAt), 'PPP p')}
                                </div>
                            </div>
                        ) : (
                             <div className="h-full flex flex-col justify-center items-center text-center text-muted-foreground p-4">
                                <Inbox className="h-16 w-16 mb-4 text-muted-foreground/50"/>
                                <h3 className="text-lg font-semibold">Select a message</h3>
                                <p className="text-sm">Choose a message from the list to view its content.</p>
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </Card>
        </div>
    );
}
