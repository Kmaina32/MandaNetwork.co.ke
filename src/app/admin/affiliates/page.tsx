
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllUsers, RegisteredUser } from '@/lib/firebase-service';
import { ArrowLeft, Loader2, Handshake, Users, Link as LinkIcon, DollarSign } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

type AffiliateStats = RegisteredUser & {
    clicks: number;
    referrals: number;
    earnings: number;
};

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

export default function AdminAffiliatesPage() {
    const [affiliates, setAffiliates] = useState<AffiliateStats[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAffiliates = async () => {
            setLoading(true);
            try {
                const users = await getAllUsers();
                // Mocking stats for now. In a real app, this would come from a separate DB collection.
                const affiliateData = users
                    .filter(u => u.affiliateId)
                    .map(user => ({
                        ...user,
                        clicks: Math.floor(Math.random() * 500),
                        referrals: Math.floor(Math.random() * 50),
                        earnings: Math.floor(Math.random() * 25000),
                    }));
                setAffiliates(affiliateData);
            } catch (err) {
                toast({ title: "Error", description: "Failed to fetch affiliate data.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchAffiliates();
    }, [toast]);

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
                <div className="max-w-6xl mx-auto">
                    <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Admin Dashboard
                    </Link>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <Handshake className="h-8 w-8" />
                            <div>
                                <h1 className="text-3xl font-bold font-headline">Affiliate Program</h1>
                                <p className="text-muted-foreground">Monitor and manage your affiliate partners.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3 mb-8">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{affiliates.length}</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{affiliates.reduce((sum, a) => sum + a.clicks, 0).toLocaleString()}</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Earnings Paid</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Ksh {affiliates.reduce((sum, a) => sum + a.earnings, 0).toLocaleString()}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>All Affiliates</CardTitle>
                            <CardDescription>A list of all users in the affiliate program.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-10"><LoadingAnimation /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Affiliate</TableHead>
                                            <TableHead>Clicks</TableHead>
                                            <TableHead>Sign-ups</TableHead>
                                            <TableHead>Earnings (Ksh)</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {affiliates.map(affiliate => (
                                            <TableRow key={affiliate.uid}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={affiliate.photoURL || ''} />
                                                            <AvatarFallback>{getInitials(affiliate.displayName)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{affiliate.displayName}</p>
                                                            <p className="text-xs text-muted-foreground">{affiliate.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{affiliate.clicks.toLocaleString()}</TableCell>
                                                <TableCell>{affiliate.referrals.toLocaleString()}</TableCell>
                                                <TableCell className="font-medium">Ksh {affiliate.earnings.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm">Manage Payout</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
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
