
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Handshake, Link as LinkIcon, Users, DollarSign, Copy } from 'lucide-react';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { getReferralsByAffiliate, getUserById } from '@/lib/firebase-service';
import type { Referral, RegisteredUser } from '@/lib/types';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';

export default function AffiliateDashboardPage() {
    const { user, dbUser: initialDbUser, loading: authLoading } from useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [dbUser, setDbUser] = useState<RegisteredUser | null>(initialDbUser);

    const affiliateLink = user && dbUser?.affiliateId ? `${window.location.origin}/signup?ref=${dbUser.affiliateId}` : '';

    useEffect(() => {
        if (authLoading) {
            return;
        }
        if (!user) {
            router.push('/login?redirect=/dashboard/affiliate');
            return;
        }

        // Set up a real-time listener for the user's profile data
        const userRef = ref(db, `users/${user.uid}`);
        const unsubscribeUser = onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const profile = snapshot.val();
                const fullUserProfile = { uid: user.uid, ...profile };
                setDbUser(fullUserProfile);

                if (profile.affiliateId) {
                    getReferralsByAffiliate(profile.affiliateId).then(data => {
                        setReferrals(data);
                    }).finally(() => {
                        setLoading(false);
                    });
                } else {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });

        // Clean up the listener when the component unmounts or user changes
        return () => {
            unsubscribeUser();
        };
    }, [user, authLoading, router]);

    const copyToClipboard = () => {
        if (!affiliateLink) return;
        navigator.clipboard.writeText(affiliateLink);
        toast({ title: "Link Copied!", description: "Your affiliate link has been copied." });
    };

    const totalEarnings = dbUser?.affiliateStats?.earnings || 0;
    const totalClicks = dbUser?.affiliateStats?.clicks || 0;
    const totalReferrals = dbUser?.affiliateStats?.referrals || 0;


    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center"><LoadingAnimation /></div>;
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Header />
                <div className="flex flex-col min-h-screen">
                    <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
                        <div className="max-w-4xl mx-auto">
                            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Dashboard
                            </Link>
                            <Card className="mb-8">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-2xl font-headline">
                                        <Handshake className="h-7 w-7" />
                                        Affiliate Dashboard
                                    </CardTitle>
                                    <CardDescription>
                                        Track your referrals and earnings. Share your unique link to get started!
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Label htmlFor="affiliate-link" className="font-semibold">Your Unique Referral Link</Label>
                                    <div className="flex gap-2 mt-2">
                                        <Input id="affiliate-link" value={affiliateLink} readOnly />
                                        <Button onClick={copyToClipboard} variant="outline" size="icon" disabled={!affiliateLink}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{totalClicks}</div>
                                        <p className="text-xs text-muted-foreground">Total clicks on your link</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">Referred Sign-ups</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{totalReferrals}</div>
                                        <p className="text-xs text-muted-foreground">Users who signed up via your link</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">Ksh {totalEarnings.toLocaleString()}</div>
                                        <p className="text-xs text-muted-foreground">20% commission on first purchase</p>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle>Referral History</CardTitle>
                                    <CardDescription>A list of successful referrals and your commission.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {referrals.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Referred User</TableHead>
                                                    <TableHead>Purchase Amount</TableHead>
                                                    <TableHead>Your Commission</TableHead>
                                                    <TableHead>Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {referrals.map(ref => (
                                                    <TableRow key={ref.id}>
                                                        <TableCell>{ref.referredUserName}</TableCell>
                                                        <TableCell>
                                                            {ref.purchaseAmount > 0 ? `Ksh ${ref.purchaseAmount.toLocaleString()}` : <span className="text-muted-foreground">-</span>}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-primary">
                                                            {ref.commissionAmount > 0 ? `Ksh ${ref.commissionAmount.toLocaleString()}` : <span className="text-muted-foreground">-</span>}
                                                        </TableCell>
                                                        <TableCell>{format(new Date(ref.createdAt), 'PPP')}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                            <p>No referrals yet. Share your link to get started!</p>
                                        </div>
                                    )}
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
