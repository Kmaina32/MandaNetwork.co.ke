
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { PaymentModal } from '@/components/PaymentModal';
import { useToast } from '@/hooks/use-toast';
import type { PricingPlan } from '@/lib/types';
import { getAllPlans, updateOrganization } from '@/lib/firebase-service';
import PaymentIcons from '@/components/PaymentIcons';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function OrganizationBillingPage() {
    const { organization, loading: authLoading, fetchUserData, user } = useAuth();
    const { toast } = useToast();
    const [paymentModalState, setPaymentModalState] = useState<{isOpen: boolean, plan: PricingPlan | null}>({ isOpen: false, plan: null });
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            setLoadingPlans(true);
            try {
                const fetchedPlans = await getAllPlans();
                setPlans(fetchedPlans);
            } catch (error) {
                console.error("Failed to fetch pricing plans:", error);
                toast({ title: 'Error', description: 'Could not load pricing information.', variant: 'destructive'});
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, [toast]);
    
    const handlePaymentSuccess = async () => {
        if (!organization || !paymentModalState.plan || !user) return;
        try {
            await updateOrganization(organization.id, {
                subscriptionTier: paymentModalState.plan.name.toLowerCase() as 'trial' | 'basic' | 'pro',
                subscriptionExpiresAt: null, // Assuming permanent upgrade for now
            });
            await fetchUserData(user); // Re-fetch org data to update UI
            toast({ title: 'Upgrade Successful!', description: `Your organization is now on the ${paymentModalState.plan.name} plan.`});
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update your subscription status.', variant: 'destructive'});
        } finally {
            setPaymentModalState({ isOpen: false, plan: null });
        }
    }

    const handleUpgradeClick = (plan: PricingPlan) => {
        setPaymentModalState({ isOpen: true, plan: plan });
    };

    if (authLoading || loadingPlans) {
        return <div className="flex justify-center items-center h-full"><LoadingAnimation /></div>
    }

    return (
        <div className="space-y-8">
            <Card>
                 <CardHeader>
                    <CardTitle>Plans & Pricing</CardTitle>
                    <CardDescription>Choose the plan that's right for your team.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map(tier => (
                            <Card key={tier.name} className={`flex flex-col ${tier.isPrimary ? 'border-primary ring-2 ring-primary' : ''}`}>
                                <CardHeader>
                                    <CardTitle>{tier.name}</CardTitle>
                                    <p className="text-3xl font-bold">Ksh {tier.price.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">{tier.priceDetail}</p>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <ul className="space-y-2 text-sm">
                                        {tier.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardContent>
                                    {organization?.subscriptionTier === tier.name.toLowerCase() ? (
                                        <Button className="w-full" disabled>Your Current Plan</Button>
                                    ) : (
                                        <div className="space-y-2">
                                            <Button className="w-full" onClick={() => handleUpgradeClick(tier)}>
                                                Upgrade to {tier.name}
                                            </Button>
                                            <Button className="w-full" variant="outline" onClick={() => window.location.href='mailto:support@manda.network'}>
                                                <Mail className="mr-2 h-4 w-4" />
                                                Contact Sales
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Accepted Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                    <PaymentIcons />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View and download your past invoices.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                    No invoice history found.
                                </TableCell>
                           </TableRow>
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>
            {paymentModalState.plan && (
                <PaymentModal
                    isOpen={paymentModalState.isOpen}
                    onClose={() => setPaymentModalState({ isOpen: false, plan: null })}
                    itemId={`org-upgrade-${paymentModalState.plan.id}`}
                    itemName={`Upgrade to ${paymentModalState.plan.name} Plan`}
                    price={paymentModalState.plan.price}
                    purchaseType="organization_plan"
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
