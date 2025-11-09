
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, MoveRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { processMpesaPayment, processCardPayment, processPayPalPayment } from '@/app/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@iconify/react';
import type { UserCourse } from '@/lib/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  price: number;
  onPaymentSuccess: (paymentMethod: UserCourse['paymentMethod']) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  price,
  onPaymentSuccess,
}: PaymentModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMpesaPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ title: 'Not Logged In', description: 'You must be logged in to make a purchase.', variant: 'destructive' });
        router.push('/login');
        return;
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
        toast({ title: 'Invalid Phone Number', description: 'Please enter a valid 10-digit phone number.', variant: 'destructive' });
        return;
    }
    setIsLoading(true);
    try {
        const result = await processMpesaPayment({
            userId: user.uid,
            phoneNumber,
            amount: 1, // Using 1 KES for sandbox testing
            courseId: itemId,
        });

        if (result.success) {
            toast({
                title: "Processing Payment...",
                description: "Please check your phone to complete the M-Pesa transaction. Your purchase will be confirmed automatically."
            });
            onPaymentSuccess('mpesa');
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        console.error("Payment initiation failed:", error);
        toast({ title: 'Payment Failed', description: error.message || 'Something went wrong. Please try again.', variant: 'destructive'});
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleCardPay = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setIsLoading(true);
      try {
          const result = await processCardPayment({ itemId, itemName, amount: price });
          if (result.success) {
              toast({ title: 'Payment Successful!', description: 'Your payment has been processed.' });
              onPaymentSuccess('card');
          } else {
              throw new Error(result.message);
          }
      } catch (error: any) {
          toast({ title: 'Card Payment Failed', description: error.message, variant: 'destructive'});
      } finally {
          setIsLoading(false);
      }
  }

  const handlePayPalPay = async () => {
       if (!user) return;
      setIsLoading(true);
       try {
          const result = await processPayPalPayment({ itemId, itemName, amount: price });
          if (result.success && result.approvalUrl) {
              toast({ title: 'Redirecting to PayPal...', description: 'Please complete your payment on the PayPal website.' });
              // In a real app, you would redirect to the approval URL.
              // For this simulation, we'll just call the success handler.
              // window.location.href = result.approvalUrl;
              onPaymentSuccess('paypal');
          } else {
              throw new Error(result.message);
          }
      } catch (error: any) {
          toast({ title: 'PayPal Error', description: error.message, variant: 'destructive'});
      } finally {
          setIsLoading(false);
      }
  }
  
  const handleClose = () => {
      setPhoneNumber('');
      setIsLoading(false);
      onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            You are purchasing "{itemName}" for Ksh {price.toLocaleString()}.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="mpesa" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
                <TabsTrigger value="card">Card</TabsTrigger>
                <TabsTrigger value="paypal">PayPal</TabsTrigger>
            </TabsList>
            <TabsContent value="mpesa">
                <form onSubmit={handleMpesaPay}>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">M-Pesa Phone Number</Label>
                            <Input
                            id="phone"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="0712345678"
                            required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Pay Ksh ${price.toLocaleString()} via M-Pesa`}
                        </Button>
                    </DialogFooter>
                </form>
            </TabsContent>
            <TabsContent value="card">
                 <form onSubmit={handleCardPay}>
                    <div className="flex justify-center items-center gap-4 my-4">
                        <Icon icon="logos:stripe" className="h-6" />
                        <Icon icon="logos:visa" className="h-6" />
                        <Icon icon="logos:mastercard" className="h-6" />
                    </div>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="card-number">Card Number</Label>
                            <Input id="card-number" placeholder="•••• •••• •••• ••••" required />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="expiry">Expiry Date</Label>
                                <Input id="expiry" placeholder="MM / YY" required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="cvc">CVC</Label>
                                <Input id="cvc" placeholder="•••" required />
                            </div>
                        </div>
                    </div>
                     <DialogFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                           {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Pay Ksh ${price.toLocaleString()}`}
                        </Button>
                    </DialogFooter>
                 </form>
            </TabsContent>
             <TabsContent value="paypal">
                <div className="py-10 text-center">
                    <p className="text-muted-foreground mb-4">You will be redirected to PayPal to complete your payment securely.</p>
                     <Button onClick={handlePayPalPay} className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Continue with PayPal'}
                        <MoveRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </TabsContent>
        </Tabs>
        
      </DialogContent>
    </Dialog>
  );
}
