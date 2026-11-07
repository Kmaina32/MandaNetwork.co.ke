
'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { GenerateCourseContentOutput } from '@/ai/flows/generate-course-content';

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

const shortAnswerSchema = z.object({
  id: z.string(),
  type: z.literal('short-answer'),
  question: z.string().min(1, "Question cannot be empty"),
  referenceAnswer: z.string().min(1, "Reference answer cannot be empty"),
  maxPoints: z.coerce.number().min(1, "Points must be at least 1"),
});

const multipleChoiceSchema = z.object({
  id: z.string(),
  type: z.literal('multiple-choice'),
  question: z.string().min(1, "Question cannot be empty"),
  options: z.array(z.string().min(1, "Option cannot be empty")).length(4, "Must have exactly 4 options"),
  correctAnswer: z.coerce.number().min(0).max(3),
  maxPoints: z.coerce.number().min(1, "Points must be at least 1"),
});

const examQuestionSchema = z.union([shortAnswerSchema, multipleChoiceSchema]);


const courseContentSchema = z.object({
  longDescription: z.string().min(100, "A detailed description is required."),
  duration: z.string().min(3, 'Duration is required (e.g., 5 Weeks)'),
  modules: z.array(moduleSchema).min(1, 'At least one module is required'),
  exam: z.array(examQuestionSchema).optional(),
});

interface CourseReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseContent: GenerateCourseContentOutput | null;
  onSave: (editedContent: GenerateCourseContentOutput) => void;
  isSaving: boolean;
}

export function CourseReviewModal({ isOpen, onClose, courseContent, onSave, isSaving }: CourseReviewModalProps) {
  
  const form = useForm<z.infer<typeof courseContentSchema>>({
    resolver: zodResolver(courseContentSchema),
    defaultValues: (courseContent ? {
      longDescription: courseContent.longDescription,
      duration: courseContent.duration,
      modules: courseContent.modules.map(module => ({
        id: module.id,
        title: module.title,
        lessons: module.lessons.map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          duration: lesson.duration,
          content: lesson.content,
          youtubeLinks: lesson.youtubeLinks || [],
        })),
      })),
      exam: courseContent.exam || [],
    } : {
      longDescription: '',
      duration: '',
      modules: [],
      exam: [],
    }) as z.infer<typeof courseContentSchema>,
  });

  useEffect(() => {
    if (isOpen && courseContent) {
      form.reset({
        longDescription: courseContent.longDescription,
        duration: courseContent.duration,
        modules: courseContent.modules.map(module => ({
          id: module.id,
          title: module.title,
          lessons: module.lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            duration: lesson.duration,
            content: lesson.content,
            youtubeLinks: lesson.youtubeLinks || [],
          })),
        })),
        exam: courseContent.exam || [],
      } as z.infer<typeof courseContentSchema>);
    }
  }, [isOpen, courseContent, form]);

  const { fields: moduleFields, append: appendModule, remove: removeModule } = useFieldArray({
      control: form.control,
      name: "modules",
  });

  const onSubmit = (values: z.infer<typeof courseContentSchema>) => {
    const mergedModules = values.modules.map((module, moduleIndex) => ({
      ...courseContent?.modules[moduleIndex],
      ...module,
      lessons: module.lessons.map((lesson, lessonIndex) => ({
        ...courseContent?.modules[moduleIndex]?.lessons[lessonIndex],
        ...lesson,
      })),
    }));
    onSave({
      ...(courseContent || {}),
      ...values,
      modules: mergedModules,
    } as GenerateCourseContentOutput);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review & Edit Generated Content</DialogTitle>
          <DialogDescription>
            The AI has generated the course content. Review and make any necessary changes before saving.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-hidden flex flex-col">
                <ScrollArea className="flex-grow pr-6">
                 <div className="space-y-6">
                    <FormField control={form.control} name="longDescription" render={({ field }) => ( <FormItem> <FormLabel>Long Description</FormLabel> <FormControl> <Textarea className="min-h-32" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="duration" render={({ field }) => ( <FormItem> <FormLabel>Course Duration</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Modules & Lessons</h3>
                         <Accordion type="multiple" defaultValue={moduleFields.map(m => m.id)} className="w-full space-y-4">
                            {moduleFields.map((module, moduleIndex) => (
                                <AccordionItem value={module.id} key={module.id}>
                                    <AccordionTrigger>
                                       <FormField control={form.control} name={`modules.${moduleIndex}.title`} render={({ field }) => ( <FormItem className="flex-grow pr-4"> <FormControl> <Input {...field} className="font-semibold text-lg" /> </FormControl> <FormMessage /> </FormItem> )}/>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <LessonFields form={form} moduleIndex={moduleIndex} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                         <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendModule({ id: `module-${Date.now()}`, title: `Module ${moduleFields.length + 1}`, lessons: [{ id: `lesson-${Date.now()}`, title: 'New Lesson', duration: '5 min', content: '', youtubeLinks: [] }] })}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Module
                        </Button>
                    </div>
                </div>
                </ScrollArea>
                 <DialogFooter className="pt-4 border-t">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Course Content
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LessonFields({ moduleIndex, form }: { moduleIndex: number, form: any}) {
    const { fields: lessonFields, remove: removeLesson, append: appendLesson } = useFieldArray({
        control: form.control,
        name: `modules.${moduleIndex}.lessons`
    });

    return (
        <div className="space-y-4 pl-6">
            {lessonFields.map((lesson, lessonIndex) => (
                <div key={lesson.id} className="p-4 border rounded-md space-y-3 bg-secondary/50 relative">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeLesson(lessonIndex)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => ( <FormItem> <FormLabel>Lesson Title</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.duration`} render={({ field }) => ( <FormItem> <FormLabel>Duration</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.content`} render={({ field }) => ( <FormItem> <FormLabel>Lesson Content</FormLabel> <FormControl> <Textarea {...field} className="min-h-[100px]" /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <YouTubeLinkFields moduleIndex={moduleIndex} lessonIndex={lessonIndex} form={form} />
                </div>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={() => appendLesson({ id: `lesson-${Date.now()}`, title: 'New Lesson', duration: '5 min', content: '', youtubeLinks: [] })}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Lesson
            </Button>
        </div>
    )
}

function YouTubeLinkFields({ moduleIndex, lessonIndex, form }: { moduleIndex: number, lessonIndex: number, form: any}) {
    const { fields: linkFields, remove: removeLink, append: appendLink } = useFieldArray({
        control: form.control,
        name: `modules.${moduleIndex}.lessons.${lessonIndex}.youtubeLinks`
    });

    return (
        <div className="space-y-2">
            <FormLabel>YouTube Video Links</FormLabel>
            {linkFields.map((link, linkIndex) => (
                <div key={link.id} className="flex items-end gap-2">
                     <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.youtubeLinks.${linkIndex}.title`} render={({ field }) => ( <FormItem className="flex-grow"> <FormControl> <Input placeholder="Video Title" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.youtubeLinks.${linkIndex}.url`} render={({ field }) => ( <FormItem className="flex-grow"> <FormControl> <Input placeholder="https://youtube.com/watch?v=..." {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeLink(linkIndex)}> <Trash2 className="h-4 w-4" /> </Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendLink({ title: '', url: ''})}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Video Link
            </Button>
        </div>
    )
}
