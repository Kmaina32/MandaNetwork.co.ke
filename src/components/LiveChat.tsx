
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { ref, push, onChildAdded, serverTimestamp, query, limitToLast, off } from 'firebase/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';

interface ChatMessage {
    id: string;
    text: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    timestamp: number;
}

interface LiveChatProps {
    sessionId: string;
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

export function LiveChat({ sessionId }: LiveChatProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const chatRef = query(ref(db, `liveChat/${sessionId}`), limitToLast(50));
        const handleNewMessage = (snapshot: any) => {
            const newMessage = { id: snapshot.key!, ...snapshot.val() };
            setMessages(prev => [...prev, newMessage].slice(-50));
        };
        
        onChildAdded(chatRef, handleNewMessage);

        return () => off(chatRef, 'child_added', handleNewMessage);
    }, [sessionId]);

    useEffect(() => {
        // Auto-scroll to bottom
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim()) return;

        setIsSubmitting(true);
        const chatRef = ref(db, `liveChat/${sessionId}`);
        await push(chatRef, {
            text: newMessage,
            authorId: user.uid,
            authorName: user.displayName || 'Anonymous',
            authorAvatar: user.photoURL || '',
            timestamp: serverTimestamp(),
        });
        setNewMessage('');
        setIsSubmitting(false);
    };
    
    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
             <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                 <div className="space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 border">
                                <AvatarImage src={message.authorAvatar} />
                                <AvatarFallback className="text-xs">{getInitials(message.authorName)}</AvatarFallback>
                            </Avatar>
                             <div className="flex flex-col">
                                <p className="text-xs font-bold">{message.authorName}</p>
                                <div className="text-sm p-2 bg-secondary rounded-lg max-w-full break-words">
                                    {message.text}
                                </div>
                             </div>
                        </div>
                    ))}
                 </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
                                <Smile className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-0">
                            <EmojiPicker onEmojiClick={onEmojiClick} />
                        </PopoverContent>
                    </Popover>
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={isSubmitting || !newMessage.trim()} className="flex-shrink-0">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
