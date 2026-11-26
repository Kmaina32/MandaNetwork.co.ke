
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trophy, Sparkles } from 'lucide-react';
import { createHackathon } from '@/lib/firebase-service';
import { FormDatePicker } from '@/components/ui/form-datepicker';
import { generateHackathonIdeas } from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label';

const hackathonFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  imageUrl: z.string().url('Must be a valid image URL'),
  prizeMoney: z.coerce.number().min(0, 'Prize must be a positive number.'),
  entryFee: z.coerce.number().min(0, 'Entry fee must be a positive number.'),
  startDate: z.date({ required_error: 'A start date is required.' }),
  endDate: z.date({ required_error: 'An end date is required.' }),
  externalUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export default function CreateHackathonPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateTheme, setGenerateTheme] = useState('');
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof hackathonFormSchema>>({
    resolver: zodResolver(hackathonFormSchema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: 'https://placehold.co/1200x400',
      prizeMoney: 100000,
      entryFee: 1000,
      externalUrl: '',
    },
  });

  const handleGenerate = async () => {
    if (!generateTheme) return;
    
    setIsGenerating(true);
    setIsGenerateDialogOpen(false);
    toast({ title: "Generating Ideas...", description: "The AI is brainstorming hackathon ideas."});
    try {
        const result = await generateHackathonIdeas({ theme: generateTheme, count: 1 });
        if (result.ideas.length > 0) {
            const idea = result.ideas[0];
            form.reset({
                ...form.getValues(), // keep existing values like dates if set
                title: idea.title,
                description: idea.description,
                prizeMoney: idea.prizeMoney,
            });
            toast({ title: "Idea Generated!", description: "An idea has been loaded into the form."});
        }
    } catch(error) {
        console.error("Failed to generate hackathon ideas", error);
        toast({ title: "Error", description: "Could not generate ideas.", variant: "destructive"});
    } finally {
        setIsGenerating(false);
        setGenerateTheme('');
    }
  }

  const onSubmit = async (values: z.infer<typeof hackathonFormSchema>) => {
    setIsLoading(true);
    try {
      await createHackathon({
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
      });
      toast({
        title: 'Hackathon Created!',
        description: `The hackathon "${values.title}" has been successfully created.`,
      });
      router.push('/admin/hackathons');
    } catch (error) {
      console.error('Failed to create hackathon:', error);
      toast({
        title: 'Error',
        description: 'Failed to create the hackathon. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/admin/hackathons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Hackathons
          </Link>
          <Card>
            <CardHeader>
             <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-2xl font-headline flex items-center gap-2">
                        <Trophy />
                        Create Hackathon
                    </CardTitle>
                    <CardDescription>
                        Set up a new competitive event for your community.
                    </CardDescription>
                </div>
                <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Idea
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate Hackathon Idea</DialogTitle>
                      <DialogDescription>
                        Enter a theme and the AI will generate an idea for you.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <Input
                            id="theme"
                            value={generateTheme}
                            onChange={(e) => setGenerateTheme(e.target.value)}
                            placeholder='e.g., "Fintech in Kenya", "Sustainable Agriculture"'
                        />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleGenerate} disabled={!generateTheme || isGenerating}>
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Varban Academy Fintech Challenge" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="A description of the hackathon..." {...field} className="min-h-[120px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Image URL</FormLabel> <FormControl> <Input placeholder="https://placehold.co/1200x400" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField control={form.control} name="prizeMoney" render={({ field }) => ( <FormItem> <FormLabel>Prize Money (Ksh)</FormLabel> <FormControl> <Input type="number" placeholder="e.g., 100000" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                     <FormField control={form.control} name="entryFee" render={({ field }) => ( <FormItem> <FormLabel>Entry Fee (Ksh)</FormLabel> <FormControl> <Input type="number" placeholder="e.g., 1000" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <FormDatePicker
                            value={field.value}
                            onSelect={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <FormDatePicker
                            value={field.value}
                            onSelect={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField control={form.control} name="externalUrl" render={({ field }) => ( <FormItem> <FormLabel>External URL (Optional)</FormLabel> <FormControl> <Input placeholder="e.g., https://devpost.com/my-hackathon" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.push('/admin/hackathons')}> Cancel </Button>
                    <Button type="submit" disabled={isLoading}> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Hackathon </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
