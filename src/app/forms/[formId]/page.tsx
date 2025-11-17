
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getFormById, createFormSubmission } from '@/lib/firebase-service';
import type { Form as FormType, FormSubmission } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footer } from '@/components/shared/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, GitBranch, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Slider } from '@/components/ui/slider';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

// Dynamically build the Zod schema from the form questions
const buildSchema = (form: FormType) => {
    const shape: Record<string, z.ZodSchema<any>> = {};
    form.questions.forEach(q => {
        switch(q.type) {
            case 'short-text':
            case 'long-text':
                shape[q.id] = z.string().min(1, 'This field is required.');
                break;
            case 'multiple-choice':
                shape[q.id] = z.string({ required_error: "Please select an option." });
                break;
            case 'rating':
                shape[q.id] = z.number().min(1).max(5);
                break;
        }
    });
    return z.object(shape);
};

export default function FillFormPage() {
    const params = useParams<{ formId: string }>();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [formDef, setFormDef] = useState<FormType | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionComplete, setSubmissionComplete] = useState(false);

    const formSchema = formDef ? buildSchema(formDef) : z.object({});
    type FormValues = z.infer<typeof formSchema>;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        const formId = params.formId;
        if (!formId) return;

        const fetchForm = async () => {
            setLoading(true);
            try {
                const formData = await getFormById(formId as string);
                if (!formData) {
                    notFound();
                    return;
                }
                setFormDef(formData);
            } catch (error) {
                console.error("Failed to fetch form:", error);
                notFound();
            } finally {
                setLoading(false);
            }
        };
        fetchForm();
    }, [params.formId]);

    const onSubmit = async (values: FormValues) => {
        if (!user || !formDef) return;
        setIsSubmitting(true);
        try {
            await createFormSubmission({
                formId: formDef.id,
                userId: user.uid,
                submittedAt: new Date().toISOString(),
                answers: values,
            });
            setSubmissionComplete(true);
        } catch (error) {
            console.error('Failed to submit form:', error);
            toast({
                title: 'Error',
                description: 'Failed to submit the form. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center"><LoadingAnimation /></div>;
    }

    if (!user) {
        router.push('/login?redirect=/forms/' + params.formId);
        return null;
    }

    if (!formDef) {
        notFound();
    }
    
    if (submissionComplete) {
        return (
             <div className="flex flex-col min-h-screen">
                <main className="flex-grow flex items-center justify-center bg-secondary p-4">
                     <Card className="w-full max-w-lg text-center">
                        <CardHeader>
                            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                                <CheckCircle className="h-10 w-10 text-green-600"/>
                            </div>
                            <CardTitle className="text-2xl font-headline">Thank You!</CardTitle>
                            <CardDescription>Your response has been submitted successfully.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/dashboard">Back to Dashboard</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Header />
                <div className="flex flex-col min-h-screen">
                    <main className="flex-grow flex items-center justify-center p-4 md:p-8 bg-secondary/30">
                        <div className="w-full max-w-3xl mx-auto">
                             <div className="text-center mb-8">
                                <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl font-headline mb-4">
                                    <GitBranch className="h-7 w-7 text-primary" />
                                    <span>Manda Network</span>
                                </Link>
                                <h1 className="text-3xl font-bold">{formDef.title}</h1>
                                {formDef.description && <p className="text-muted-foreground mt-2">{formDef.description}</p>}
                            </div>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                    {formDef.questions.map((q, index) => (
                                        <Card key={q.id} className="p-6">
                                            <FormLabel className="text-base font-semibold">{index + 1}. {q.text}</FormLabel>
                                            <div className="mt-4">
                                            <FormField
                                                    control={form.control}
                                                    name={q.id}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                {q.type === 'short-text' && <Input {...field} />}
                                                                {q.type === 'long-text' && <Textarea className="min-h-24" {...field} />}
                                                                {q.type === 'multiple-choice' && (
                                                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">
                                                                        {q.options?.map((option, i) => (
                                                                            <FormItem key={i} className="flex items-center space-x-3 space-y-0">
                                                                                <FormControl>
                                                                                    <RadioGroupItem value={option} />
                                                                                </FormControl>
                                                                                <FormLabel className="font-normal">{option}</FormLabel>
                                                                            </FormItem>
                                                                        ))}
                                                                    </RadioGroup>
                                                                )}
                                                                {q.type === 'rating' && (
                                                                    <div className="flex items-center gap-4">
                                                                        <Slider
                                                                            defaultValue={[3]}
                                                                            min={1}
                                                                            max={5}
                                                                            step={1}
                                                                            onValueChange={(value) => field.onChange(value[0])}
                                                                        />
                                                                        <span className="font-bold w-12 text-center">{field.value || '...'}</span>
                                                                    </div>
                                                                )}
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </Card>
                                    ))}
                                    <div className="flex justify-end">
                                        <Button type="submit" size="lg" disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                            Submit Form
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </div>
                    </main>
                    <Footer />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
