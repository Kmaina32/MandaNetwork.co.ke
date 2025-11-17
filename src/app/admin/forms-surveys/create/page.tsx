
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Loader2, PlusCircle, Trash2, FilePen, GripVertical } from 'lucide-react';
// import { createForm } from '@/lib/firebase-service';
import { FormQuestion } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Question text cannot be empty."),
  type: z.enum(['short-text', 'long-text', 'multiple-choice', 'rating']),
  options: z.array(z.string()).optional(),
});

const formBuilderSchema = z.object({
  title: z.string().min(3, 'Form title is required.'),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, "You must add at least one question."),
});

type FormBuilderValues = z.infer<typeof formBuilderSchema>;

function QuestionCard({ index, remove }: { index: number, remove: (index: number) => void }) {
    const { control } = useFormContext<FormBuilderValues>();
    const questionType = control.getValues(`questions.${index}.type`);

    return (
        <Card className="p-4 bg-secondary/50 relative">
             <div className="absolute top-2 right-2 flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 cursor-grab"><GripVertical className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name={`questions.${index}.text`} render={({ field }) => (
                    <FormItem><FormLabel>Question Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name={`questions.${index}.type`} render={({ field }) => (
                    <FormItem><FormLabel>Question Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="short-text">Short Text</SelectItem>
                                <SelectItem value="long-text">Long Text (Paragraph)</SelectItem>
                                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                <SelectItem value="rating">Rating (1-5)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>
            {questionType === 'multiple-choice' && (
                <div className="mt-4 pl-2 space-y-2">
                    <FormLabel>Options</FormLabel>
                    <p className="text-xs text-muted-foreground">Enter one option per line.</p>
                     <FormField control={control} name={`questions.${index}.options`} render={({ field }) => (
                        <FormItem><FormControl>
                            <Textarea
                                className="min-h-[100px]"
                                onChange={(e) => field.onChange(e.target.value.split('\n'))}
                                value={field.value?.join('\n') || ''}
                            />
                        </FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            )}
        </Card>
    );
}

export default function CreateFormPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormBuilderValues>({
    resolver: zodResolver(formBuilderSchema),
    defaultValues: {
      title: '',
      description: '',
      questions: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const addQuestion = (type: FormQuestion['type']) => {
    append({
        id: uuidv4(),
        text: '',
        type: type,
        ...(type === 'multiple-choice' && { options: [] }),
    });
  }

  const onSubmit = async (values: FormBuilderValues) => {
    setIsLoading(true);
    try {
      // await createForm(values);
      console.log("Form values to save:", values);
      toast({
        title: 'Form Created!',
        description: `The form "${values.title}" has been saved.`,
      });
      router.push('/admin/forms-surveys');
    } catch (error) {
      console.error('Failed to create form:', error);
      toast({
        title: 'Error',
        description: 'Failed to create the form. Please try again.',
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
          <Link href="/admin/forms-surveys" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Forms & Surveys
          </Link>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2"><FilePen /> Create New Form</CardTitle>
                        <CardDescription>Build a new form to collect information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Form Title</FormLabel><FormControl><Input placeholder="e.g., Course Feedback Survey" {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Instructions or context for the form." {...field} /></FormControl><FormMessage /></FormItem>
                         )}/>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Questions</CardTitle>
                        <CardDescription>Add and arrange the questions for your form.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <QuestionCard key={field.id} index={index} remove={remove} />
                        ))}

                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('short-text')}><PlusCircle className="mr-2 h-4 w-4"/>Short Text</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('long-text')}><PlusCircle className="mr-2 h-4 w-4"/>Paragraph</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('multiple-choice')}><PlusCircle className="mr-2 h-4 w-4"/>Multiple Choice</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('rating')}><PlusCircle className="mr-2 h-4 w-4"/>Rating Scale</Button>
                        </div>
                         {form.formState.errors.questions && (
                             <p className="text-sm font-medium text-destructive">{form.formState.errors.questions.message}</p>
                         )}
                    </CardContent>
                </Card>
                
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.push('/admin/forms-surveys')}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Form</Button>
                </div>
            </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
