
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, User as UserIcon, Camera, Upload, Eye, Building, Share2 } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';
import { uploadImage, saveUser, getUserById } from '@/lib/firebase-service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';
import { auth } from '@/lib/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { RegisteredUser } from '@/lib/types';
import { Icon } from '@iconify/react';

const profileSchema = z.object({
  github: z.string().url().optional().or(z.literal('')),
  gitlab: z.string().url().optional().or(z.literal('')),
  bitbucket: z.string().url().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

export default function PortalProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [dbUser, setDbUser] = useState<RegisteredUser | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            github: '',
            gitlab: '',
            bitbucket: '',
        }
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?redirect=/hackathons');
        }
        if (user) {
            getUserById(user.uid).then(profile => {
                if (profile) {
                    setDbUser(profile);
                    form.reset({
                        github: profile.portfolio?.socialLinks?.github || '',
                        gitlab: profile.portfolio?.socialLinks?.gitlab || '',
                        bitbucket: profile.portfolio?.socialLinks?.bitbucket || '',
                    });
                }
            });
        }
    }, [user, loading, router, form]);
    
    const onSubmit = async (values: ProfileFormValues) => {
        if (!user || !dbUser) return;
        setIsLoading(true);
        try {
            const updatedPortfolio = {
                ...dbUser.portfolio,
                socialLinks: {
                    ...dbUser.portfolio?.socialLinks,
                    ...values
                }
            };
            await saveUser(user.uid, { portfolio: updatedPortfolio });
            toast({ title: 'Success', description: 'Your repository links have been updated.' });
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast({ title: 'Error', description: 'Could not update your profile.', variant: 'destructive'});
        } finally {
            setIsLoading(false);
        }
    }

    if (loading || !user || !dbUser) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
             <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back
            </button>
            <Card className="max-w-2xl mx-auto">
                <CardHeader className="items-center text-center">
                    <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'}/>
                        <AvatarFallback className="text-3xl">{getInitials(user?.displayName)}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-2xl font-headline">{user.displayName}</CardTitle>
                    <CardDescription>Your hackathon portal profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Your Repositories</h3>
                                <div className="space-y-4">
                                     <FormField control={form.control} name="github" render={({ field }) => ( <FormItem> <FormLabel><div className="flex items-center gap-2"><Icon icon="mdi:github" className="h-5 w-5" /> GitHub</div></FormLabel> <FormControl> <Input placeholder="https://github.com/username" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                                     <FormField control={form.control} name="gitlab" render={({ field }) => ( <FormItem> <FormLabel><div className="flex items-center gap-2"><Icon icon="mdi:gitlab" className="h-5 w-5" /> GitLab</div></FormLabel> <FormControl> <Input placeholder="https://gitlab.com/username" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                                     <FormField control={form.control} name="bitbucket" render={({ field }) => ( <FormItem> <FormLabel><div className="flex items-center gap-2"><Icon icon="mdi:bitbucket" className="h-5 w-5" /> Bitbucket</div></FormLabel> <FormControl> <Input placeholder="https://bitbucket.org/username" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                                </div>
                            </div>
                            <CardFooter className="px-0 pt-6">
                               <Button type="submit" className="w-full" disabled={isLoading}>
                                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                 Save Changes
                               </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
