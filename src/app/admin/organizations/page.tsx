'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Building, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getAllOrganizations, deleteOrganization } from '@/lib/firebase-service';
import type { Organization } from '@/lib/types';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
        const fetchedOrgs = await getAllOrganizations();
        setOrganizations(fetchedOrgs);
    } catch (error) {
        toast({ title: "Error", description: "Could not load organizations.", variant: 'destructive'});
        console.error(error);
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleDelete = async (org: Organization) => {
    try {
        await deleteOrganization(org.id);
        toast({ title: "Success", description: `Organization "${org.name}" has been deleted.` });
        fetchOrganizations();
    } catch(error) {
        console.error(error);
        toast({ title: "Error", description: "Failed to delete the organization.", variant: 'destructive'});
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
             <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
               <ArrowLeft className="h-4 w-4" />
               Back to Admin Dashboard
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building /> Manage Organizations</CardTitle>
                    <CardDescription>View, approve, and manage all B2B partner organizations.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                       <div className="flex justify-center items-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          <p className="ml-2">Loading organizations...</p>
                       </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Organization Name</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Subscription</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {organizations.length > 0 ? organizations.map((org) => (
                            <TableRow key={org.id}>
                              <TableCell className="font-medium">{org.name}</TableCell>
                              <TableCell>{format(new Date(org.createdAt), 'PPP')}</TableCell>
                              <TableCell>
                                <Badge variant={org.subscriptionTier === 'free' ? 'secondary' : 'default'}>
                                    {org.subscriptionTier}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete Organization">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the organization "{org.name}" and all associated data.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(org)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                    No organizations have signed up yet.
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
