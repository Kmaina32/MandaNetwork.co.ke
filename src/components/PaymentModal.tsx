'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MoveRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Icon } from '@iconify/react';
import type { UserCourse } from '@/lib/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  purchaseType?: 'course' | 'hackathon' | 'organization_plan';
  price: number;
  onPaymentSuccess: (paymentMethod: UserCourse['paymentMethod']) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  purchaseType = 'course',
  price,
}: PaymentModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [recurringConsent, setRecurringConsent] = useState(false);

  const startPaystackCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ itemId, purchaseType }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || typeof result.authorizationUrl !== 'string') {
        throw new Error(result.error || 'Paystack checkout could not be started.');
      }

      const checkoutUrl = new URL(result.authorizationUrl);
      if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.paystack.com') {
        throw new Error('Paystack returned an invalid checkout address.');
      }

      window.location.assign(checkoutUrl.toString());
    } catch (error) {
      toast({
        title: 'Payment could not start',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            You are purchasing "{itemName}" for Ksh {price.toLocaleString()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-5">
          <div className="flex items-center justify-center gap-3 rounded-lg border p-5">
            <Icon icon="simple-icons:paystack" className="h-9 w-9" aria-hidden="true" />
            <div>
              <p className="font-semibold">Paystack secure checkout</p>
              <p className="text-sm text-muted-foreground">The only payment provider for Varban Academy</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {purchaseType === 'organization_plan' ? 'This is a recurring monthly subscription charged to a bank card through Paystack. Mobile money is not available for recurring subscriptions.' : 'Pay securely in Kenyan Shillings using the payment channels enabled on our Paystack account, including supported cards and mobile money.'}
          </p>
          {purchaseType === 'organization_plan' && (
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox id="recurring-payment-consent" checked={recurringConsent} onCheckedChange={(checked) => setRecurringConsent(checked === true)} />
              <label htmlFor="recurring-payment-consent" className="text-sm leading-5 cursor-pointer">
                I authorize monthly recurring card payments for this organization plan until I cancel the subscription.
              </label>
            </div>
          )}
          <Button
            type="button"
            className="w-full"
            disabled={isLoading || !user || (purchaseType === 'organization_plan' && !recurringConsent)}
            onClick={startPaystackCheckout}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue to Paystack
            {!isLoading ? <MoveRight className="ml-2 h-4 w-4" /> : null}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {purchaseType === 'organization_plan' ? 'By continuing, you authorize Paystack to charge your saved card monthly until you cancel. Manage or cancel your subscription from Organization Billing.' : 'Your payment details are entered securely on Paystack. Varban Academy does not store your card details.'}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
