
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
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { processMpesaPayment, getMpesaPaymentStatus } from '@/app/actions';


interface MpesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  price: number;
  onPaymentSuccess: () => void;
}

export function MpesaModal({
  isOpen,
  onClose,
  courseId,
  courseName,
  price,
  onPaymentSuccess,
}: MpesaModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'submitted' | 'success'>('form');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ title: 'Not Logged In', description: 'You must be logged in to purchase a course.', variant: 'destructive' });
        router.push('/login');
        return;
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
        toast({ title: 'Invalid Phone Number', description: 'Please enter a valid 10-digit phone number.', variant: 'destructive' });
        return;
    }

    setIsLoading(true);
    setPaymentStep('processing');

    try {
      const idToken = await user.getIdToken();
      const result = await processMpesaPayment({ idToken, phoneNumber, courseId });

      if (result.success) {
        // Wait for the authenticated status action to observe verified provider settlement
        if (result.checkoutRequestId) {
          for (let attempt = 0; attempt < 20; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const status = await getMpesaPaymentStatus(idToken, result.checkoutRequestId);
            if (status === 'completed') {
              setPaymentStep('success');
              setIsLoading(false);
              onPaymentSuccess();
              return;
            }
            if (status === 'failed') throw new Error('M-Pesa reports that this payment was not completed.');
          }
        }
        setIsLoading(false);
        setPaymentStep('submitted');
      } else {
        throw new Error(result.message);
      }

    } catch (error: any) {
        console.error("Payment or enrollment failed:", error);
        toast({ title: 'Payment Failed', description: error.message || 'Something went wrong. Please try again.', variant: 'destructive'});
        setIsLoading(false);
        setPaymentStep('form');
    }
  };
  
  const handleClose = () => {
    // The server retains the transaction status; reset this local form for the next purchase.
    setPhoneNumber('');
    setPaymentStep('form');
    setIsLoading(false);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            Pay for "{courseName}" with M-Pesa.
          </DialogDescription>
        </DialogHeader>
        
        {paymentStep === 'form' && (
            <form onSubmit={handlePay}>
                <div className="grid gap-4 py-4">
                    <div className='p-4 bg-secondary rounded-md text-center'>
                        <p className='text-sm text-muted-foreground'>Total Amount</p>
                        <p className='text-3xl font-bold'>Ksh {price.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">
                        Phone
                        </Label>
                        <Input
                        id="phone"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0712345678"
                        className="col-span-3"
                        required
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Pay Ksh ${price.toLocaleString()}`}
                    </Button>
                </DialogFooter>
            </form>
        )}

        {paymentStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="font-semibold">Processing Payment...</p>
                <p className="text-sm text-muted-foreground">Please check your phone to complete.</p>
            </div>
        )}

         {paymentStep === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="font-semibold">Payment confirmed</p>
              <p className="text-sm text-muted-foreground">Your course access has been activated.</p>
            </div>
        )}

        {paymentStep === 'submitted' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mb-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="font-semibold">Payment request sent</p>
                <p className="text-sm text-muted-foreground">Complete the M-Pesa prompt. Course access will be enabled only after Safaricom confirms the payment.</p>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
