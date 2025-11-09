

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
import { processMpesaPayment, processCardPayment, processPayPalPayment } from '@/app/actions';
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
        const result = await processMpesaPayment({
            userId: user.uid,
            phoneNumber,
            amount: 1, // Using 1 KES for sandbox testing
            courseId: itemId,
        });

        if (result.success) {
            toast({
                title: "Processing Payment...",
                description: "Please check your phone to complete the M-Pesa transaction."
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
  
  const handleCryptoPay = async () => {
    if (!user || !walletAddress) return;

    if (mdtBalance === null || parseFloat(mdtBalance) < mdtPrice) {
        toast({ title: 'Insufficient MDT Balance', description: 'You do not have enough MandaTokens to make this purchase.', variant: 'destructive'});
        return;
    }
    
    setIsLoading(true);
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(MANDA_TOKEN_CONTRACT_ADDRESS, MandaTokenABI.abi, signer);

        // This is a placeholder for a real payment function.
        // In a real scenario, you'd call a function on an enrollment contract
        // that would then call `transferFrom` on the token contract.
        // For this demo, we'll simulate a direct transfer to a treasury address.
        const treasuryAddress = "0x000000000000000000000000000000000000dEaD"; // Placeholder
        const amountInWei = ethers.parseUnits(mdtPrice.toString(), 18);
        
        const tx = await contract.transfer(treasuryAddress, amountInWei);
        toast({ title: 'Processing Transaction...', description: 'Waiting for blockchain confirmation.'});
        await tx.wait();

        toast({ title: 'Payment Successful!', description: 'Your payment has been confirmed.' });
        onPaymentSuccess('crypto');
    } catch (error) {
        console.error("Crypto payment failed:", error);
        toast({ title: 'Crypto Payment Failed', description: 'The transaction was cancelled or failed.', variant: 'destructive'});
    } finally {
        setIsLoading(false);
    }
  }


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
              onPaymentSuccess('paypal');
          } else {
              throw new Error(result.message);
          }
      } catch (error: any) => {
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
