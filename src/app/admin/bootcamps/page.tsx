

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Bootcamp } from "@/lib/types";
import { getAllBootcamps, deleteBootcamp, createPermissionRequest } from '@/lib/firebase-service';
import { FilePlus2, Pencil, Trash2, Loader2, Library, Rocket, Users, GitBranch } from "lucide-react";
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
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function AdminBootcampsPage() {
  const { user, isSuperAdmin } = useAuth();
  const [bootcamps, setBootcamps] = useState<Bootcamp[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBootcamps = async () => {
    try {
      setLoading(true);
      const fetched = await getAllBootcamps();
      setBootcamps(fetched.reverse());
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch bootcamps.", variant: "destructive" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootcamps();
  }, []);

  const handleDelete = async (bootcamp: Bootcamp) => {
    if (!user) return;
    
    if (isSuperAdmin) {
        try {
        await deleteBootcamp(bootcamp.id);
        toast({ title: "Success", description: `Bootcamp "${bootcamp.title}" has been deleted.` });
        fetchBootcamps();
        } catch (error) {
        console.error("Failed to delete bootcamp:", error);
        toast({ title: "Error", description: "Failed to delete bootcamp.", variant: "destructive" });
        }
    } else {
       try {
            await createPermissionRequest({
                requesterId: user.uid,
                requesterName: user.displayName || 'Unknown Admin',
                action: 'delete_bootcamp',
                itemId: bootcamp.id,
                itemName: bootcamp.title,
            });
            toast({ title: "Request Sent", description: "Your request to delete this bootcamp has been sent for approval."});
        } catch (error) {
             console.error("Failed to create permission request:", error);
            toast({ title: "Error", description: "Could not send deletion request.", variant: "destructive" });
        }
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
              <Rocket className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold font-headline">Bootcamps</h1>
                <p className="text-muted-foreground">Manage intensive, time-based learning programs.</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/admin/bootcamps/create">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Create Bootcamp
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Bootcamps</CardTitle>
              <CardDescription>Manage your bootcamps.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <LoadingAnimation />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bootcamps.length > 0 ? (
                      bootcamps.map((bootcamp) => (
                        <TableRow key={bootcamp.id}>
                          <TableCell className="font-medium">{bootcamp.title}</TableCell>
                          <TableCell>{bootcamp.participants ? Object.keys(bootcamp.participants).length : 0}</TableCell>
                          <TableCell>Ksh {bootcamp.price.toLocaleString()}</TableCell>
                          <TableCell>{bootcamp.duration}</TableCell>
                          <TableCell className="text-right">
                             <Button asChild variant="ghost" size="icon" className="mr-2">
                                <Link href={isSuperAdmin ? `/admin/bootcamps/edit/${bootcamp.id}` : `/bootcamps/${bootcamp.id}`}>
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
                                    {isSuperAdmin
                                      ? `This action cannot be undone. This will permanently delete the bootcamp "${bootcamp.title}".`
                                      : `You are requesting to delete the bootcamp "${bootcamp.title}". This will send a request to a super admin for approval.`
                                    }
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(bootcamp)}>
                                      {isSuperAdmin ? 'Yes, delete it' : 'Yes, send request'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          No bootcamps found.
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
