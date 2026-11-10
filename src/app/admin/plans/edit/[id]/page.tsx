

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Loader2, Tag, PlusCircle, Trash2 } from 'lucide-react';
import { getPlanById, updatePlan } from '@/lib/firebase-service';
import type { PricingPlan } from '@/lib/types';
import { Switch } from '@/components/ui/switch';

const planFormSchema = z.object({
  name: z.string().min(3, 'Plan name must be at least 3 characters'),
  price: z.coerce.number().min(0, 'Price must be a non-negative number.'),
  priceDetail: z.string().min(3, 'Price detail is required (e.g., per user/month)'),
  features: z.array(z.object({ value: z.string().min(1, 'Feature cannot be empty.') })).min(1, 'At least one feature is required.'),
  isPrimary: z.boolean().default(false),
});

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<z.infer<typeof planFormSchema>>({
    resolver: zodResolver(planFormSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "features",
  });

  useEffect(() => {
    const fetchPlan = async () => {
        if (!params.id) return;
        setIsFetching(true);
        try {
            const plan = await getPlanById(params.id);
            if (!plan) notFound();
            form.reset({ ...plan, priceDetail: 'per month', features: plan.features.map(value => ({ value })) });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load plan details.", variant: 'destructive'});
        } finally {
            setIsFetching(false);
        }
    }
    fetchPlan();
  }, [params.id, form, toast]);


  const onSubmit = async (values: z.infer<typeof planFormSchema>) => {
    setIsLoading(true);
    try {
      await updatePlan(params.id, { ...values, priceDetail: 'per month', features: values.features.map(feature => feature.value) });
      toast({
        title: 'Plan Updated!',
        description: `The plan "${values.name}" has been successfully updated.`,
      });
      router.push('/admin/plans');
    } catch (error) {
      console.error('Failed to update plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to update the plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Link href="/admin/plans" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Pricing Plans
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <Tag />
                Edit Pricing Plan
              </CardTitle>
              <CardDescription>
                Modify the details for this subscription tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
             {isFetching ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
             ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Basic, Pro, Enterprise" {...field} />
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
                            <Input type="number" placeholder="e.g., 70000" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                      <FormField
                        control={form.control}
                        name="priceDetail"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Billing Interval</FormLabel>
                            <FormControl>
                            <Input placeholder="per month" readOnly {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>

                  <div>
                      <FormLabel>Features</FormLabel>
                      <div className="space-y-2 mt-2">
                         {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                 <FormField
                                    control={form.control}
                                    name={`features.${index}.value`}
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <FormControl>
                                                <Input {...field}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>
                         ))}
                      </div>
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ value: '' })}>
                         <PlusCircle className="mr-2 h-4 w-4"/>
                         Add Feature
                      </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="isPrimary"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Recommended Plan</FormLabel>
                          <p className="text-sm text-muted-foreground">
                           Highlight this plan as the recommended choice for new customers.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.push('/admin/plans')}>
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
