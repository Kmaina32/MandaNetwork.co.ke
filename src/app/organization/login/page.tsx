

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, GitBranch, Building, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { getHeroData } from '@/lib/firebase-service';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function OrganizationLoginPage() {
  const router = useRouter();
  const { user, login, loading: authLoading, isOrganizationAdmin, isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const fetchImage = async () => {
      const data = await getHeroData();
      setImageUrl(data.orgLoginImageUrl || '');
    }
    fetchImage();
  }, []);

  useEffect(() => {
    if (!authLoading && (isOrganizationAdmin || isAdmin)) {
      router.push('/organization/dashboard');
    }
  }, [user, authLoading, isOrganizationAdmin, isAdmin, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(values.email, values.password);
      // The redirect is handled by the useEffect hook
    } catch (e: any) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (e.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError(e.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || (user && (isOrganizationAdmin || isAdmin))) {
      return (
          <div className="flex flex-col min-h-screen items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

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
              <CardTitle className="text-2xl font-bold text-center">Organization Portal</CardTitle>
              <CardDescription className="text-center">
                Log in to manage your team's learning.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {error && (
                      <Alert variant="destructive">
                          <AlertTitle>Login Failed</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                      </Alert>
                      )}
                      <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                              <Input placeholder="admin@mycompany.com" {...field} />
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
                           <div className="flex items-center">
                              <FormLabel>Password</FormLabel>
                              <Link
                                href="/forgot-password"
                                className="ml-auto inline-block text-sm underline"
                              >
                                Forgot password?
                              </Link>
                            </div>
                          <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login'}
                      </Button>
                  </form>
              </Form>
              <div className="mt-4 text-center text-sm">
                Need to create an organization?{" "}
                <Link href="/organization/signup" className="underline">
                  Sign up
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
                data-ai-hint="business team meeting"
            />
        </div>
    </div>
  );
}
