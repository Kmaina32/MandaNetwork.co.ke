
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/shared/Footer";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPermissionRequests, updatePermissionRequestStatus, deleteCourse, deleteProgram, deleteBundle, deleteBootcamp, createBootcamp } from '@/lib/firebase-service';
import type { PermissionRequest } from '@/lib/types';
import { ArrowLeft, Loader2, CheckCircle, XCircle, ShieldCheck, Clock, Check, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function AdminApprovalsPage() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const fetchedRequests = await getPermissionRequests();
      setRequests(fetchedRequests);
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch permission requests.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
        toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
        router.push('/admin');
        return;
    }
    if (isSuperAdmin) {
        fetchRequests();
    }
  }, [isSuperAdmin, authLoading, router, toast]);

  const handleApprove = async (request: PermissionRequest) => {
    setIsProcessing(request.id);
    try {
        let actionCompleted = false;
        if (request.action === 'delete_course') {
            await deleteCourse(request.itemId);
            actionCompleted = true;
        } else if (request.action === 'delete_program') {
            await deleteProgram(request.itemId);
            actionCompleted = true;
        } else if (request.action === 'delete_bundle') {
            await deleteBundle(request.itemId);
            actionCompleted = true;
        } else if (request.action === 'delete_bootcamp') {
            await deleteBootcamp(request.itemId);
        } else if (request.action === 'create_bootcamp') {
            await createBootcamp(request.itemData);
            actionCompleted = true;
        }

        if (actionCompleted) {
            await updatePermissionRequestStatus(request.id, 'approved');
            toast({ title: "Approved & Actioned", description: `Request for "${request.itemName}" has been completed.` });
            fetchRequests();
        } else {
             throw new Error("Unknown action type");
        }
    } catch (error) {
        console.error("Failed to approve request:", error);
        toast({ title: "Error", description: "Could not process the approval.", variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  };

  const handleDeny = async (request: PermissionRequest) => {
    setIsProcessing(request.id);
    try {
        await updatePermissionRequestStatus(request.id, 'denied');
        toast({ title: "Request Denied", description: `The request has been marked as denied.` });
        fetchRequests();
    } catch (error) {
        console.error("Failed to deny request:", error);
        toast({ title: "Error", description: "Could not process the denial.", variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  const renderRequestTable = (reqs: PermissionRequest[]) => {
      return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested By</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reqs.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.requesterName}</TableCell>
                  <TableCell>
                      <Badge variant="secondary">{request.action.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell>{request.itemName}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</TableCell>
                  <TableCell>
                      <Badge variant={request.status === 'approved' ? 'default' : request.status === 'denied' ? 'destructive' : 'outline'}>
                         {request.status}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {request.status === 'pending' && (
                        <>
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleApprove(request)} disabled={isProcessing === request.id}>
                                {isProcessing === request.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                            </Button>
                             <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeny(request)} disabled={isProcessing === request.id}>
                               {isProcessing === request.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Ban className="h-4 w-4" />}
                            </Button>
                        </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {reqs.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        No requests found in this category.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      )
  }

  if (authLoading || !isSuperAdmin) {
    return <div className="flex justify-center items-center h-screen"><LoadingAnimation /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
             <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
               <ArrowLeft className="h-4 w-4" />
               Back to Admin Dashboard
            </Link>
            <Tabs defaultValue="pending">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6"/>Permission Requests</CardTitle>
                      <CardDescription>Approve or deny actions requested by other administrators.</CardDescription>
                      <TabsList className="grid w-full grid-cols-2 mt-4">
                        <TabsTrigger value="pending">
                            <Clock className="mr-2 h-4 w-4"/>
                            Pending ({pendingRequests.length})
                        </TabsTrigger>
                        <TabsTrigger value="resolved">
                            <CheckCircle className="mr-2 h-4 w-4"/>
                            Resolved ({resolvedRequests.length})
                        </TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="pending">
                       {loading ? <div className="flex justify-center py-10"><LoadingAnimation /></div> : renderRequestTable(pendingRequests) }
                    </TabsContent>
                    <TabsContent value="resolved">
                       {loading ? <div className="flex justify-center py-10"><LoadingAnimation /></div> : renderRequestTable(resolvedRequests) }
                    </TabsContent>
                  </CardContent>
              </Card>
            </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
