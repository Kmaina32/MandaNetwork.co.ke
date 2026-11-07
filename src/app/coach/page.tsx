
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles, Bot, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getLearningPath } from '@/app/actions';
import type { LearningPathOutput } from '@/ai/flows/career-coach';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getTutorSettings } from '@/lib/firebase-service';
import type { TutorSettings } from '@/lib/firebase-service';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { slugify } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const careerGoalSchema = z.object({
  goal: z.string().min(10, 'Please describe your career goal in more detail.'),
});

type HistoryItem = {
    role: 'user' | 'model';
    content: string;
};

export default function CareerCoachPage() {
  const { user, loading: authLoading, isAiConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPathOutput | null>(null);
  const [tutorSettings, setTutorSettings] = useState<TutorSettings | null>(null);
  const [conversationHistory, setConversationHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    getTutorSettings().then(setTutorSettings);
  }, []);

  const form = useForm<z.infer<typeof careerGoalSchema>>({
    resolver: zodResolver(careerGoalSchema),
    defaultValues: {
      goal: '',
    },
  });
  
  const onSubmit = async (values: z.infer<typeof careerGoalSchema>) => {
    setIsLoading(true);
    setLearningPath(null);

    const newUserMessage: HistoryItem = { role: 'user', content: values.goal };

    try {
      const result = await getLearningPath({
        careerGoal: values.goal,
        history: [...conversationHistory, newUserMessage],
      });
      setLearningPath(result);
      const modelResponse: HistoryItem = {
        role: 'model',
        content: `Generated a learning path with introduction: "${'result.introduction'}"`,
      };
      setConversationHistory(prev => [...prev, newUserMessage, modelResponse]);
      form.reset();
    } catch (error) {
      console.error('AI Career Coach failed:', error);
      toast({
        title: 'Error',
        description: 'The AI coach could not generate a path. Please try a different goal.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!user) {
      router.push('/login');
      return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen bg-secondary/50">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl font-bold font-headline">AI Career Coach</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Tell me your career goal, and I'll create a personalized learning path for you using courses from our catalog.
                </p>
              </div>

               {!isAiConfigured ? (
                 <Alert variant="destructive" className="mb-8">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>AI Feature Not Configured</AlertTitle>
                  <AlertDescription>
                    The AI Career Coach is currently unavailable. The application is missing the required API key for this service.
                  </AlertDescription>
                </Alert>
               ) : (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>What is your career goal?</CardTitle>
                        <CardDescription>
                            Be specific! For example, "I want to become a freelance social media manager for small businesses in Kenya."
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
                        <FormField
                            control={form.control}
                            name="goal"
                            render={({ field }) => (
                            <FormItem className="flex-grow w-full">
                                <FormControl>
                                <Input placeholder="e.g., Become a full-stack web developer" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                            {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Generate My Path
                        </Button>
                        </form>
                    </Form>
                    </CardContent>
                </Card>
               )}
                
              {conversationHistory.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-2">Conversation History</h3>
                    <Card>
                        <CardContent className="p-4 max-h-48">
                            <ScrollArea className="h-full">
                                <div className="space-y-4 text-sm">
                                    {conversationHistory.map((item, index) => (
                                        <div key={index} className={`flex items-start gap-2 ${item.role === 'user' ? 'text-right justify-end' : ''}`}>
                                            {item.role === 'model' && (
                                                <Avatar className="h-6 w-6 border flex-shrink-0">
                                                    <AvatarImage src={tutorSettings?.avatarUrl} />
                                                    <AvatarFallback><Bot/></AvatarFallback>
                                                </Avatar>
                                            )}
                                            <p className={`p-2 rounded-md ${item.role === 'user' ? 'bg-primary/10' : 'bg-secondary'}`}>{item.content}</p>
                                            {item.role === 'user' && (
                                                <Avatar className="h-6 w-6 border flex-shrink-0">
                                                    <AvatarImage src={user?.photoURL || ''} />
                                                    <AvatarFallback>U</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
              )}

              {isLoading && (
                <div className="text-center py-10">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={tutorSettings?.avatarUrl} />
                            <AvatarFallback><Bot/></AvatarFallback>
                        </Avatar>
                        <p className="text-lg">Your AI coach is building your learning plan...</p>
                    </div>
                </div>
              )}

              {learningPath && (
                <div className="space-y-6 animate-in fade-in-50 duration-500">
                    <div className="p-6 bg-background rounded-lg border flex items-start gap-4">
                         <Avatar className="h-10 w-10 border">
                            <AvatarImage src={tutorSettings?.avatarUrl} />
                            <AvatarFallback><Bot/></AvatarFallback>
                        </Avatar>
                        <p className="italic text-muted-foreground pt-2">{learningPath.introduction}</p>
                    </div>

                  {learningPath.learningPath.map((step, index) => (
                    <Card key={step.courseId} className="overflow-hidden">
                        <CardHeader className="flex flex-row items-start bg-secondary/50 gap-4">
                            <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center font-bold text-lg">
                                {index + 1}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-muted-foreground">Step {index + 1}</p>
                                <CardTitle className="text-xl font-headline">{step.courseTitle}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <p><strong className="font-semibold">Why this course:</strong> {step.reasoning}</p>
                             <Button asChild>
                                <Link href={`/courses/${slugify(step.courseTitle)}`}>
                                    View Course
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                  ))}
                  
                   <div className="p-6 bg-background rounded-lg border text-center space-y-4">
                        <CheckCircle className="h-10 w-10 text-green-500 mx-auto"/>
                        <p className="italic text-muted-foreground">{learningPath.conclusion}</p>
                    </div>
                </div>
              )}
            </div>
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
