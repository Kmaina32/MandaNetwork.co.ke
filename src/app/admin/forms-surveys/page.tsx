

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PlusCircle, FilePen, Eye, Edit, Trash2, Share2 } from 'lucide-react';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { getAllForms, getFormSubmissions, deleteForm } from '@/lib/firebase-service';
import type { Form as FormType } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface FormWithSubmissions extends FormType {
    submissionCount: number;
}

export default function AdminFormsPage() {
  const [forms, setForms] = useState<FormWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchForms = async () => {
    try {
      const fetchedForms = await getAllForms();
      const formsWithCounts = await Promise.all(fetchedForms.map(async (form) => {
          const submissions = await getFormSubmissions(form.id);
          return { ...form, submissionCount: submissions.length };
      }));
      setForms(formsWithCounts);
    } catch (error) {
      console.error("Failed to fetch forms:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleDelete = async (formId: string) => {
      try {
          await deleteForm(formId);
          toast({ title: "Form Deleted", description: "The form and its submissions have been deleted." });
          fetchForms(); // Refresh the list
      } catch (error) {
          console.error("Failed to delete form:", error);
          toast({ title: "Error", description: "Could not delete the form.", variant: "destructive" });
      }
  }
  
  const handleShare = (formId: string) => {
    const url = `${window.location.origin}/forms/${formId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied!", description: "The public link to the form has been copied." });
  }

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
              <FilePen className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold font-headline">Forms & Surveys</h1>
                <p className="text-muted-foreground">Create and manage forms for feedback and data collection.</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/admin/forms-surveys/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Form
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Forms</CardTitle>
              <CardDescription>A list of all created forms and surveys.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-10"><LoadingAnimation /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forms.length > 0 ? (
                      forms.map((form) => (
                        <TableRow key={form.id}>
                          <TableCell className="font-medium">{form.title}</TableCell>
                          <TableCell>{form.questions?.length || 0}</TableCell>
                          <TableCell>{form.submissionCount}</TableCell>
                          <TableCell className="text-right">
                             <Button asChild variant="outline" size="sm" className="mr-2">
                                <Link href={`/admin/forms-surveys/submissions/${form.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Submissions
                                </Link>
                            </Button>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleShare(form.id)}>
                                        <Share2 className="mr-2 h-4 w-4"/> Share
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={`/admin/forms-surveys/edit/${form.id}`}><Edit className="mr-2 h-4 w-4"/> Edit</Link>
                                    </DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                             </DropdownMenu>
                             <AlertDialog>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete the form "{form.title}" and all its submissions.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(form.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          No forms created yet.
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
