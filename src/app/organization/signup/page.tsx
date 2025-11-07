
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, GitBranch, Building, ArrowLeft, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { getHeroData, getInvitation } from '@/lib/firebase-service';
import type { Invitation } from '@/lib/types';

const formSchema = z.object({
  organizationName: z.string().min(2, { message: 'Organization name is required.' }),
  fullName: z.string().min(2, { message: 'Your full name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' }),
});

function OrganizationSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signup, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      const data = await getHeroData();
      setImageUrl(data.orgSignupImageUrl);
    }
    fetchImage();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push('/organization/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchInviteData = async () => {
        const inviteId = searchParams.get('invite');
        if (inviteId) {
            const inviteData = await getInvitation(inviteId);
            if (inviteData && inviteData.status === 'pending') {
                setInvitation(inviteData);
                form.setValue('email', inviteData.email);
            } else {
                 toast({ title: "Invalid Invitation", description: "This invitation link is either invalid or has expired.", variant: "destructive" });
            }
        }
    }
    fetchInviteData();
  }, [searchParams, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { organizationName: '', fullName: '', email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      await signup(
        values.email,
        values.password,
        values.fullName,
        values.organizationName
      );
      toast({
        title: 'Account & Organization Created!',
        description: "A verification email has been sent. Please check your inbox.",
      });
      router.push('/unverified'); 
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use' || e.message.includes('already exists')) {
        setError('An account with this email already exists. Please try another one or log in.');
      } else {
        setError(e.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
       <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
            <Button variant="outline" asChild className="w-fit">
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
           <div className="grid gap-2 text-center">
              <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl font-headline">
                  <GitBranch className="h-7 w-7 text-primary" />
                  <span>Manda Network</span>
              </Link>
          </div>
          <Card>
            <CardHeader>
              <div className="flex justify-center items-center mb-4">
                <Building className="h-8 w-8 text-muted-foreground"/>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Create Your Organization</CardTitle>
              <CardDescription className="text-center">
                Set up your organization and admin account. All plans start with a 30-day free trial.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {error && (
                      <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Signup Failed</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                      </Alert>
                      )}
                      <FormField
                        control={form.control}
                        name="organizationName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Acme Corporation" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Your Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Jomo Kenyatta" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Your Email (Admin Account)</FormLabel>
                            <FormControl>
                                <Input placeholder="jomo@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
                      </Button>
                  </form>
              </Form>
              <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link href="/organization/login" className="underline">
                  Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        <div className="hidden bg-muted lg:block p-8">
            <div
                className="h-full w-full rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${imageUrl || 'https://picsum.photos/1200/900'})` }}
                data-ai-hint="business team"
            />
        </div>
    </div>
  );
}

export default function OrganizationSignupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OrganizationSignupForm />
        </Suspense>
    )
}

    