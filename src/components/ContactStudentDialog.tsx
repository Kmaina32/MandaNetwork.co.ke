
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RegisteredUser } from '@/lib/types';
import { sendContactMessage } from '@/app/actions';
import { useAuth } from '@/hooks/use-auth';
import { Input } from './ui/input';

const contactFormSchema = z.object({
  employerName: z.string().min(2, 'Please enter your name.'),
  organizationName: z.string().min(2, 'Please enter your company name.'),
  email: z.string().email(),
  phone: z.string().min(10, 'Please enter a valid phone number.'),
  message: z.string().min(20, 'Message must be at least 20 characters long.'),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactStudentDialogProps {
  student: RegisteredUser;
  isOpen: boolean;
  onClose: () => void;
}

export function ContactStudentDialog({ student, isOpen, onClose }: ContactStudentDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      employerName: '',
      organizationName: '',
      email: '',
      phone: '',
      message: '',
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setIsLoading(true);
    try {
      if (!user) throw new Error('Please sign in again.');
      await sendContactMessage({
        idToken: await user.getIdToken(),
        studentId: student.uid,
        employerName: values.employerName,
        email: values.email,
        phone: values.phone,
        message: values.message,
      });

      toast({
        title: 'Message Sent!',
        description: `Your message has been sent to ${student.displayName}.`,
      });
      onClose();
      form.reset();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact {student.displayName}</DialogTitle>
          <DialogDescription>
            Your message will be sent as a notification. Please provide your contact details so they can reply.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <FormField
                    control={form.control}
                    name="employerName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl><Input placeholder="Jomo Kenyatta" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Company Name</FormLabel>
                            <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Email</FormLabel>
                            <FormControl><Input type="email" placeholder="you@company.com" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Phone Number</FormLabel>
                            <FormControl><Input placeholder="07XX XXX XXX" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Hi ${student.displayName?.split(' ')[0] || ''}, I was impressed by your portfolio and would like to discuss an opportunity...`}
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
