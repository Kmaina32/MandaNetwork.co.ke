

'use client';

import { useState } from 'react';
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
import { Loader2, GitBranch, ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { sendPasswordReset } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordReset(values.email);
      setEmailSent(true);
    } catch (e: any) {
      setError(e.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-secondary p-4">
        <div className="w-[400px] space-y-6">
            <Button variant="outline" asChild className="w-fit">
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
           <div className="grid gap-2 text-center">
              <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl font-headline">
                  <GitBranch className="h-7 w-7 text-yellow-500" />
                  <span>Varban Academy</span>
              </Link>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
              <CardDescription>
                {emailSent 
                    ? "Check your inbox for a password reset link." 
                    : "Enter your email and we'll send you a link to reset your password."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
               {emailSent ? (
                    <div className="text-center">
                        <p className="text-green-600 font-medium mb-4">Password reset email sent successfully!</p>
                        <Button asChild>
                            <Link href="/login">Back to Login</Link>
                        </Button>
                    </div>
               ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {error && (
                            <Alert variant="destructive">
                                <AlertTitle>Request Failed</AlertTitle>
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
                                    <Input placeholder="jomo@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                            </Button>
                        </form>
                    </Form>
               )}
              <div className="mt-4 text-center text-sm">
                Remember your password?{" "}
                <Link href="/login" className="underline">
                  Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
