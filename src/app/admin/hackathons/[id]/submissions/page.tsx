
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { getHackathonById, getHackathonSubmissions } from '@/lib/firebase-service';
import type { Hackathon, HackathonSubmission } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, GitBranch, Github, ExternalLink, User, Award } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { awardPoints } from '@/app/actions';


const getInitials = (name: string) => {
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

const pointAwardSchema = z.object({
  points: z.coerce.number().int().min(1, "Points must be at least 1."),
});

function SubmissionCard({ sub }: { sub: HackathonSubmission }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof pointAwardSchema>>({
        resolver: zodResolver(pointAwardSchema),
        defaultValues: { points: 10 },
    });
    
    const onAwardPoints = async (values: z.infer<typeof pointAwardSchema>) => {
        setIsSubmitting(true);
        try {
            await awardPoints(sub.userId, values.points);
            toast({
                title: 'Points Awarded!',
                description: `${values.points} points have been awarded to ${sub.userName}.`
            });
            form.reset();
        } catch (error) {
            console.error("Failed to award points:", error);
            toast({ title: 'Error', description: 'Could not award points.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>{sub.projectName}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                    <User className="h-4 w-4"/>
                    <span>{sub.userName}</span>
                    <span>&bull;</span>
                    <span>{format(new Date(sub.submittedAt), 'PPP')}</span>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-4">{sub.description}</p>
            </CardContent>
             <CardFooter className="flex flex-col items-start gap-4">
                 <div className="flex justify-start gap-2 w-full">
                     <Button asChild size="sm" variant="outline">
                        <a href={sub.githubUrl} target="_blank" rel="noreferrer" title="GitHub Repo">
                            <Github className="mr-2 h-4 w-4" />
                            Code
                        </a>
                    </Button>
                     <Button asChild size="sm">
                        <a href={sub.liveUrl} target="_blank" rel="noreferrer" title="Live Demo">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Live Demo
                        </a>
                    </Button>
                 </div>
                 <Form {...form}>
                     <form onSubmit={form.handleSubmit(onAwardPoints)} className="flex items-end gap-2 w-full">
                        <FormField
                            control={form.control}
                            name="points"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormLabel className="text-xs">Award Points</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 50" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Award className="h-4 w-4" />}
                        </Button>
                     </form>
                 </Form>
            </CardFooter>
        </Card>
    )
}

export default function HackathonSubmissionsPage() {
    const params = useParams<{ id: string }>();
    const { user, loading: authLoading } = useAuth();
    const [hackathon, setHackathon] = useState<Hackathon | null>(null);
    const [submissions, setSubmissions] = useState<HackathonSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmissions = async () => {
            setLoading(true);
            try {
                const [hackathonData, submissionsData] = await Promise.all([
                    getHackathonById(params.id),
                    getHackathonSubmissions(params.id),
                ]);

                if (!hackathonData) {
                    notFound();
                    return;
                }
                setHackathon(hackathonData);
                setSubmissions(submissionsData.sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
            } catch (error) {
                console.error("Failed to fetch submissions:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchSubmissions();
    }, [params.id]);

    if (authLoading || loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </main>
            </div>
        );
    }

    if (!hackathon) {
        notFound();
    }

    return (
        <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
            <div className="max-w-6xl mx-auto">
                <Link href="/admin/hackathons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Hackathons
                </Link>
                <div className="flex items-center gap-4 mb-8">
                    <GitBranch className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Submissions for "{hackathon.title}"</h1>
                        <p className="text-muted-foreground">Review all projects submitted for this hackathon.</p>
                    </div>
                </div>

                {submissions.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {submissions.map(sub => (
                             <SubmissionCard key={sub.id} sub={sub} />
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-20 border-2 border-dashed">
                        <CardContent>
                            <h3 className="text-xl font-semibold">No Submissions Yet</h3>
                            <p className="text-muted-foreground mt-2">Check back later to review projects for this hackathon.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    );
}
