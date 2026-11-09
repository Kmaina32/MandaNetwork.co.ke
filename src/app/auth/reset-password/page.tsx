'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function SupabaseResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSupabaseBrowserClient().auth.getSession().then(({ data, error }) => setReady(!error && Boolean(data.session))).catch(() => setReady(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
    if (password !== confirm) return toast({ title: 'Passwords do not match', description: 'Enter the same password in both fields.', variant: 'destructive' });
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      router.replace('/dashboard');
    } catch (error) {
      toast({ title: 'Password update failed', description: error instanceof Error ? error.message : 'Request a new reset link.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10"><Card className="w-full"><CardHeader><CardTitle>Set a new password</CardTitle><CardDescription>{ready ? 'Choose a new password for your Supabase account.' : 'The reset link may be invalid or expired. Request another one from the sign-in page.'}</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-3"><Input type="password" minLength={8} placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!ready} /><Input type="password" minLength={8} placeholder="Confirm new password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required disabled={!ready} /><Button className="w-full" type="submit" disabled={!ready || busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update password</Button></form></CardContent></Card></main>;
}
