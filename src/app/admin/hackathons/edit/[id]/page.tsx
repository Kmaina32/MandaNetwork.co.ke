

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
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
import { ArrowLeft, Loader2, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import { getHackathonById, updateHackathon } from '@/lib/firebase-service';
import type { Hackathon } from '@/lib/types';
import { FormDatePicker } from '@/components/ui/form-datepicker';
import { LoadingAnimation } from '@/components/LoadingAnimation';

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

export default function EditHackathonPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);

  const form = useForm<z.infer<typeof hackathonFormSchema>>({
    resolver: zodResolver(hackathonFormSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      setIsFetching(true);
      try {
        const data = await getHackathonById(params.id);
        if (!data) {
          notFound();
          return;
        }
        setHackathon(data);
        form.reset({
          ...data,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        });
      } catch (error) {
        console.error('Failed to fetch hackathon:', error);
        toast({ title: 'Error', description: 'Failed to load hackathon data.', variant: 'destructive' });
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [params.id, form, toast]);

  const onSubmit = async (values: z.infer<typeof hackathonFormSchema>) => {
    if (!params.id) return;
    setIsLoading(true);
    try {
      await updateHackathon(params.id, {
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
      });
      toast({
        title: 'Hackathon Updated!',
        description: `The hackathon "${values.title}" has been successfully updated.`,
      });
      router.push('/admin/hackathons');
    } catch (error) {
      console.error('Failed to update hackathon:', error);
      toast({
        title: 'Error',
        description: 'Failed to update the hackathon. Please try again.',
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
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <Trophy />
                Edit Hackathon
              </CardTitle>
              <CardDescription>
                Update the details for: "{hackathon?.title}".
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFetching ? (
                <div className="flex justify-center items-center py-10">
                  <LoadingAnimation />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Textarea {...field} className="min-h-[120px]" /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Image URL</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="prizeMoney" render={({ field }) => ( <FormItem> <FormLabel>Prize Money (Ksh)</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="entryFee" render={({ field }) => ( <FormItem> <FormLabel>Entry Fee (Ksh)</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
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
                        <Button type="button" variant="outline" onClick={() => router.push('/admin/hackathons')}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
