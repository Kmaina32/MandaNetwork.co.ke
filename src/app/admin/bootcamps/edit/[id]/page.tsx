

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
import { ArrowLeft, Loader2, Rocket, Calendar as CalendarIcon } from 'lucide-react';
import { updateBootcamp, getAllCourses, getBootcampById } from '@/lib/firebase-service';
import type { Course, Bootcamp } from '@/lib/mock-data';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/hooks/use-auth';
import { LoadingAnimation } from '@/components/LoadingAnimation';

const bootcampFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  imageUrl: z.string().url('Must be a valid image URL'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  duration: z.string().min(3, 'Duration is required'),
  startDate: z.date({ required_error: 'A start date is required.' }),
  courseIds: z.array(z.string()).min(1, 'You must select at least one course.'),
});

export default function EditBootcampPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [bootcamp, setBootcamp] = useState<Bootcamp | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  const form = useForm<z.infer<typeof bootcampFormSchema>>({
    resolver: zodResolver(bootcampFormSchema),
  });
  
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
        toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
        router.push('/admin/bootcamps');
    }
  }, [isSuperAdmin, authLoading, router, toast]);

  useEffect(() => {
    if (!params.id || !isSuperAdmin) return;
    
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const [data, coursesData] = await Promise.all([
          getBootcampById(params.id),
          getAllCourses(),
        ]);
        
        if (!data) {
          notFound();
          return;
        }

        setBootcamp(data);
        setCourses(coursesData);
        form.reset({
          ...data,
          startDate: new Date(data.startDate),
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load bootcamp data.',
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [params.id, form, toast, isSuperAdmin]);

  const onSubmit = async (values: z.infer<typeof bootcampFormSchema>) => {
    if (!params.id) return;
    setIsLoading(true);
    try {
      await updateBootcamp(params.id, {
        ...values,
        startDate: values.startDate.toISOString()
      });
      toast({
        title: 'Bootcamp Updated!',
        description: `The bootcamp "${values.title}" has been successfully updated.`,
      });
      router.push('/admin/bootcamps');
    } catch (error) {
      console.error('Failed to update bootcamp:', error);
      toast({
        title: 'Error',
        description: 'Failed to update the bootcamp. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !isSuperAdmin) {
      return (
           <div className="flex justify-center items-center h-screen">
                <LoadingAnimation />
            </div>
      )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/admin/bootcamps" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Bootcamps
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <Rocket />
                Edit Bootcamp
              </CardTitle>
              <CardDescription>
                Update the details for: "{bootcamp?.title}".
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
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bootcamp Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Textarea {...field} className="min-h-[120px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl>
                            <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price (Ksh)</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Duration</FormLabel>
                            <FormControl>
                            <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date("1900-01-01")}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="courseIds"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Curriculum</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Select the courses to include in this bootcamp.
                          </p>
                        </div>
                        <ScrollArea className="h-72 w-full rounded-md border">
                            <div className="p-4">
                              {courses.map((course) => (
                                <FormField
                                  key={course.id}
                                  control={form.control}
                                  name="courseIds"
                                  render={({ field }) => (
                                    <FormItem
                                      key={course.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(course.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), course.id])
                                              : field.onChange(
                                                  (field.value || []).filter(
                                                    (value) => value !== course.id
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {course.title}
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                        </ScrollArea>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => router.push('/admin/bootcamps')}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
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
