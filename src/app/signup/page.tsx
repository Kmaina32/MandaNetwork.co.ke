

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
import { Loader2, GitBranch, ArrowLeft, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { getHeroData, getInvitation, deleteInvitation } from '@/lib/firebase-service';
import type { HeroData } from '@/lib/firebase-service';
import { Separator } from '@/components/ui/separator';
import ReCAPTCHA from 'react-google-recaptcha';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier } from 'firebase/auth';
import type { Invitation } from '@/lib/types';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  middleName: z.string().optional(),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' }),
});

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.619-3.317-11.28-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
        <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C44.912 34.411 48 29.692 48 24c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
)

function SignupFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, signInWithGoogle, user, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<HeroData | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [showPassword, setShowPassword] = useState(false);

  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { firstName: '', middleName: '', lastName: '', email: '', password: '' },
  });

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
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
  }, [searchParams, toast, form]);

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await getHeroData();
      setSiteSettings(data);
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (recaptchaRef.current && siteSettings?.recaptchaEnabled) {
        // @ts-ignore
        auth.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
            'size': 'invisible'
        });
    }
  }, [siteSettings]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      const displayName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(' ');
      
      const orgId = invitation ? invitation.organizationId : undefined;
      const affiliateRef = searchParams.get('ref') || undefined;
      
      await signup(values.email, values.password, displayName, undefined, orgId, affiliateRef);
      
      toast({
        title: 'Account Created!',
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
        await signInWithGoogle();
        router.push('/');
    } catch(e: any) {
        setError(e.message || 'Failed to sign in with Google.');
    } finally {
        setIsGoogleLoading(false);
    }
  }


  return (
     <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
       <div className="flex items-center justify-center py-12">
        <div className="w-[350px] space-y-6">
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
              <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
              <CardDescription>
                Enter your information to create an account
              </CardDescription>
            </CardHeader>
            <CardContent>
                {invitation && (
                    <Alert className="mb-4">
                         <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>You've been invited!</AlertTitle>
                        <AlertDescription>
                            You are joining the <strong>{invitation.organizationName}</strong> organization.
                        </AlertDescription>
                    </Alert>
                )}
               <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {error && (
                      <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Signup Failed</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                      </Alert>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Jomo" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Kenyatta" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                      <FormField
                          control={form.control}
                          name="middleName"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Middle Name (Optional)</FormLabel>
                              <FormControl>
                                  <Input placeholder="" {...field} />
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                              <Input placeholder="jomo@example.com" {...field} disabled={!!invitation} />
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
                            <div className="relative">
                              <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                       {siteSettings?.recaptchaEnabled && (
                            <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                                size="invisible"
                            />
                       )}
                      <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
                      </Button>
                  </form>
              </Form>
                 <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or sign up with</span>
                  </div>
              </div>
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                    {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                    Sign up with Google
                </Button>
              <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link href="/login" className="underline">
                  Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        <div className="hidden bg-muted lg:block p-8">
         <div className="w-full h-full bg-cover bg-center rounded-lg" style={{backgroundImage: `url('${siteSettings?.signupImageUrl}')`}} data-ai-hint="learning online">
            <div className="w-full h-full bg-black/50 rounded-lg flex items-end p-8 text-white">
                <div>
                    <h2 className="text-4xl font-bold font-headline">Start Your Journey</h2>
                    <p className="text-lg mt-2">Create an account to access exclusive courses and content.</p>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignupFormComponent />
        </Suspense>
    )
}
