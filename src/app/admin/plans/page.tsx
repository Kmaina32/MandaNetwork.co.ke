

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PricingPlan } from "@/lib/types";
import { getAllPlans, deletePlan } from '@/lib/firebase-service';
import { FilePlus2, Pencil, Trash2, Loader2, Tag, CheckCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const fetched = await getAllPlans();
      setPlans(fetched);
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch pricing plans.", variant: "destructive" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleDelete = async (plan: PricingPlan) => {
    try {
      await deletePlan(plan.id);
      toast({ title: "Success", description: `Plan "${plan.name}" has been deleted.` });
      fetchPlans();
    } catch (error) {
      console.error("Failed to delete plan:", error);
      toast({ title: "Error", description: "Failed to delete plan.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Tag className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold font-headline">Pricing Plans</h1>
                <p className="text-muted-foreground">Manage B2B subscription tiers.</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/admin/plans/create">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Create Plan
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Plans</CardTitle>
              <CardDescription>Manage your organization pricing plans.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.length > 0 ? (
                      plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{plan.name}</span>
                              {plan.isPrimary && <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1"/>Recommended</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>Ksh {plan.price.toLocaleString()} / month (recurring card subscription)</TableCell>
                          <TableCell>{plan.features.join(', ')}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="icon" className="mr-2">
                              <Link href={`/admin/plans/edit/${plan.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the plan "{plan.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(plan)}>
                                      Yes, delete it
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          No pricing plans found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
