'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { restoreSupabaseSessionFromUrl } from '@/lib/supabase-auth';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function SupabaseAuthConfirmPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Confirming your email address…');

  useEffect(() => {
    let active = true;
    restoreSupabaseSessionFromUrl().then((restored) => {
      if (!active) return;
      if (restored) {
        setMessage('Email confirmed. Your Supabase account is ready.');
        window.setTimeout(() => router.replace('/admin/media'), 1200);
      } else {
        setMessage('This confirmation link is invalid or has expired. Return to Media uploads and sign in again.');
      }
    }).catch(() => {
      if (active) setMessage('We could not confirm this link. Request a new confirmation email and try again.');
    });
    return () => { active = false; };
  }, [router]);

  return <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center"><CheckCircle2 className="mb-4 h-10 w-10" /><h1 className="text-2xl font-semibold">Email confirmation</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p><Loader2 className="mt-5 h-5 w-5 animate-spin" /></main>;
}
