

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GitBranch, MailCheck, MailWarning } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function UnverifiedPage() {
  const router = useRouter();
  const { user, loading, sendVerificationEmail, logout } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.emailVerified) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleResend = async () => {
    setIsSending(true);
    try {
      await sendVerificationEmail();
      toast({
        title: 'Email Sent!',
        description: 'A new verification link has been sent to your email address.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification email.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  }

  if (loading || !user || user.emailVerified) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow flex items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md">
           <div className="grid gap-2 text-center mb-6">
              <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl font-headline">
                  <GitBranch className="h-7 w-7 text-primary" />
                  <span>Varban Academy</span>
              </Link>
            </div>
            <Card className="text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                        <MailWarning className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-headline">Verify Your Email</CardTitle>
                    <CardDescription>
                        A verification link has been sent to <strong>{user.email}</strong>. Please check your inbox to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Can't find the email? Check your spam or junk folder. If it's not there, you can resend the link.
                    </p>
                    <Button onClick={handleResend} disabled={isSending}>
                      {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4" />}
                       Resend Verification Email
                    </Button>
                    <div className="text-sm">
                        <p>Clicked the link? <Button variant="link" onClick={() => window.location.reload()} className="p-0 h-auto">Refresh this page</Button>.</p>
                         <p>Wrong account? <Button variant="link" onClick={handleLogout} className="p-0 h-auto text-destructive">Logout</Button>.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
