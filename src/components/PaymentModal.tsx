
'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, CreditCard, MoveRight, AlertCircle, Coins } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { processMpesaPayment, getMpesaPaymentStatus, processPayPalPayment } from '@/app/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@iconify/react';
import type { UserCourse } from '@/lib/types';
import { ethers } from 'ethers';
import { MANDA_TOKEN_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import MandaTokenABI from '@/lib/blockchain/abis/MandaToken.json';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  price: number;
  onPaymentSuccess: (paymentMethod: UserCourse['paymentMethod']) => void;
}

// A simple mock conversion rate
const KES_TO_MDT_RATE = 10;

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
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mdtBalance, setMdtBalance] = useState<string | null>(null);

  const mdtPrice = price * KES_TO_MDT_RATE;

  useEffect(() => {
    // Check for wallet connection when modal opens
    if (isOpen && typeof window.ethereum !== 'undefined') {
        const checkConnection = async () => {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) {
                    const signer = await provider.getSigner();
                    const address = await signer.getAddress();
                    setWalletAddress(address);
                    fetchBalance(provider, address);
                }
            } catch (err) {
                console.error("Failed to check wallet connection:", err);
            }
        }
        checkConnection();
    }
  }, [isOpen]);

  const fetchBalance = async (provider: ethers.BrowserProvider, address: string) => {
    try {
        const contract = new ethers.Contract(MANDA_TOKEN_CONTRACT_ADDRESS, MandaTokenABI.abi, provider);
        const balance = await contract.balanceOf(address);
        setMdtBalance(ethers.formatUnits(balance, 18));
    } catch (error) {
        console.error("Failed to fetch token balance", error);
        setMdtBalance('Error');
    }
  };

  const handleConnectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
        toast({ title: "MetaMask not found", variant: "destructive" });
        return;
    }
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        fetchBalance(provider, address);
    } catch (err) {
        toast({ title: "Connection Failed", description: "User denied account access.", variant: "destructive" });
    }
  };


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
        const idToken = await user.getIdToken();
        const result = await processMpesaPayment({ idToken, phoneNumber, courseId: itemId });

        if (result.success) {
            toast({ title: 'M-Pesa request sent', description: 'Complete the prompt on your phone. We are waiting for Safaricom to confirm payment.' });
            if (result.checkoutRequestId) {
                for (let attempt = 0; attempt < 20; attempt++) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    const status = await getMpesaPaymentStatus(idToken, result.checkoutRequestId);
                    if (status === 'completed') { onPaymentSuccess('mpesa'); return; }
                    if (status === 'failed') throw new Error('M-Pesa reports that this payment was not completed.');
                }
                toast({ title: 'Payment still processing', description: 'Your request is pending. Course access will appear after confirmation; refresh your courses shortly.' });
            }
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
  
  const handleCryptoPay = async () => {
    toast({
      title: 'Crypto checkout unavailable',
      description: 'Crypto payments are disabled until an audited payment contract and server-side enrollment verification are deployed.',
      variant: 'destructive',
    });
  };

  const handlePayPalPay = async () => {
       if (!user) return;
      setIsLoading(true);
       try {
          const result = await processPayPalPayment({ itemId, itemName, amount: price });
          if (result.success && result.approvalUrl) {
              toast({ title: 'PayPal checkout unavailable', description: result.message, variant: 'destructive' });
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
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
                <TabsTrigger value="card">Card</TabsTrigger>
                <TabsTrigger value="paypal">PayPal</TabsTrigger>
                <TabsTrigger value="crypto">Crypto</TabsTrigger>
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
                 <div className="py-8 text-center space-y-3">
                    <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="font-medium">Card payments are not available yet.</p>
                    <p className="text-sm text-muted-foreground">Card checkout will be enabled after a PCI-compliant provider integration is configured. No card details are collected here.</p>
                 </div>
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
            <TabsContent value="crypto">
                 <div className="py-4 space-y-4">
                    {walletAddress ? (
                        <div className="space-y-4">
                            <Alert>
                                <Coins className="h-4 w-4" />
                                <AlertTitle>Pay with MandaToken (MDT)</AlertTitle>
                                <AlertDescription>
                                    <p>Price: {mdtPrice.toLocaleString()} MDT</p>
                                    <p>Your Balance: {mdtBalance ? parseFloat(mdtBalance).toLocaleString() : 'Loading...'} MDT</p>
                                </AlertDescription>
                            </Alert>
                             <Button className="w-full" onClick={handleCryptoPay} disabled={isLoading || mdtBalance === null || parseFloat(mdtBalance) < mdtPrice}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Pay {mdtPrice.toLocaleString()} MDT
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-muted-foreground mb-4">Connect your wallet to pay with cryptocurrency.</p>
                            <Button className="w-full" onClick={handleConnectWallet}>
                                <Icon icon="logos:metamask-icon" className="mr-2 h-5 w-5" />
                                Connect MetaMask
                            </Button>
                        </div>
                    )}
                 </div>
            </TabsContent>
        </Tabs>
        
      </DialogContent>
    </Dialog>
  );
}
