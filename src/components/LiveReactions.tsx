'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';

interface Reaction { id: string; emoji: string; x: number; }
export function LiveReactions({ sessionId }: { sessionId: string }) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const channel = supabase.channel(`live-reactions-${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_reactions', filter: `session_id=eq.${sessionId}` }, payload => {
        const row = payload.new as { id: string; reaction: string };
        setReactions(previous => [...previous, { id: row.id, emoji: row.reaction, x: Math.random() * 80 + 10 }].slice(-30));
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [sessionId, supabase]);

  const handleAnimationComplete = (id: string) => setReactions(previous => previous.filter(item => item.id !== id));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>{reactions.map(reaction => (
        <motion.div key={reaction.id} initial={{ bottom: '-10%', x: `${reaction.x}%`, opacity: 1, scale: 0.5 }}
          animate={{ bottom: '110%', opacity: [1, 1, 0], scale: 1, rotate: Math.random() * 40 - 20 }}
          transition={{ duration: 5, ease: 'linear' }} onAnimationComplete={() => handleAnimationComplete(reaction.id)}
          className="absolute text-4xl">{reaction.emoji}</motion.div>
      ))}</AnimatePresence>
    </div>
  );
}
