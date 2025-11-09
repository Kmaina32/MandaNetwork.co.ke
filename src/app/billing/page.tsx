
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import type { Course, UserCourse } from '@/lib/types';
import { getUserCourses, getAllCourses } from '@/lib/firebase-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { LoadingAnimation } from '@/components/LoadingAnimation';

type PurchaseHistoryItem = UserCourse & Partial<Course>;

export default function PurchaseHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<PurchaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const [userCourses, allCourses] = await Promise.all([
                getUserCourses(user.uid),
                getAllCourses()
            ]);

            const courseMap = new Map(allCourses.map(c => [c.id, c]));

            const purchaseHistory = userCourses.map(uc => ({
                ...uc,
                ...courseMap.get(uc.courseId)
            })).filter(c => c.title);

            setHistory(purchaseHistory.sort((a,b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime()));

        } catch (error) {
            console.error("Failed to fetch purchase history:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchHistory();
  }, [user, authLoading, router]);
  
  if (authLoading || loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <LoadingAnimation />
        </div>
    );
  }

  return (
     <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                            <CreditCard className="h-8 w-8 text-secondary-foreground" />
                        </div>
                        <CardTitle className="mt-4 text-2xl font-headline">Purchase History</CardTitle>
                        <CardDescription>A record of your course enrollments and payments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.length > 0 ? history.map((item) => (
                            <TableRow key={item.courseId}>
                              <TableCell className="font-medium">{item.title}</TableCell>
                              <TableCell>{format(new Date(item.enrollmentDate), 'PPP')}</TableCell>
                              <TableCell className="text-right">
                                {item.price !== undefined ? (
                                    item.price > 0 ? `Ksh ${item.price.toLocaleString()}` : <Badge variant="secondary">Free</Badge>
                                ) : (
                                    'N/A'
                                )}
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                                    You have not purchased any courses yet.
                                </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                </Card>
            </div>
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
