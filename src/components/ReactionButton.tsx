'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Smile } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

const emojis = ['👍', '❤️', '😂', '😮', '🎉', '👏'];
export function ReactionButton({ sessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = getSupabaseBrowserClient();

  const handleSendReaction = async (emoji: string) => {
    if (!user) return;
    const { error } = await supabase.from('live_reactions').insert({ session_id: sessionId, user_id: user.uid, reaction: emoji });
    if (error) toast({ title: 'Reaction not sent', description: 'This live session may have ended.', variant: 'destructive' });
    setIsOpen(false);
  };
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild><Button size="icon" variant="secondary" className="rounded-full h-12 w-12 shadow-lg"><Smile className="h-6 w-6" /></Button></PopoverTrigger>
      <PopoverContent className="w-auto p-2"><div className="flex gap-2">{emojis.map(emoji => <button key={emoji} type="button" onClick={() => void handleSendReaction(emoji)} className="text-2xl p-2 rounded-full hover:bg-secondary transition-colors">{emoji}</button>)}</div></PopoverContent>
    </Popover>
  );
}
