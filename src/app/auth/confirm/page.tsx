'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SupabaseAuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    // Older Supabase email templates may still point here. Forward their PKCE
    // authorization code to the single server-side callback that sets cookies.
    router.replace(`/auth/callback${window.location.search}`);
  }, [router]);

  return <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center"><h1 className="text-2xl font-semibold">Confirming your email</h1><p className="mt-2 text-sm text-muted-foreground">Please wait while we securely finish signing you in.</p><Loader2 className="mt-5 h-5 w-5 animate-spin" /></main>;
}
