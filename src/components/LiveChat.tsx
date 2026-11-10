'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';

interface ChatMessage {
  id: string; text: string; authorId: string; authorName: string;
  authorAvatar: string; timestamp: number;
}
interface LiveChatProps { sessionId: string; }
const getInitials = (name: string | null | undefined) => {
  if (!name) return 'U';
  const names = name.split(' ');
  return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

export function LiveChat({ sessionId }: LiveChatProps) {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from('live_messages').select('*')
        .eq('session_id', sessionId).order('created_at', { ascending: false }).limit(50);
      if (!active) return;
      if (error) { setLoadError('Live chat is unavailable for this session.'); return; }
      setMessages((data || []).reverse().map(row => ({
        id: row.id, text: row.message, authorId: row.user_id,
        authorName: String(row.metadata?.authorName || 'Learner'),
        authorAvatar: String(row.metadata?.authorAvatar || ''),
        timestamp: new Date(row.created_at).getTime(),
      })));
    };
    void load();
    const channel = supabase.channel(`live-chat-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `session_id=eq.${sessionId}` }, payload => {
        const row = payload.new as any;
        setMessages(previous => previous.some(message => message.id === row.id) ? previous : [...previous, {
          id: row.id, text: row.message, authorId: row.user_id,
          authorName: String(row.metadata?.authorName || 'Learner'),
          authorAvatar: String(row.metadata?.authorAvatar || ''),
          timestamp: new Date(row.created_at).getTime(),
        }].slice(-50));
      }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [sessionId, supabase]);

  useEffect(() => {
    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = newMessage.trim();
    if (!user || !message || isSubmitting) return;
    setIsSubmitting(true); setLoadError('');
    try {
      const { error } = await supabase.from('live_messages').insert({
        session_id: sessionId, user_id: user.uid, message,
        metadata: { authorName: user.displayName || 'Learner', authorAvatar: user.photoURL || '' },
      });
      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Live chat send failed:', error);
      setLoadError('Message could not be sent. Check that the session is live and try again.');
    } finally { setIsSubmitting(false); }
  };
  const onEmojiClick = (emojiData: EmojiClickData) => setNewMessage(previous => previous + emojiData.emoji);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map(message => (
            <div key={message.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8 border"><AvatarImage src={message.authorAvatar} /><AvatarFallback className="text-xs">{getInitials(message.authorName)}</AvatarFallback></Avatar>
              <div className="flex flex-col"><p className="text-xs font-bold">{message.authorName}</p><div className="text-sm p-2 bg-secondary rounded-lg max-w-full break-words">{message.text}</div></div>
            </div>
          ))}
          {loadError && <p role="status" className="text-xs text-destructive">{loadError}</p>}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="flex-shrink-0"><Smile className="h-5 w-5" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0 border-0"><EmojiPicker onEmojiClick={onEmojiClick} /></PopoverContent></Popover>
          <Input value={newMessage} onChange={event => setNewMessage(event.target.value)} placeholder="Type a message..." autoComplete="off" maxLength={4000} />
          <Button type="submit" size="icon" disabled={isSubmitting || !newMessage.trim()} className="flex-shrink-0">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </form>
      </div>
    </div>
  );
}
