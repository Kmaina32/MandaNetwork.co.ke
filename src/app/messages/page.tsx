'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Loader2, Search, Archive, Trash2, Check, CheckCheck, Filter } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import type { Notification } from '@/lib/types';
import { getAllNotifications } from '@/lib/firebase-service';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

type SortOption = 'newest' | 'oldest' | 'unread';

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const allNotifications = await getAllNotifications();
            // Filter for messages specifically targeted at this user
            const userMessages = allNotifications.filter(
                n => n.userId === user.uid && 
                n.title.startsWith('New Message from') &&
                !n.archived
            );
            setMessages(userMessages);
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchMessages();
    
    // Set up polling for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [user, authLoading, router]);

  // Filter and sort messages
  const filteredAndSortedMessages = messages
    .filter(msg => {
      const matchesSearch = 
        msg.body.employerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.body.organizationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.body.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.body.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterUnread ? !msg.read : true;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'unread':
          return (a.read ? 1 : 0) - (b.read ? 1 : 0);
        default:
          return 0;
      }
    });

  const unreadCount = messages.filter(m => !m.read).length;

  const markAsRead = async (messageId: string) => {
    // TODO: Implement Firebase update
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, read: true } : msg
    ));
  };

  const markAllAsRead = async () => {
    if (selectedMessages.size === 0) {
      // Mark all visible messages as read
      const messageIds = filteredAndSortedMessages.map(m => m.id);
      // TODO: Implement Firebase batch update
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, read: true } : msg
      ));
    } else {
      // Mark selected messages as read
      // TODO: Implement Firebase batch update
      setMessages(prev => prev.map(msg => 
        selectedMessages.has(msg.id) ? { ...msg, read: true } : msg
      ));
      setSelectedMessages(new Set());
    }
  };

  const archiveMessage = async (messageId: string) => {
    // TODO: Implement Firebase update
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const deleteMessage = async (messageId: string) => {
    // TODO: Implement Firebase delete
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  const handleDeleteClick = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMessages.size === filteredAndSortedMessages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(filteredAndSortedMessages.map(m => m.id)));
    }
  };

  const bulkArchive = async () => {
    // TODO: Implement Firebase batch update
    setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.id)));
    setSelectedMessages(new Set());
  };

  if (authLoading || loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <LoadingAnimation />
        </div>
    );
  }

  return (
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <Header />
            <div className='flex flex-col min-h-screen'>
              <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
                <div className="max-w-4xl mx-auto">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Mail className="h-6 w-6"/>
                                        Message Center
                                        {unreadCount > 0 && (
                                            <Badge variant="destructive" className="ml-2">
                                                {unreadCount}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="mt-2">
                                        Messages from potential employers interested in your profile.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {messages.length > 0 ? (
                                <>
                                    {/* Search and Filter Bar */}
                                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search messages..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={filterUnread ? "default" : "outline"}
                                                onClick={() => setFilterUnread(!filterUnread)}
                                                className="whitespace-nowrap"
                                            >
                                                <Filter className="h-4 w-4 mr-2" />
                                                Unread Only
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline">
                                                        Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Unread'}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setSortBy('newest')}>
                                                        Newest First
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                                                        Oldest First
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSortBy('unread')}>
                                                        Unread First
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Bulk Actions */}
                                    {filteredAndSortedMessages.length > 0 && (
                                        <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                                            <Checkbox
                                                checked={selectedMessages.size === filteredAndSortedMessages.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {selectedMessages.size > 0 
                                                    ? `${selectedMessages.size} selected` 
                                                    : 'Select all'}
                                            </span>
                                            {selectedMessages.size > 0 && (
                                                <div className="flex gap-2 ml-auto">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={markAllAsRead}
                                                    >
                                                        <CheckCheck className="h-4 w-4 mr-2" />
                                                        Mark Read
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={bulkArchive}
                                                    >
                                                        <Archive className="h-4 w-4 mr-2" />
                                                        Archive
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Messages List */}
                                    {filteredAndSortedMessages.length > 0 ? (
                                        <div className="space-y-4">
                                            {filteredAndSortedMessages.map(msg => (
                                                <Card 
                                                    key={msg.id} 
                                                    className={cn(
                                                        "p-3 sm:p-4 transition-colors",
                                                        !msg.read && "border-l-4 border-l-primary bg-muted/30"
                                                    )}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <Checkbox
                                                            checked={selectedMessages.has(msg.id)}
                                                            onCheckedChange={() => toggleSelectMessage(msg.id)}
                                                        />
                                                        <Avatar className="h-10 w-10 flex-shrink-0">
                                                            <AvatarFallback className="bg-primary/10">
                                                                {msg.body.employerName?.[0]?.toUpperCase() || 'E'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className="font-semibold text-sm">
                                                                            {msg.body.employerName}
                                                                        </p>
                                                                        {!msg.read && (
                                                                            <Badge variant="secondary" className="h-5 px-2 text-xs">
                                                                                New
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {msg.body.organizationName}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-col sm:items-end gap-1 text-sm">
                                                                    <a 
                                                                        href={`mailto:${msg.body.email}`} 
                                                                        className="text-primary hover:underline text-sm"
                                                                        onClick={() => !msg.read && markAsRead(msg.id)}
                                                                    >
                                                                        {msg.body.email}
                                                                    </a>
                                                                    {msg.body.phone && (
                                                                        <p className="text-muted-foreground text-sm">{msg.body.phone}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 pt-3 border-t">
                                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                                                    {msg.body.message}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2 mt-4">
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        window.location.href = `mailto:${msg.body.email}?subject=Re: Job Inquiry&body=Hi ${msg.body.employerName},%0D%0A%0D%0A`;
                                                                        if (!msg.read) markAsRead(msg.id);
                                                                    }}
                                                                >
                                                                    <Mail className="h-4 w-4 mr-2" />
                                                                    Reply
                                                                </Button>
                                                                {!msg.read && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => markAsRead(msg.id)}
                                                                    >
                                                                        <Check className="h-4 w-4 mr-2" />
                                                                        Mark Read
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => archiveMessage(msg.id)}
                                                                >
                                                                    <Archive className="h-4 w-4 mr-2" />
                                                                    Archive
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteClick(msg.id)}
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                            <p className="text-muted-foreground">No messages match your search.</p>
                                            <Button 
                                                variant="outline" 
                                                className="mt-4"
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setFilterUnread(false);
                                                }}
                                            >
                                                Clear Filters
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <Mail className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                        Make your portfolio public and complete your profile to start receiving messages from employers.
                                    </p>
                                    <div className="flex gap-3 justify-center flex-wrap">
                                        <Button asChild>
                                            <Link href="/profile">Complete Profile</Link>
                                        </Button>
                                        <Button variant="outline" asChild>
                                            <Link href="/portfolio">View Portfolio</Link>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
              </main>
              <Footer />
            </div>
        </SidebarInset>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This message will be permanently deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => messageToDelete && deleteMessage(messageToDelete)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </SidebarProvider>
  );
}
