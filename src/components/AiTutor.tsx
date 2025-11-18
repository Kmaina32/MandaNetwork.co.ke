
'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRecorder } from '@/hooks/use-recorder';
import { courseTutor } from '@/app/actions';
import { getTutorHistory, saveTutorHistory } from '@/lib/firebase-service';
import type { Course, Lesson, TutorMessage, TutorSettings } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Bot,
  BrainCircuit,
  FileText,
  Loader2,
  Mic,
  MicOff,
  MessageSquare,
  Pencil,
  Send,
  Sparkles,
  User,
} from 'lucide-react';

interface AiTutorProps {
    course: Course;
    lesson: Lesson | null;
    settings: TutorSettings | null;
}

export function AiTutor({ course, lesson, settings }: AiTutorProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<TutorMessage[]>([]);
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const { isRecording, startRecording, stopRecording } = useRecorder();

    const initialPrompts = [
        { label: 'Summarize', icon: FileText, action: 'summarize' as const },
        { label: 'Quiz Me', icon: Sparkles, action: 'quiz' as const },
        { label: 'Tutor Me', icon: Pencil, action: 'tutor_me' as const },
    ];
    
    useEffect(() => {
        const loadHistory = async () => {
            if (user && course && lesson) {
                setIsLoading(true);
                const history = await getTutorHistory(user.uid, course.id, lesson.id);
                setMessages(history);
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [user, course, lesson]);

    const sendTutorRequest = async (currentQuestion?: string, action?: 'summarize' | 'quiz') => {
        if (!lesson || !user || !course) return;
        if (!currentQuestion && !action) return;

        const userMessageContent = action === 'summarize' 
            ? 'Summarize this lesson for me.' 
            : action === 'quiz'
            ? 'Give me a quiz on this lesson.'
            : currentQuestion!;

        const userMessage: TutorMessage = { role: 'user', content: userMessageContent };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setQuestion('');
        setIsLoading(true);

        try {
            const result = await courseTutor({ 
                question: action ? undefined : currentQuestion,
                action,
                courseTitle: course.title,
                courseContext: lesson.content,
                history: messages.map(({ audioUrl, suggestions, ...rest }) => rest),
                voice: settings?.voice,
                speed: settings?.speed
            });
            
            const tutorMessage: TutorMessage = { 
                role: 'assistant', 
                content: result.answer, 
                suggestions: result.suggestions
            };

            const finalMessages = [...newMessages, tutorMessage];
            setMessages(finalMessages);
            
            await saveTutorHistory(user.uid, course.id, lesson.id, finalMessages);

        } catch (error) {
            console.error("AI Tutor failed:", error);
            toast({ title: 'Error', description: 'The AI Tutor is currently unavailable. Please try again later.', variant: 'destructive'});
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    }

    const handleTutorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        sendTutorRequest(question);
    }

    const handleActionClick = (action: 'summarize' | 'quiz' | 'tutor_me') => {
        if (action === 'tutor_me') {
            sendTutorRequest("Tutor me");
        } else {
            sendTutorRequest(undefined, action);
        }
    }
    
    if (!lesson) return null;

    return (
        <>
            <audio ref={audioRef} className="hidden" />
            <Sheet>
                <SheetTrigger asChild>
                    <Button className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg">
                        <MessageSquare className="h-7 w-7" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[480px] flex flex-col p-0 rounded-l-lg">
                     <SheetHeader className="p-6 pb-2 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <SheetTitle>Chat with Gina</SheetTitle>
                                <SheetDescription>
                                    Your AI tutor for this lesson.
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    <ScrollArea className="flex-grow p-6">
                        <div className="space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center text-muted-foreground text-sm py-8 space-y-4">
                                    <BrainCircuit className="h-10 w-10 mx-auto text-primary/50" />
                                    <div>
                                     <p className="font-semibold mb-2">How can I help you learn?</p>
                                     <div className="grid grid-cols-1 gap-2">
                                        {initialPrompts.map(prompt => (
                                            <Button key={prompt.action} variant="outline" size="sm" onClick={() => handleActionClick(prompt.action)}>
                                                <prompt.icon className="mr-2 h-4 w-4" />
                                                {prompt.label}
                                            </Button>
                                        ))}
                                     </div>
                                    </div>
                                </div>
                            )}
                            {messages.map((message, index) => (
                                <div key={index}>
                                    <div className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                        {message.role === 'assistant' && (
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarImage src={settings?.avatarUrl || ''} />
                                                <AvatarFallback><Bot/></AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={`rounded-lg px-3 py-2 max-w-md ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm dark:prose-invert max-w-none">
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                            {message.role === 'user' && (
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarImage src={user?.photoURL || ''} />
                                                <AvatarFallback><User /></AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                    {message.role === 'assistant' && message.suggestions && (
                                        <div className="flex flex-wrap gap-2 mt-3 ml-11">
                                            {message.suggestions.map((suggestion, i) => (
                                                <Button key={i} size="sm" variant="outline" onClick={() => sendTutorRequest(suggestion)}>
                                                    {suggestion}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarImage src={settings?.avatarUrl || ''} />
                                        <AvatarFallback><Bot/></AvatarFallback>
                                    </Avatar>
                                    <div className="rounded-lg px-4 py-3 bg-secondary flex items-center">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="border-t p-6 bg-background">
                        <form onSubmit={handleTutorSubmit} className="flex items-start gap-2">
                             <Button type="button" size="icon" variant={isRecording ? 'destructive' : 'outline'} onClick={isRecording ? stopRecording : startRecording} disabled={isLoading}>
                                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </Button>
                            <Textarea 
                                placeholder="e.g., Can you explain this concept..." 
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                className="min-h-0 resize-none"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleTutorSubmit(e);
                                    }
                                    }}
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !question.trim()} id="tutor-form-submit">
                                <Send className="h-4 w-4"/>
                            </Button>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}
