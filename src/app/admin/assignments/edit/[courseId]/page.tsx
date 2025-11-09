
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getCourseById, updateCourse } from '@/lib/firebase-service';
import type { Course, ExamQuestion, Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, PlusCircle, Trash2, Sparkles, BookCopy } from 'lucide-react';
import Link from 'next/link';
import { generateExam, generateProject } from '@/app/actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { LoadingAnimation } from '@/components/LoadingAnimation';

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

const projectSchema = z.object({
    id: z.string().default(() => `proj-${Date.now()}`),
    title: z.string().min(5, "Project title is required"),
    description: z.string().min(20, "Project description is required"),
});

const courseAssignmentSchema = z.object({
  exam: z.array(examQuestionSchema).optional(),
  project: projectSchema.optional(),
});

export default function EditAssignmentPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('exam');

  const form = useForm<z.infer<typeof courseAssignmentSchema>>({
    resolver: zodResolver(courseAssignmentSchema),
    defaultValues: {
      exam: [],
      project: undefined,
    },
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "exam",
  });

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      const courseData = await getCourseById(params.courseId as string);
      if (!courseData) {
        notFound();
        return;
      }
      setCourse(courseData);
      form.reset({ exam: courseData.exam || [], project: courseData.project });
      setActiveTab(courseData.project ? 'project' : 'exam');
      setLoading(false);
    };
    fetchCourse();
  }, [params.courseId, form]);

  const onSubmit = async (data: z.infer<typeof courseAssignmentSchema>) => {
    setLoading(true);
    try {
        const dataToSave: Partial<Course> = activeTab === 'exam' 
            ? { exam: data.exam, project: undefined } 
            : { project: data.project, exam: [] };

      await updateCourse(course!.id, dataToSave);
      toast({ title: "Success", description: "Assignment has been updated." });
      router.push('/admin/assignments');
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update assignment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = (type: 'short-answer' | 'multiple-choice') => {
    if (type === 'short-answer') {
      append({
        id: `sa-${Date.now()}`,
        type: 'short-answer',
        question: '',
        referenceAnswer: '',
        maxPoints: 10,
      });
    } else {
      append({
        id: `mc-${Date.now()}`,
        type: 'multiple-choice',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        maxPoints: 10,
      });
    }
  };

  const handleGenerateExam = async () => {
    if (!course) return;
    setIsGenerating(true);
    toast({ title: 'Generating Exam...', description: 'The AI is creating new exam questions for you.' });
    try {
        const result = await generateExam({
            courseTitle: course.title,
            courseDescription: course.longDescription,
        });
        replace(result.exam);
        form.setValue('project', undefined);
        setActiveTab('exam');
        toast({ title: 'Exam Generated!', description: 'Review the new questions below and save.' });
    } catch(error) {
        console.error('Failed to generate exam', error);
        toast({ title: 'Error', description: 'Could not generate exam questions.', variant: 'destructive'});
    } finally {
        setIsGenerating(false);
    }
  }

  const handleGenerateProject = async () => {
      if (!course) return;
      setIsGenerating(true);
      toast({ title: 'Generating Project...', description: 'The AI is creating a new final project.'});
      try {
          const result = await generateProject({ courseTitle: course.title, courseDescription: course.longDescription });
          form.setValue('project', result.project);
          form.setValue('exam', []);
          setActiveTab('project');
          toast({ title: 'Project Generated!', description: 'Review the project details and save.' });
      } catch (error) {
          console.error('Failed to generate project', error);
          toast({ title: 'Error', description: 'Could not generate project.', variant: 'destructive'});
      } finally {
          setIsGenerating(false);
      }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><LoadingAnimation /></div>;
  }
  
  if (!course) notFound();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin/assignments" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Assignments
          </Link>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl font-headline flex items-center gap-2"><BookCopy/> Manage Assignment</CardTitle>
                            <CardDescription>Edit the final assignment for <strong>{course.title}</strong>.</CardDescription>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="outline" disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Generate with AI
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Generate Final Assignment?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will replace the current assignment with new content generated by AI. This action cannot be undone, but you can edit before saving.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleGenerateProject}>Generate Project</AlertDialogAction>
                                    <AlertDialogAction onClick={handleGenerateExam}>Generate Exam</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="exam">Exam</TabsTrigger>
                            <TabsTrigger value="project">Final Project</TabsTrigger>
                        </TabsList>
                        <TabsContent value="exam" className="space-y-6 pt-6">
                          {fields.map((field, index) => (
                            <Card key={field.id} className="p-4 relative bg-secondary/50">
                            <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-destructive hover:text-destructive"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            {field.type === 'short-answer' ? (
                                <div className="space-y-4">
                                <FormField control={form.control} name={`exam.${index}.question`} render={({ field }) => ( <FormItem><FormLabel>Short Answer Question</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`exam.${index}.referenceAnswer`} render={({ field }) => ( <FormItem><FormLabel>Reference Answer</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                <FormField control={form.control} name={`exam.${index}.question`} render={({ field }) => ( <FormItem><FormLabel>Multiple Choice Question</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`exam.${index}.correctAnswer`} render={({ field: radioField }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Options (select the correct one)</FormLabel>
                                        <FormControl>
                                        <RadioGroup onValueChange={(value) => radioField.onChange(parseInt(value, 10))} defaultValue={String(radioField.value)} className="flex flex-col space-y-1">
                                            {(field.options as string[]).map((_, optionIndex) => (
                                            <div key={optionIndex} className="flex items-center gap-2">
                                                    <RadioGroupItem value={String(optionIndex)} id={`${field.id}-${optionIndex}`} />
                                                    <FormField control={form.control} name={`exam.${index}.options.${optionIndex}`} render={({ field: optionField }) => ( <FormItem className="flex-grow"><FormControl><Input {...optionField} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            ))}
                                        </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                </div>
                            )}
                            </Card>
                        ))}

                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => addQuestion('short-answer')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Short Answer
                            </Button>
                            <Button type="button" variant="outline" onClick={() => addQuestion('multiple-choice')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Multiple Choice
                            </Button>
                        </div>
                        </TabsContent>
                        <TabsContent value="project" className="pt-6">
                            <div className="space-y-4 p-4 border rounded-lg bg-secondary/50">
                                <FormField control={form.control} name="project.title" render={({ field }) => (<FormItem><FormLabel>Project Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="project.description" render={({ field }) => (<FormItem><FormLabel>Project Description</FormLabel><FormControl><Textarea className="min-h-48" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </TabsContent>
                    </Tabs>
                    <Separator className="my-6"/>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Assignment
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
  );
}
