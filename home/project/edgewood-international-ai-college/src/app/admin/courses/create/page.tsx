
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller, UseFormReturn } from 'react-hook-form';
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
import { ArrowLeft, Loader2, Sparkles, PlusCircle, Trash2, BookText } from 'lucide-react';
import { createCourse, getAllCourses } from '@/lib/firebase-service';
import type { Course } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { generateCourseContent } from '@/app/actions';
import { CourseReviewModal } from '@/components/shared/CourseReviewModal';
import { GenerateCourseContentOutput } from '@/ai/flows/generate-course-content';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

const youtubeLinkSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Must be a valid URL'),
});

const lessonSchema = z.object({
  id: z.string().default(() => `lesson-${Date.now()}`),
  title: z.string().min(1, 'Title is required'),
  duration: z.string().min(1, 'Duration is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  youtubeLinks: z.array(youtubeLinkSchema).optional(),
});

const moduleSchema = z.object({
  id: z.string().default(() => `module-${Date.now()}`),
  title: z.string().min(1, 'Title is required'),
  lessons: z.array(lessonSchema).min(1, 'At least one lesson is required'),
});

const courseFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  instructor: z.string().min(2, 'Instructor name is required'),
  category: z.string().min(3, 'Category is required'),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  duration: z.string().min(3, 'Duration is required (e.g., 5 Weeks)'),
  description: z.string().min(20, "A short description is required."),
  longDescription: z.string().min(100, "A detailed description is required."),
  dripFeed: z.enum(['daily', 'weekly', 'off']),
  modules: z.array(moduleSchema).min(1, 'At least one module is required'),
  prerequisiteCourseId: z.string().optional(),
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

    return (
        <div className="space-y-4 pt-4">
            {lessonFields.map((lesson, lessonIndex) => (
                <div key={lesson.id} className="p-4 border rounded-md space-y-3 bg-background relative">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeLesson(lessonIndex)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <FormField 
                        control={form.control} 
                        name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} 
                        render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel>Lesson Title</FormLabel> 
                                <FormControl> 
                                    <Input {...field} /> 
                                </FormControl> 
                                <FormMessage /> 
                            </FormItem> 
                        )}
                    />
                    <FormField 
                        control={form.control} 
                        name={`modules.${moduleIndex}.lessons.${lessonIndex}.duration`} 
                        render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel>Duration</FormLabel> 
                                <FormControl> 
                                    <Input placeholder="e.g., 15 min" {...field} /> 
                                </FormControl> 
                                <FormMessage /> 
                            </FormItem> 
                        )}
                    />
                    <FormField 
                        control={form.control} 
                        name={`modules.${moduleIndex}.lessons.${lessonIndex}.content`} 
                        render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel>Lesson Content</FormLabel> 
                                <FormControl> 
                                    <Textarea {...field} className="min-h-[100px]" /> 
                                </FormControl> 
                                <FormMessage /> 
                            </FormItem> 
                        )}
                    />
                    <YouTubeLinkFields moduleIndex={moduleIndex} lessonIndex={lessonIndex} form={form} />
                </div>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={() => appendLesson({ id: `lesson-${Date.now()}`, title: 'New Lesson', duration: '5 min', content: '', youtubeLinks: [] })}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Lesson
            </Button>
        </div>
    )
}

function ModuleCardItem({ moduleIndex, removeModule, form }: {
  moduleIndex: number;
  removeModule: (index: number) => void;
  form: UseFormReturn<CourseFormValues>;
}) {
  return (
    <Card className="bg-secondary/50">
      <CardHeader>
        <div className="flex justify-between items-center">
            <FormField
                control={form.control}
                name={`modules.${moduleIndex}.title`}
                render={({ field }) => (
                <FormItem className="flex-grow">
                    <FormControl>
                        <Input placeholder="e.g., Introduction to..." {...field} className="text-lg font-semibold border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive rounded-full hover:bg-destructive/10 h-8 w-8"
                onClick={() => removeModule(moduleIndex)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent>
            <LessonFields form={form} moduleIndex={moduleIndex} />
      </CardContent>
    </Card>
  );
}


export default function CreateCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GenerateCourseContentOutput | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateCourseTitle, setGenerateCourseTitle] = useState('');
  const [generateCourseContext, setGenerateCourseContext] = useState('');
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  useEffect(() => {
    getAllCourses().then(setAllCourses);
  }, []);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: '',
      instructor: '',
      category: '',
      price: 0,
      duration: '',
      description: '',
      longDescription: '',
      dripFeed: 'daily',
      modules: [{ id: `module-${Date.now()}`, title: 'Module 1: Getting Started', lessons: [{ id: `lesson-${Date.now()}`, title: 'Welcome to the Course!', duration: '5 min', content: 'This is the first lesson.', youtubeLinks: [] }] }],
      prerequisiteCourseId: 'none',
    },
  });

  const { fields: moduleFields, append: appendModule, remove: removeModule, replace: replaceModules } = useFieldArray({
      control: form.control,
      name: "modules",
  });

  const handleGenerate = async () => {
    if (!generateCourseTitle) return;

    setIsGenerating(true);
    setIsGenerateModalOpen(false);
    toast({ title: "Generating Course...", description: "The AI is creating your course. This might take a moment." });

    try {
        const result = await generateCourseContent({ 
            courseTitle: generateCourseTitle,
            courseContext: generateCourseContext 
        });
        setGeneratedContent(result);
        setIsReviewModalOpen(true);
        form.setValue('title', generateCourseTitle); // Pre-fill the main form title
    } catch (error) {
        console.error("Failed to generate course content", error);
        toast({ title: "Error", description: "Could not generate course content.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
        setGenerateCourseTitle('');
        setGenerateCourseContext('');
    }
  };
  
  const handleContentSave = (editedContent: GenerateCourseContentOutput) => {
    form.setValue('longDescription', editedContent.longDescription);
    form.setValue('duration', editedContent.duration);
    replaceModules(editedContent.modules);
    // Note: Exam is handled in a separate flow, so we don't set it here.
    toast({ title: "Content Loaded!", description: "AI-generated content has been loaded into the form. Review and save." });
    setIsReviewModalOpen(false);
  }

  const onSubmit = async (values: CourseFormValues) => {
    if (!user) return;
    setIsLoading(true);
     try {
        const courseData: Omit<Course, 'id' | 'createdAt' | 'project' | 'discussionPrompt'> = {
            ...values,
            imageUrl: 'https://placehold.co/600x400',
            exam: [], // Exams are now handled separately
            prerequisiteCourseId: values.prerequisiteCourseId === 'none' ? undefined : values.prerequisiteCourseId,
        }
        await createCourse(courseData);
        toast({
            title: 'Course Created!',
            description: `The course "${values.title}" has been successfully saved.`,
        });
        router.push(`/admin/courses`);
     } catch (error) {
         console.error("Failed to save course:", error);
         toast({
            title: 'Error',
            description: 'Failed to save the course. Please try again.',
            variant: 'destructive',
        });
     } finally {
         setIsLoading(false);
     }
  }


  return (
    <>
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
                  <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2"><BookText /> Create New Course</CardTitle>
                        <CardDescription>Manually create a new course or use AI to generate one from a title.</CardDescription>
                    </div>
                     <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" disabled={isGenerating}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate with AI
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Generate Course with AI</DialogTitle>
                                <DialogDescription>
                                    Enter a course title and optionally provide context like a Kaggle URL, YouTube transcript, or sample data.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <FormLabel htmlFor="course-title-ai">Course Title</FormLabel>
                                    <Input
                                        id="course-title-ai"
                                        value={generateCourseTitle}
                                        onChange={(e) => setGenerateCourseTitle(e.target.value)}
                                        placeholder="e.g., Introduction to Plumbing"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <FormLabel htmlFor="course-context-ai">Context (Optional)</FormLabel>
                                    <Textarea
                                        id="course-context-ai"
                                        value={generateCourseContext}
                                        onChange={(e) => setGenerateCourseContext(e.target.value)}
                                        placeholder="e.g., A YouTube transcript, Kaggle URL, or sample CSV data."
                                        className="min-h-[100px]"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsGenerateModalOpen(false)}>Cancel</Button>
                                <Button type="button" onClick={handleGenerate} disabled={!generateCourseTitle}>Generate</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                    <FormField 
                        control={form.control} 
                        name="title" 
                        render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel>Course Title</FormLabel> 
                                <FormControl> 
                                    <Input placeholder="e.g., Introduction to Digital Marketing" {...field} /> 
                                </FormControl> 
                                <FormMessage /> 
                            </FormItem> 
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField 
                            control={form.control} 
                            name="instructor" 
                            render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel>Instructor Name</FormLabel> 
                                    <FormControl> 
                                        <Input placeholder="e.g., Jane Doe" {...field} /> 
                                    </FormControl> 
                                    <FormMessage /> 
                                </FormItem> 
                            )}
                        />
                        <FormField 
                            control={form.control} 
                            name="category" 
                            render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel>Category</FormLabel> 
                                    <FormControl> 
                                        <Input placeholder="e.g., Business, Technology" {...field} /> 
                                    </FormControl> 
                                    <FormMessage /> 
                                </FormItem> 
                            )}
                        />
                    </div>

                    <FormField 
                        control={form.control} 
                        name="description" 
                        render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel>Short Description</FormLabel> 
                                <FormControl> 
                                    <Textarea placeholder="A brief, one-sentence summary for course cards." {...field} /> 
                                </FormControl> 
                                <FormMessage /> 
                            </FormItem> 
                        )}
                    />
                    <FormField 
                        control={form.control} 
                        name="longDescription" 
                        render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel>Long Description</FormLabel> 
                                <FormControl> 
                                    <Textarea placeholder="A detailed course description for the main course page." className="min-h-32" {...field} /> 
                                </FormControl> 
                                <FormMessage /> 
                            </FormItem> 
                        )}
                    />


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField 
                            control={form.control} 
                            name="price" 
                            render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel>Price (Ksh)</FormLabel> 
                                    <FormControl> 
                                        <Input type="number" placeholder="e.g., 4999" {...field} /> 
                                    </FormControl> 
                                    <p className="text-sm text-muted-foreground">Enter 0 for a free course.</p> 
                                    <FormMessage /> 
                                </FormItem> 
                            )}
                        />
                        <FormField 
                            control={form.control} 
                            name="duration" 
                            render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel>Course Duration</FormLabel> 
                                    <FormControl> 
                                        <Input placeholder="e.g., 5 Weeks" {...field} /> 
                                    </FormControl> 
                                    <FormMessage /> 
                                </FormItem> 
                            )}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="dripFeed"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content Drip Schedule</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a schedule..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="daily">Unlock lessons daily</SelectItem>
                                  <SelectItem value="weekly">Unlock lessons weekly</SelectItem>
                                  <SelectItem value="off">Unlock all at once</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="prerequisiteCourseId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prerequisite Course (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a prerequisite..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {allCourses.map(course => (
                                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Modules & Lessons</h3>
                         <div className="w-full space-y-4">
                            {moduleFields.map((module, moduleIndex) => (
                                <ModuleCardItem
                                    key={module.id}
                                    moduleIndex={moduleIndex}
                                    removeModule={removeModule}
                                    form={form}
                                />
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendModule({ id: `module-${Date.now()}`, title: `Module ${moduleFields.length + 1}`, lessons: [{ id: `lesson-${Date.now()}`, title: 'New Lesson', duration: '5 min', content: '', youtubeLinks: [] }] })}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Module
                        </Button>
                    </div>


                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => router.push('/admin/courses')}> Cancel </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create Course
                        </Button>
                    </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
    {generatedContent && (
        <CourseReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            courseContent={generatedContent}
            onSave={handleContentSave}
            isSaving={isLoading}
        />
    )}
    </>
  );
}
