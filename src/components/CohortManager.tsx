
'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RegisteredUser, saveUser } from '@/lib/firebase-service';

const cohortFormSchema = z.object({
  cohort: z.string().min(1, 'Cohort name is required.'),
});

interface CohortManagerProps {
  user: RegisteredUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CohortManager({ user, isOpen, onClose, onSuccess }: CohortManagerProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof cohortFormSchema>>({
    resolver: zodResolver(cohortFormSchema),
    defaultValues: {
      cohort: user.cohort || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof cohortFormSchema>) => {
    setIsLoading(true);
    try {
      await saveUser(user.uid, { cohort: values.cohort });
      toast({
        title: 'Success!',
        description: `${user.displayName}'s cohort has been updated.`,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update cohort:', error);
      toast({
        title: 'Error',
        description: 'Failed to update cohort. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Cohort</DialogTitle>
          <DialogDescription>
            Assign or update the cohort for {user.displayName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="cohort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cohort Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sept-2024-FT" {...field} />
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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
