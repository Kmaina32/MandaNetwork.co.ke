'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type LiveSignal = {
  id: string; session_id: string; user_id: string; recipient_id: string | null;
  sender_role: 'host' | 'student'; signal_type: 'offer' | 'answer' | 'ice_candidate' | 'hand_raised' | 'hand_lowered';
  payload: Record<string, unknown>; created_at: string;
};

export async function publishLiveSignal(input: {
  sessionId: string; userId: string; senderRole: 'host' | 'student';
  signalType: LiveSignal['signal_type']; payload?: Record<string, unknown>; recipientId?: string | null;
}) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('live_signals').insert({
    session_id: input.sessionId, user_id: input.userId, sender_role: input.senderRole,
    signal_type: input.signalType, payload: input.payload || {}, recipient_id: input.recipientId || null,
  });
  if (error) throw error;
}

export function subscribeLiveSignals(sessionId: string, onSignal: (signal: LiveSignal) => void): () => void {
  const supabase = getSupabaseBrowserClient();
  const channel: RealtimeChannel = supabase.channel(`live-signals-${sessionId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_signals', filter: `session_id=eq.${sessionId}` }, payload => onSignal(payload.new as LiveSignal))
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function getLiveSignals(sessionId: string, signalType?: LiveSignal['signal_type']) {
  const supabase = getSupabaseBrowserClient();
  let query = supabase.from('live_signals').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
  if (signalType) query = query.eq('signal_type', signalType);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as LiveSignal[];
}
