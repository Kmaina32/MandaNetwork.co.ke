
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Code, Loader2, PlusCircle, Key, Trash2, Eye, EyeOff, Copy, Terminal, Server } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import type { ApiKey } from '@/lib/types';
import { getUserApiKeys, deleteApiKey } from '@/lib/firebase-service';
import { generateApiKey } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { LoadingAnimation } from '@/components/LoadingAnimation';

const generateKeySchema = z.object({
    keyName: z.string().min(3, { message: "Key name must be at least 3 characters."}),
    terms: z.literal(true, {
        errorMap: () => ({ message: "You must accept the terms and conditions."}),
    }),
});

function ApiKeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: (keyId: string) => void; }) {
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey.key);
    toast({ title: 'Copied!', description: 'API key copied to clipboard.' });
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border rounded-lg">
        <div className="flex-grow">
            <p className="font-semibold">{apiKey.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Key className="h-4 w-4" />
                <span className="font-mono">
                    {isVisible ? apiKey.key : `sk_live_••••••••${apiKey.key.slice(-4)}`}
                </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                Created on {format(new Date(apiKey.createdAt), 'PPP p')}
            </p>
        </div>
        <div className="flex items-center gap-2 self-end md:self-center">
            <Button variant="ghost" size="icon" onClick={() => setIsVisible(!isVisible)} title={isVisible ? 'Hide key' : 'Show key'}>
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Copy key">
                <Copy className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Revoke key">
                    <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently revoke the API key named "{apiKey.name}". This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRevoke(apiKey.id)}>Revoke Key</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  )
}

function GenerateKeyDialog({ onGenerate }: { onGenerate: (keyName: string) => Promise<void> }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const form = useForm<z.infer<typeof generateKeySchema>>({
        resolver: zodResolver(generateKeySchema),
        defaultValues: {
            keyName: '',
            terms: false,
        },
    });

    const onSubmit = async (values: z.infer<typeof generateKeySchema>) => {
        setIsGenerating(true);
        await onGenerate(values.keyName);
        setIsGenerating(false);
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Generate New Key
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate New API Key</DialogTitle>
                    <DialogDescription>
                        Provide a name for your key and agree to the terms of use.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="keyName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Key Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., My Mobile App" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="p-4 border rounded-md max-h-32 overflow-y-auto bg-secondary/50">
                            <h4 className="font-semibold text-sm mb-2">Terms of Use</h4>
                            <p className="text-xs text-muted-foreground">
                                By generating an API key, you agree not to misuse the API. Misuse includes, but is not limited to, exceeding rate limits, attempting to access unauthorized data, or using the API for any illegal activities. Violation of these terms may result in immediate revocation of your API keys and potential suspension of your account. All API usage is logged and monitored.
                            </p>
                        </div>
                        <FormField
                            control={form.control}
                            name="terms"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            I have read and agree to the terms and conditions.
                                        </FormLabel>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                             <Button type="submit" disabled={isGenerating}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Generate Key
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
    return (
        <pre className="bg-secondary rounded-md p-4 text-sm text-secondary-foreground overflow-x-auto">
            <code>{children}</code>
        </pre>
    )
}

export default function DeveloperPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<ApiKey | null>(null);

  const fetchKeys = async () => {
    if (!user) return;
    setLoadingKeys(true);
    const keys = await getUserApiKeys(user.uid);
    setApiKeys(keys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoadingKeys(false);
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchKeys();
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  const handleGenerateKey = async (keyName: string) => {
    if (!user) return;
    setNewlyGeneratedKey(null);
    try {
        const result = await generateApiKey({ userId: user.uid, keyName });
        setNewlyGeneratedKey(result);
        toast({ title: 'Success!', description: `API key "${result.name}" has been generated.` });
        await fetchKeys(); // Refresh the list
    } catch(error) {
        console.error("Failed to generate API key:", error);
        toast({ title: 'Error', description: 'Could not generate a new API key.', variant: 'destructive'});
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if(!user) return;
    try {
      await deleteApiKey(user.uid, keyId);
      toast({ title: 'Key Revoked', description: 'The API key has been permanently deleted.' });
      await fetchKeys();
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      toast({ title: 'Error', description: 'Could not revoke the API key.', variant: 'destructive'});
    }
  }

  if (authLoading || loadingKeys) {
    return <div className="flex justify-center items-center h-screen"><LoadingAnimation /></div>;
  }

  return (
     <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
            <div className="max-w-4xl mx-auto">
                <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Profile
                </Link>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline">Developer Portal</h1>
                    <p className="text-muted-foreground">Manage your API keys and access documentation.</p>
                </div>

                <Card className="mb-8">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                             <div>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <Key className="h-6 w-6"/>
                                    API Keys
                                </CardTitle>
                                <CardDescription>Manage your secret keys for accessing the Manda Network API.</CardDescription>
                             </div>
                             <GenerateKeyDialog onGenerate={handleGenerateKey} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {newlyGeneratedKey && (
                            <Alert className="mb-6">
                                <AlertTitle className="font-semibold">New API Key Generated</AlertTitle>
                                <AlertDescription>
                                    Please copy and save this key somewhere safe. You will not be able to see it again.
                                    <CodeBlock>{newlyGeneratedKey.key}</CodeBlock>
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-4">
                           {apiKeys.length > 0 ? (
                                apiKeys.map(key => <ApiKeyRow key={key.id} apiKey={key} onRevoke={handleRevokeKey} />)
                           ) : (
                               <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                                  <p>You don't have any API keys yet.</p>
                               </div>
                           )}
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2"><Code className="h-6 w-6"/> API Documentation</CardTitle>
                        <CardDescription>How to use your API keys to fetch data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <section>
                            <h3 className="text-lg font-semibold mb-2">Authentication</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                All API requests must be authenticated using a Bearer Token. Include your API key in the `Authorization` header of your requests.
                            </p>
                            <CodeBlock>{`Authorization: Bearer YOUR_API_KEY`}</CodeBlock>
                        </section>

                        <Separator />

                        <section>
                             <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Server /> Courses API</h3>
                             <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2"><Badge>GET</Badge> /api/courses</h4>
                                <p className="text-sm text-muted-foreground">
                                    Retrieves a list of all public courses available on the Manda Network platform.
                                </p>

                                <h5 className="font-semibold text-sm pt-2">Example Request:</h5>
                                <CodeBlock>{`curl -X GET 'https://www.mandanetwork.co.ke/api/courses' \\\n     -H 'Authorization: Bearer YOUR_API_KEY'`}</CodeBlock>
                                
                                <h5 className="font-semibold text-sm pt-2">Example Response:</h5>
                                <CodeBlock>{`[
  {
    "id": "course-123",
    "title": "Introduction to AI",
    "description": "Learn the fundamentals of Artificial Intelligence.",
    "price": 4999,
    "category": "Technology"
    ...
  }
]`}</CodeBlock>
                            </div>
                        </section>
                        
                         <Separator />

                         <section>
                             <h3 className="text-lg font-semibold mb-2">Usage & Monetization</h3>
                              <p className="text-sm text-muted-foreground mb-4">
                                API usage is tracked for each key. The default free tier allows for a generous number of requests suitable for development and small projects. For higher limits and access to more advanced endpoints (coming soon), you will be able to upgrade to a Pro plan.
                            </p>
                         </section>

                    </CardContent>
                </Card>
            </div>
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
