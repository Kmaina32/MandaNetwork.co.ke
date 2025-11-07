

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Hackathon, RegisteredUser } from "@/lib/mock-data";
import { getAllHackathons, deleteHackathon, getHackathonParticipants } from '@/lib/firebase-service';
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

export default function AdminHackathonsPage() {
  const { user, isSuperAdmin } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [participantsMap, setParticipantsMap] = useState<Record<string, RegisteredUser[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHackathons = async () => {
    try {
      setLoading(true);
      const fetched = await getAllHackathons();
      setHackathons(fetched.reverse());
      
      const participantsData: Record<string, RegisteredUser[]> = {};
      for (const hackathon of fetched) {
        const participants = await getHackathonParticipants(hackathon.id);
        participantsData[hackathon.id] = participants;
      }
      setParticipantsMap(participantsData);

    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch hackathons.", variant: "destructive" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHackathons();
  }, []);

  const handleDelete = async (hackathon: Hackathon) => {
    if (!user) return;
    
    if (isSuperAdmin) {
        try {
            await deleteHackathon(hackathon.id);
            toast({ title: "Success", description: `Hackathon "${hackathon.title}" has been deleted.` });
            fetchHackathons();
        } catch (error) {
            console.error("Failed to delete hackathon:", error);
            toast({ title: "Error", description: "Failed to delete hackathon.", variant: "destructive" });
        }
    } else {
        toast({ title: "Action Not Permitted", description: "Only a super admin can delete a hackathon." });
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
                <h1 className="text-3xl font-bold font-headline">Hackathons</h1>
                <p className="text-muted-foreground">Manage competitive coding events.</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/admin/hackathons/create">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Create Hackathon
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Hackathons</CardTitle>
              <CardDescription>Manage your hackathon events.</CardDescription>
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
                      <TableHead>Dates</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Prize</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hackathons.length > 0 ? (
                      hackathons.map((hackathon) => (
                        <TableRow key={hackathon.id}>
                          <TableCell className="font-medium">{hackathon.title}</TableCell>
                          <TableCell>{format(new Date(hackathon.startDate), 'PPP')} - {format(new Date(hackathon.endDate), 'PPP')}</TableCell>
                           <TableCell>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    {participantsMap[hackathon.id]?.length || 0}
                                </div>
                            </TableCell>
                          <TableCell>Ksh {hackathon.prizeMoney.toLocaleString()}</TableCell>
                          <TableCell className="text-right space-x-1">
                             <Button asChild variant="ghost" size="icon">
                              <Link href={`/admin/hackathons/${hackathon.id}/submissions`}>
                                <GitBranch className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" size="icon">
                              <Link href={`/admin/hackathons/edit/${hackathon.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!isSuperAdmin}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the hackathon "{hackathon.title}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(hackathon)}>
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
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          No hackathons found.
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
