'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { signInWithSupabase, signUpWithSupabase, signOutFromSupabase, readSupabaseSession, subscribeToSupabaseAuth, sendSupabasePasswordReset, type SupabaseSession } from '@/lib/supabase-auth';
import { uploadAcademyMedia } from '@/lib/supabase-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ImagePlus, Video, Copy, LogOut, ShieldCheck } from 'lucide-react';

type UploadedAsset = { path: string; publicUrl: string; contentType: string; size: number };

export default function AdminMediaPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [category, setCategory] = useState<'images' | 'videos'>('images');
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSession(readSupabaseSession());
    return subscribeToSupabaseAuth(setSession);
  }, []);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.email, user?.displayName]);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUpWithSupabase(email, password, displayName || email.split('@')[0]);
        toast({ title: 'Supabase account created', description: 'If email confirmation is enabled, confirm the message from Supabase before signing in.' });
      } else {
        await signInWithSupabase(email, password);
        toast({ title: 'Supabase session active', description: 'You can now upload academy media.' });
      }
    } catch (error) {
      toast({ title: 'Authentication failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
      setPassword('');
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadAcademyMedia(file, category);
      setAssets((current) => [uploaded, ...current]);
      toast({ title: 'Upload complete', description: file.name });
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (authLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user || !isAdmin) return <main className="mx-auto max-w-xl px-4 py-16"><Card><CardHeader><CardTitle>Administrator access required</CardTitle><CardDescription>Sign in with an authorized Varban Academy administrator account to manage media.</CardDescription></CardHeader></Card></main>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Administrator media library</div>
        <h1 className="mt-2 text-3xl font-semibold">Media uploads</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload course images, lesson videos and other learning media to Supabase Storage.</p>
      </div>

      {!session ? (
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'signin' ? 'Connect Supabase account' : 'Create Supabase account'}</CardTitle>
            <CardDescription>Use the administrator email to establish a Supabase Auth session. Your existing Firebase sign-in remains unchanged.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-3">
              {mode === 'signup' && <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" required />}
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Administrator email" required />
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (at least 8 characters)" minLength={8} required />
              <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{mode === 'signin' ? 'Sign in to Supabase' : 'Create Supabase account'}</Button>
            </form>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <button type="button" className="underline underline-offset-4" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Create an account' : 'I already have an account'}</button>
              <button type="button" className="underline underline-offset-4" disabled={!email} onClick={async () => { try { await sendSupabasePasswordReset(email); toast({ title: 'Reset email sent', description: 'Check your inbox for the password reset link.' }); } catch (error) { toast({ title: 'Could not send reset email', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' }); } }}>Forgot password?</button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div><CardTitle>Supabase connected</CardTitle><CardDescription>{session.user.email || user.email}</CardDescription></div>
            <Button variant="outline" size="sm" onClick={() => signOutFromSupabase()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button variant={category === 'images' ? 'default' : 'outline'} onClick={() => setCategory('images')}><ImagePlus className="mr-2 h-4 w-4" />Images</Button>
              <Button variant={category === 'videos' ? 'default' : 'outline'} onClick={() => setCategory('videos')}><Video className="mr-2 h-4 w-4" />Videos</Button>
            </div>
            <div className="rounded-xl border border-dashed p-8 text-center">
              <input ref={fileInput} type="file" accept={category === 'images' ? 'image/jpeg,image/png,image/webp,image/gif,image/avif' : 'video/mp4,video/webm,video/quicktime'} className="hidden" onChange={handleUpload} />
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">{category === 'images' ? <ImagePlus className="h-6 w-6" /> : <Video className="h-6 w-6" />}</div>
              <p className="font-medium">Choose {category === 'images' ? 'an image' : 'a video'} to upload</p>
              <p className="mt-1 text-sm text-muted-foreground">Maximum file size: 50 MB</p>
              <Button className="mt-4" disabled={busy} onClick={() => fileInput.current?.click()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Select file</Button>
            </div>
            {assets.length > 0 && <div className="space-y-3"><h2 className="font-semibold">Uploaded in this session</h2>{assets.map((asset) => <div key={asset.path} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{asset.path.split('/').pop()}</p><p className="text-xs text-muted-foreground">{(asset.size / 1024 / 1024).toFixed(2)} MB · {asset.contentType}</p><a className="break-all text-xs underline" href={asset.publicUrl} target="_blank" rel="noreferrer">Open media</a></div><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(asset.publicUrl); toast({ title: 'URL copied' }); }}><Copy className="mr-2 h-4 w-4" />Copy URL</Button></div>)}</div>}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
