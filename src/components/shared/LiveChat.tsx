'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { AnimatePresence, motion } from 'framer-motion';

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
    <div className="absolute inset-0 flex flex-col justify-end p-4 pointer-events-none">
      <div className="w-full md:w-3/4 lg:w-1/2 space-y-2 mb-4 h-[70%] overflow-hidden">
        <AnimatePresence>{messages.map(message => <motion.div key={message.id} layout initial={{opacity:0,y:50,scale:0.3}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,scale:0.5}} className="flex items-start gap-3"><div className="flex items-center gap-2 p-2 bg-black/50 text-white rounded-lg shadow-lg backdrop-blur-sm"><Avatar className="h-8 w-8"><AvatarImage src={message.authorAvatar}/><AvatarFallback>{getInitials(message.authorName)}</AvatarFallback></Avatar><div><p className="text-xs font-bold">{message.authorName}</p><p className="text-sm">{message.text}</p></div></div></motion.div>)}</AnimatePresence>
        {loadError && <p role="status" className="text-xs text-white">{loadError}</p>}
      </div>
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 pointer-events-auto">
          <Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="flex-shrink-0"><Smile className="h-5 w-5" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0 border-0"><EmojiPicker onEmojiClick={onEmojiClick} /></PopoverContent></Popover>
          <Input value={newMessage} onChange={event => setNewMessage(event.target.value)} placeholder="Type a message..." autoComplete="off" maxLength={4000} />
          <Button type="submit" size="icon" disabled={isSubmitting || !newMessage.trim()} className="flex-shrink-0">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </form>
    </div>
  );
}
