

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Coins } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { getAllUsers, getAllCourses } from '@/lib/firebase-service';
import type { RegisteredUser, Course, UserCourse } from '@/lib/types';
import { format, isValid } from 'date-fns';
import PaymentIcons from '@/components/PaymentIcons';
import { Icon } from '@iconify/react';

type Transaction = {
  id: string;
  userName: string;
  userEmail: string;
  courseTitle: string;
  amount: number;
  status: 'Success';
  date: string;
  paymentMethod: UserCourse['paymentMethod'];
}

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const [users, courses] = await Promise.all([
          getAllUsers(),
          getAllCourses()
        ]);

        const courseMap = new Map(courses.map(c => [c.id, c]));
        const allTransactions: Transaction[] = [];

        users.forEach(user => {
          if (user.purchasedCourses) {
            Object.entries(user.purchasedCourses).forEach(([courseId, purchaseDetails]) => {
              const course = courseMap.get(courseId);
              if (course) {
                allTransactions.push({
                  id: `${user.uid}-${courseId}`,
                  userName: user.displayName || 'N/A',
                  userEmail: user.email || 'N/A',
                  courseTitle: course.title,
                  amount: course.price,
                  status: 'Success', // Assuming all recorded purchases are successful
                  date: purchaseDetails.enrollmentDate,
                  paymentMethod: purchaseDetails.paymentMethod
                });
              }
            });
          }
        });

        setTransactions(allTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const getPaymentIcon = (method?: UserCourse['paymentMethod']) => {
    switch (method) {
        case 'mpesa':
            return <Icon icon="simple-icons:mpesa" className="h-5 w-5 text-green-600" />;
        case 'card':
            return <CreditCard className="h-5 w-5 text-blue-500" />;
        case 'paypal':
            return <Icon icon="logos:paypal" className="h-5 w-5" />;
        case 'crypto':
            return <Coins className="h-5 w-5 text-yellow-500" />;
        default:
            return null;
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
            
            <div className="flex items-center gap-4 mb-8">
                <CreditCard className="h-8 w-8" />
                <div>
                    <h1 className="text-3xl font-bold font-headline">Manage Payments</h1>
                    <p className="text-muted-foreground">View transaction history for all course enrollments.</p>
                </div>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Accepted Payment Methods</CardTitle>
                    <CardDescription>To configure these, update your environment variables or smart contract settings.</CardDescription>
                </CardHeader>
                 <CardContent>
                   <PaymentIcons />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
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
                            <TableHead>User</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.length > 0 ? transactions.map((transaction) => {
                             const transactionDate = new Date(transaction.date);
                             return (
                                <TableRow key={transaction.id}>
                                <TableCell>
                                    <div className="font-medium">{transaction.userName}</div>
                                    <div className="text-sm text-muted-foreground">{transaction.userEmail}</div>
                                </TableCell>
                                <TableCell>{transaction.courseTitle}</TableCell>
                                <TableCell>Ksh {transaction.amount.toLocaleString()}</TableCell>
                                <TableCell>{isValid(transactionDate) ? format(transactionDate, 'PPP') : 'N/A'}</TableCell>
                                <TableCell>
                                     <div className="flex items-center gap-2 capitalize">
                                        {getPaymentIcon(transaction.paymentMethod)}
                                        <span>{transaction.paymentMethod}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={transaction.status === 'Success' ? 'default' : 'destructive'}>
                                        {transaction.status}
                                    </Badge>
                                </TableCell>
                                </TableRow>
                            )
                          }) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                                    No transactions found.
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
