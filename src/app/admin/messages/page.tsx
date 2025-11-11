
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Mail, Trash2, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ContactMessage } from '@/lib/types';
import { getContactMessages, deleteContactMessage, markContactMessageAsRead } from '@/lib/firebase-service';
import { LoadingAnimation } from '@/components/LoadingAnimation';

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
        if (!message.read) {
            await markContactMessageAsRead(message.id);
            fetchMessages(); // Re-fetch to update the UI state
        }
    };

    const handleDelete = async (messageId: string) => {
        try {
            await deleteContactMessage(messageId);
            toast({ title: "Message Deleted", description: "The message has been permanently deleted." });
            fetchMessages();
        } catch (error) {
            toast({ title: "Error", description: "Could not delete the message.", variant: "destructive" });
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Admin Dashboard
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl font-headline">
                        <Mail className="h-6 w-6" />
                        Contact Form Inbox
                    </CardTitle>
                    <CardDescription>Messages submitted through the public contact form.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10"><LoadingAnimation /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>From</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {messages.length > 0 ? messages.map(message => (
                                    <TableRow key={message.id} className={!message.read ? 'bg-secondary/50' : ''}>
                                        <TableCell>
                                            <div className="font-medium">{message.name}</div>
                                            <div className="text-sm text-muted-foreground">{message.email}</div>
                                        </TableCell>
                                        <TableCell>{format(new Date(message.createdAt), 'PPP p')}</TableCell>
                                        <TableCell>
                                            <Badge variant={!message.read ? 'default' : 'outline'}>
                                                {!message.read ? 'Unread' : 'Read'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleViewMessage(message)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="ml-2 text-destructive hover:text-destructive">
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
                                                        <AlertDialogAction onClick={() => handleDelete(message.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                                            Your inbox is empty.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {selectedMessage && (
                 <AlertDialog open={!!selectedMessage} onOpenChange={(isOpen) => !isOpen && setSelectedMessage(null)}>
                    <AlertDialogContent className="max-w-2xl">
                         <AlertDialogHeader>
                            <AlertDialogTitle>Message from {selectedMessage.name}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {selectedMessage.email} &bull; {format(new Date(selectedMessage.createdAt), 'PPP p')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="my-4 p-4 bg-secondary rounded-lg whitespace-pre-wrap text-sm max-h-80 overflow-y-auto">
                            {selectedMessage.message}
                        </div>
                        <AlertDialogFooter>
                            <Button variant="outline" onClick={() => setSelectedMessage(null)}>Close</Button>
                            <a href={`mailto:${selectedMessage.email}`}>
                                <Button>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Reply via Email
                                </Button>
                            </a>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
