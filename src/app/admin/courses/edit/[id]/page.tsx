
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useForm, useFieldArray, UseFormReturn } from 'react-hook-form';
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
import { ArrowLeft, Loader2, BookText, PlusCircle, Trash2 } from 'lucide-react';
import { getCourseById, updateCourse, getAllCourses } from '@/lib/firebase-service';
import type { Course, Module, Lesson, YoutubeLink } from '@/lib/types';
import { CourseReviewModal } from '@/components/shared/CourseReviewModal';
import { GenerateCourseContentOutput } from '@/ai/flows/generate-course-content';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { RichTextEditor } from '@/components/shared/RichTextEditor';

const youtubeLinkSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Must be a valid URL'),
});

const lessonSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  duration: z.string().min(1, 'Duration is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  youtubeLinks: z.array(youtubeLinkSchema).optional(),
});

const moduleSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  lessons: z.array(lessonSchema).min(1, 'At least one lesson is required'),
});

const courseFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  instructor: z.string().min(2, 'Instructor name is required'),
  category: z.string().min(3, 'Category is required'),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  duration: z.string().min(3, 'Duration is required'),
  description: z.string().min(20, 'Short description is required'),
  longDescription: z.string().min(100, 'Long description must be at least 100 characters'),
  imageUrl: z.string().url('Must be a valid image URL'),
  dripFeed: z.enum(['daily', 'weekly', 'off']),
  prerequisiteCourseId: z.string().optional(),
  modules: z.array(moduleSchema).min(1, 'At least one module is required'),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

function YouTubeLinkFields({ moduleIndex, lessonIndex, form }: { moduleIndex: number, lessonIndex: number, form: UseFormReturn<CourseFormValues>}) {
    const { fields: linkFields, remove: removeLink, append: appendLink } = useFieldArray({
        control: form.control,
        name: `modules.${moduleIndex}.lessons.${lessonIndex}.youtubeLinks`
    });

    return (
        <div className="space-y-2">
            <FormLabel>YouTube Video Links</FormLabel>
            {linkFields.map((link, linkIndex) => (
                <div key={link.id} className="flex items-start gap-2">
                    <div className="flex-grow grid grid-cols-2 gap-2">
                        <Input
                            placeholder="Video Title"
                            {...form.register(`modules.${moduleIndex}.lessons.${lessonIndex}.youtubeLinks.${linkIndex}.title`)}
                        />
                         <Input
                            placeholder="https://youtube.com/watch?v=..."
                            {...form.register(`modules.${moduleIndex}.lessons.${lessonIndex}.youtubeLinks.${linkIndex}.url`)}
                        />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeLink(linkIndex)}> <Trash2 className="h-4 w-4" /> </Button>
                </div>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={() => appendLink({ title: '', url: ''})}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Video Link
            </Button>
        </div>
    )
}

function LessonFields({ moduleIndex, form }: { moduleIndex: number, form: UseFormReturn<CourseFormValues>}) {
    const { fields: lessonFields, remove: removeLesson, append: appendLesson } = useFieldArray({
        control: form.control,
        name: `modules.${moduleIndex}.lessons`
    });
    const contentRef = useRef<HTMLTextAreaElement>(null);

    return (
        <div className="space-y-4 pt-4">
            {lessonFields.map((lesson, lessonIndex) => (
                <div key={lesson.id} className="p-4 border rounded-md space-y-3 bg-background relative">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeLesson(lessonIndex)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => ( <FormItem><FormLabel>Lesson Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.duration`} render={({ field }) => ( <FormItem><FormLabel>Duration</FormLabel><FormControl><Input placeholder="e.g., 15 min" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.content`} render={({ field }) => ( <FormItem> <FormLabel>Lesson Content</FormLabel> <FormControl>
                        <RichTextEditor
                            content={field.value}
                            onChange={field.onChange}
                            textareaRef={contentRef}
                        />
                    </FormControl> <FormMessage /> </FormItem> )}/>
                    <YouTubeLinkFields moduleIndex={moduleIndex} lessonIndex={lessonIndex} form={form} />
                </div>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={() => appendLesson({ id: `lesson-${Date.now()}`, title: 'New Lesson', duration: '5 min', content: '', youtubeLinks: [] })}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Lesson
            </Button>
        </div>
    )
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
  });
  
  const { fields: moduleFields, append: appendModule, remove: removeModule } = useFieldArray({
    control: form.control,
    name: "modules",
  });

  const fetchCourse = async () => {
      setIsFetching(true);
      try {
        const [fetchedCourse, allCoursesData] = await Promise.all([
            getCourseById(params.id as string),
            getAllCourses(),
        ]);

        if (!fetchedCourse) {
          notFound();
          return;
        }
        setCourse(fetchedCourse);
        setAllCourses(allCoursesData);
        form.reset({
            ...fetchedCourse,
            modules: fetchedCourse.modules || [],
            prerequisiteCourseId: fetchedCourse.prerequisiteCourseId || 'none',
        });
      } catch (error) {
        console.error("Failed to fetch course data:", error);
        toast({
          title: 'Error',
          description: 'Failed to load course data. Please try again.',
          variant: 'destructive',
        });
        router.push('/admin');
      } finally {
        setIsFetching(false);
      }
    };

  useEffect(() => {
    if (params.id) {
        fetchCourse();
    }
  }, [params.id]);

  const onSubmit = async (values: CourseFormValues) => {
    if (!params.id) return;
    setIsLoading(true);
    try {
        const dataToSave: Partial<Course> = { ...values };
        if (values.prerequisiteCourseId === 'none') {
            dataToSave.prerequisiteCourseId = undefined; // This will get filtered out
        }

        // Filter out undefined values to avoid overwriting with null in Firebase
        const finalData = Object.fromEntries(Object.entries(dataToSave).filter(([_, v]) => v !== undefined));

        await updateCourse(params.id as string, finalData);
        toast({
            title: 'Success!',
            description: `The course "${values.title}" has been updated.`,
        });
        router.push('/admin/courses');
    } catch (error) {
        console.error("Failed to update course:", error);
        toast({
            title: 'Error',
            description: 'Failed to update the course. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
             <ArrowLeft className="h-4 w-4" />
             Back to Courses
          </Link>
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center gap-2"><BookText /> Edit Course</CardTitle>
                <CardDescription>Update the details, pricing, and content for this course.</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetching ? (
                <div className="flex justify-center items-center py-10">
                  <LoadingAnimation />
                </div>
              ) : (
                <div className="space-y-6">
                    <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Course Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="instructor" render={({ field }) => ( <FormItem><FormLabel>Instructor Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Short Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="longDescription" render={({ field }) => ( <FormItem><FormLabel>Long Description</FormLabel><FormControl><Textarea className="min-h-[150px]" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><FormLabel>Price (Ksh)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                         <FormField control={form.control} name="duration" render={({ field }) => ( <FormItem><FormLabel>Duration</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                    <FormField control={form.control} name="imageUrl" render={({ field }) => ( <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="dripFeed" render={({ field }) => ( <FormItem> <FormLabel>Content Drip Schedule</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="daily">Unlock lessons daily</SelectItem> <SelectItem value="weekly">Unlock lessons weekly</SelectItem> <SelectItem value="off">Unlock all at once</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="prerequisiteCourseId" render={({ field }) => ( <FormItem> <FormLabel>Prerequisite Course (Optional)</FormLabel> <Select onValueChange={field.onChange} value={field.value || 'none'}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="none">None</SelectItem> {allCourses.filter(c => c.id !== course?.id).map(c => ( <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold mb-2">Modules & Lessons</h3>
                        <div className="w-full space-y-4">
                            {moduleFields.map((module, moduleIndex) => (
                               <Card key={module.id} className="bg-secondary/50 p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <FormField control={form.control} name={`modules.${moduleIndex}.title`} render={({ field }) => ( <FormItem className="flex-grow"><FormControl><Input {...field} className="text-lg font-semibold border-0 bg-transparent p-0 focus-visible:ring-0" /></FormControl><FormMessage/></FormItem> )} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeModule(moduleIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                                <LessonFields form={form} moduleIndex={moduleIndex} />
                               </Card>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendModule({ id: `module-${Date.now()}`, title: `Module ${moduleFields.length + 1}`, lessons: [{ id: `lesson-${Date.now()}`, title: 'New Lesson', duration: '5 min', content: '', youtubeLinks: [] }] })}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Module
                        </Button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => router.push('/admin/courses')}>Cancel</Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
          </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
