
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getFormById, createFormSubmission } from '@/lib/firebase-service';
import type { Form as FormType } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';

const buildSchema = (formDef: FormType | null) => {
    if (!formDef) return z.object({});
    const shape: Record<string, z.ZodSchema<any>> = {};
    formDef.questions.forEach(q => {
        switch(q.type) {
            case 'short-text':
            case 'long-text':
                shape[q.id] = z.string().min(1, 'This field is required.');
                break;
            case 'multiple-choice':
                shape[q.id] = z.string({ required_error: "Please select an option." });
                break;
            case 'rating':
                shape[q.id] = z.number().min(1, "Please select a rating.").max(5);
                break;
        }
    });
    return z.object(shape);
};

interface FormDialogProps {
  formId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FormDialog({ formId, isOpen, onClose }: FormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formDef, setFormDef] = useState<FormType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);

  const formSchema = buildSchema(formDef);
  type FormValues = z.infer<typeof formSchema>;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  useEffect(() => {
    if (formId && isOpen) {
      setLoading(true);
      setSubmissionComplete(false);
      getFormById(formId).then(data => {
        setFormDef(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [formId, isOpen]);

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
      toast({ title: 'Error', description: 'Failed to submit the form.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    form.reset();
    setFormDef(null);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{formDef?.title || 'Loading Form...'}</DialogTitle>
          {formDef?.description && <DialogDescription>{formDef.description}</DialogDescription>}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : submissionComplete ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4"/>
              <h3 className="text-xl font-semibold">Thank You!</h3>
              <p className="text-muted-foreground mt-2">Your response has been submitted successfully.</p>
          </div>
        ) : formDef ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
              {formDef.questions.map((q, index) => (
                <FormField
                  key={q.id}
                  control={form.control}
                  name={q.id}
                  render={({ field }) => (
                    <FormItem className="p-4 border rounded-md">
                      <FormLabel className="font-semibold">{index + 1}. {q.text}</FormLabel>
                      <FormControl className="mt-2">
                        <>
                          {q.type === 'short-text' && <Input {...field} />}
                          {q.type === 'long-text' && <Textarea className="min-h-24" {...field} />}
                          {q.type === 'multiple-choice' && (
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-1">
                              {q.options?.map((option, i) => (
                                <FormItem key={i} className="flex items-center space-x-3 space-y-0">
                                  <FormControl><RadioGroupItem value={option} /></FormControl>
                                  <FormLabel className="font-normal">{option}</FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          )}
                          {q.type === 'rating' && (
                            <div className="flex items-center gap-4 pt-2">
                              <Slider
                                defaultValue={[3]}
                                min={1} max={5} step={1}
                                onValueChange={(value) => field.onChange(value[0])}
                              />
                              <span className="font-bold w-12 text-center text-lg text-primary">{field.value || '-'}</span>
                            </div>
                          )}
                        </>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </form>
          </Form>
        ) : (
             <p className="text-center text-destructive py-10">Could not load form.</p>
        )}
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {submissionComplete ? 'Close' : 'Cancel'}
          </Button>
          {!submissionComplete && formDef && (
            <Button type="submit" form="form-dialog" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
