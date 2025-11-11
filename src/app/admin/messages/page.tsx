
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Mail, Trash2, Eye, Archive, Inbox, MessageSquare } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const fetchedMessages = await getContactMessages();
            setMessages(fetchedMessages);
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

    const handleViewMessage = async (message: ContactMessage) => {
        setSelectedMessage(message);
        setIsDialogOpen(true);
        if (!message.read) {
            await markContactMessageAsRead(message.id);
            const updatedMessages = messages.map(m => m.id === message.id ? { ...m, read: true } : m);
            setMessages(updatedMessages);
        }
    };

    const handleDelete = async (messageId: string) => {
        try {
            await deleteContactMessage(messageId);
            toast({ title: "Message Deleted", description: "The message has been permanently deleted." });
            setMessages(messages.filter(m => m.id !== messageId));
            setIsDialogOpen(false);
            setSelectedMessage(null);
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Mail className="h-6 w-6"/> Contact Form Inbox</CardTitle>
                    <CardDescription>Messages submitted through the public contact form.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>From</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {messages.length > 0 ? messages.map(message => (
                                <TableRow 
                                    key={message.id} 
                                    className={cn(!message.read && "font-bold", "cursor-pointer")}
                                    onClick={() => handleViewMessage(message)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {!message.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0"></span>}
                                            <div>
                                                <p>{message.name}</p>
                                                <p className="text-xs font-normal text-muted-foreground">{message.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-sm truncate font-normal text-muted-foreground">{message.message}</TableCell>
                                    <TableCell className="font-normal text-muted-foreground">{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewMessage(message); }}>
                                            <Eye className="mr-2 h-4 w-4"/> View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        Your inbox is empty.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                   {selectedMessage && (
                       <>
                        <DialogHeader>
                            <DialogTitle>Message from {selectedMessage.name}</DialogTitle>
                            <DialogDescription>
                                <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline">{selectedMessage.email}</a>
                            </DialogDescription>
                             <p className="text-xs text-muted-foreground pt-2">
                                Received: {format(new Date(selectedMessage.createdAt), 'PPP p')}
                            </p>
                        </DialogHeader>
                        <Separator />
                        <div className="py-4 whitespace-pre-wrap text-sm max-h-80 overflow-y-auto">
                            {selectedMessage.message}
                        </div>
                        <Separator />
                        <DialogFooter>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(selectedMessage.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button asChild>
                                <a href={`mailto:${selectedMessage.email}`}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Reply
                                </a>
                            </Button>
                        </DialogFooter>
                       </>
                   )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
