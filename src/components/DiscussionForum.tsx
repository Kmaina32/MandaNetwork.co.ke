
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { DiscussionThread, DiscussionReply } from '@/lib/mock-data';
import { getThreadsForCourse, createThread, getRepliesForThread, createReply } from '@/lib/firebase-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ADMIN_UID = 'YlyqSWedlPfEqI9LlGzjN7zlRtC2';

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

interface DiscussionForumProps {
    courseId: string;
}

export function DiscussionForum({ courseId }: DiscussionForumProps) {
    const { user } = useAuth();
    const [threads, setThreads] = useState<DiscussionThread[]>([]);
    const [replies, setReplies] = useState<DiscussionReply[]>([]);
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [selectedThread, setSelectedThread] = useState<DiscussionThread | null>(null);
    const [newThreadTitle, setNewThreadTitle] = useState('');
    const [newThreadContent, setNewThreadContent] = useState('');
    const [newReplyContent, setNewReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isAdmin = user?.uid === ADMIN_UID;

    const fetchThreads = async () => {
        setLoadingThreads(true);
        const fetchedThreads = await getThreadsForCourse(courseId);
        setThreads(fetchedThreads);
        setLoadingThreads(false);
    }
    
    useEffect(() => {
        fetchThreads();
    }, [courseId]);

    useEffect(() => {
        if (selectedThread) {
            setLoadingReplies(true);
            getRepliesForThread(selectedThread.id).then(fetchedReplies => {
                setReplies(fetchedReplies);
                setLoadingReplies(false);
            });
        } else {
            setReplies([]);
        }
    }, [selectedThread]);

    const handleCreateThread = async () => {
        if (!user || !newThreadTitle || !newThreadContent) return;
        setIsSubmitting(true);
        await createThread(courseId, {
            title: newThreadTitle,
            content: newThreadContent,
            authorId: user.uid,
            authorName: user.displayName || 'Anonymous',
            authorAvatar: user.photoURL || '',
            createdAt: new Date().toISOString(),
        });
        setNewThreadTitle('');
        setNewThreadContent('');
        await fetchThreads();
        setIsSubmitting(false);
    }

    const handleCreateReply = async () => {
        if (!user || !selectedThread || !newReplyContent) return;
        setIsSubmitting(true);
        await createReply(selectedThread.id, {
            content: newReplyContent,
            authorId: user.uid,
            authorName: user.displayName || 'Anonymous',
            authorAvatar: user.photoURL || '',
            createdAt: new Date().toISOString(),
        });
        setNewReplyContent('');
        const fetchedReplies = await getRepliesForThread(selectedThread.id);
        setReplies(fetchedReplies);
        setIsSubmitting(false);
    }

    if (selectedThread) {
        return (
            <Card>
                <CardHeader>
                    <button onClick={() => setSelectedThread(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Back to all topics
                    </button>
                    <CardTitle>{selectedThread.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedThread.authorAvatar} />
                            <AvatarFallback>{getInitials(selectedThread.authorName)}</AvatarFallback>
                        </Avatar>
                        <span>Posted by {selectedThread.authorName}</span>
                        <span>&bull;</span>
                        <span>{formatDistanceToNow(new Date(selectedThread.createdAt), { addSuffix: true })}</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="prose dark:prose-invert max-w-none pb-6 border-b">
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedThread.content}</ReactMarkdown>
                    </div>

                    <div className="space-y-4 mt-6">
                        <h3 className="font-semibold">{replies.length} Submissions</h3>
                        {loadingReplies ? <Loader2 className="animate-spin" /> : replies.map(reply => (
                            <div key={reply.id} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={reply.authorAvatar} />
                                    <AvatarFallback>{getInitials(reply.authorName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-semibold">{reply.authorName}</span>
                                        <span className="text-muted-foreground">{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</span>
                                    </div>
                                     <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{reply.content}</ReactMarkdown>
                                     </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t">
                        <h3 className="font-semibold mb-2">Submit Your Findings</h3>
                        <Textarea
                            value={newReplyContent}
                            onChange={(e) => setNewReplyContent(e.target.value)}
                            placeholder="Submit your findings to the instructor's topic here..."
                            className="mb-2"
                        />
                        <Button onClick={handleCreateReply} disabled={isSubmitting || !newReplyContent.trim()}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Post Submission
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Discussion Forum</CardTitle>
                <CardDescription>Engage with topics set by your instructor and share your findings with peers.</CardDescription>
            </CardHeader>
            <CardContent>
                {isAdmin && (
                    <div className="p-4 border rounded-lg mb-6 bg-secondary/50">
                        <h3 className="font-semibold mb-2">Create a New Discussion Topic</h3>
                        <Input
                            value={newThreadTitle}
                            onChange={(e) => setNewThreadTitle(e.target.value)}
                            placeholder="Topic Title"
                            className="mb-2"
                        />
                        <Textarea
                            value={newThreadContent}
                            onChange={(e) => setNewThreadContent(e.target.value)}
                            placeholder="Start the discussion..."
                            className="mb-2"
                        />
                        <Button onClick={handleCreateThread} disabled={isSubmitting || !newThreadTitle.trim() || !newThreadContent.trim()}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Start Topic
                        </Button>
                    </div>
                )}

                <h3 className="font-semibold mb-4">Discussion Topics</h3>
                {loadingThreads ? <Loader2 className="animate-spin" /> : (
                    <div className="space-y-2">
                        {threads.length > 0 ? threads.map(thread => (
                            <button key={thread.id} onClick={() => setSelectedThread(thread)} className="w-full text-left p-3 rounded-md hover:bg-secondary transition-colors border">
                                <p className="font-medium">{thread.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={thread.authorAvatar} />
                                        <AvatarFallback>{getInitials(thread.authorName)}</AvatarFallback>
                                    </Avatar>
                                    <span>Posted by {thread.authorName}</span>
                                    <span>&bull;</span>
                                    <span>{formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}</span>
                                </div>
                            </button>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No discussion topics posted for this course yet.</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
