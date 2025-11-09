
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/shared/Footer";
import { ArrowLeft, Coins, Loader2, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { ethers } from 'ethers';
import { MANDA_TOKEN_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import MandaTokenABI from '@/lib/blockchain/abis/MandaToken.json';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const contractAddressIsSet = MANDA_TOKEN_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';

export default function AdminBlockchainPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [mdtBalance, setMdtBalance] = useState<string | null>(null);
    const [noWallet, setNoWallet] = useState(false);
    const [isFunding, setIsFunding] = useState(false);
    const [fundAmount, setFundAmount] = useState('');

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.push('/admin');
        }
    }, [isSuperAdmin, authLoading, router]);

    const fetchBalance = async (provider: ethers.BrowserProvider, address: string) => {
        if (!contractAddressIsSet) {
            setMdtBalance('0.00');
            return;
        }
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
            setNoWallet(true);
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            setWalletAddress(address);
            toast({
                title: "Wallet Connected",
                description: `Connected to address: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
            });
            await fetchBalance(provider, address);
        } catch (error) {
            console.error("Failed to connect wallet", error);
            toast({
                variant: "destructive",
                title: "Connection Failed",
                description: "User denied account access or another error occurred.",
            });
        }
    };
    
    const handleFundFaucet = async () => {
        if (typeof window.ethereum === 'undefined' || !walletAddress) {
            toast({ title: 'Wallet not connected', variant: 'destructive'});
            return;
        }
        if (!contractAddressIsSet) return;
        setIsFunding(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(MANDA_TOKEN_CONTRACT_ADDRESS, MandaTokenABI.abi, signer);
            
            const amountInWei = ethers.parseUnits(fundAmount, 18);
            
            const tx = await contract.fundFaucet(amountInWei);
            toast({ title: 'Processing...', description: 'Your transaction is being sent to the blockchain.' });

            await tx.wait(); // Wait for the transaction to be mined

            toast({ title: 'Success!', description: `${fundAmount} MDT has been sent to the faucet.` });
            await fetchBalance(provider, walletAddress);

        } catch (error: any) {
            console.error("Faucet funding failed", error);
            let errorMessage = "Could not fund the faucet. Please try again.";
            if (error.message.includes("insufficient balance")) {
                errorMessage = "You do not have enough MDT to complete this transaction.";
            }
            toast({ title: 'Funding Failed', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsFunding(false);
            setFundAmount('');
        }
    }


  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </Link>
          <Card className="flex-grow flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon icon="mdi:bitcoin" className="h-6 w-6" />
                  Blockchain Faucet Management
                </CardTitle>
                <CardDescription>
                    Connect your owner wallet to manage the token faucet for the MandaToken (MDT) contract.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col space-y-6">
                {!contractAddressIsSet && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                            The MandaToken contract is not deployed or configured. Please follow the blockchain integration guide to deploy the contract and update its address in `src/lib/blockchain/contracts.ts` to enable these features.
                        </AlertDescription>
                    </Alert>
                )}
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Wallet Connection</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {walletAddress ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-semibold">Connected Address</p>
                                    <p className="font-mono text-muted-foreground text-xs break-all">{walletAddress}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">MDT Balance</p>
                                    <p className="font-bold text-primary text-lg">{mdtBalance !== null ? parseFloat(mdtBalance).toLocaleString() : 'Loading...'} MDT</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Button className="w-full" onClick={handleConnectWallet} disabled={noWallet || !contractAddressIsSet}>
                                    <Icon icon="logos:metamask-icon" className="mr-2 h-5 w-5" />
                                    Connect MetaMask Wallet
                                </Button>
                                {noWallet && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Wallet Not Found</AlertTitle>
                                        <AlertDescription>Please install a browser wallet like MetaMask to connect.</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </CardContent>
                 </Card>

                 <Card>
                     <CardHeader>
                        <CardTitle className="text-lg">Fund Faucet</CardTitle>
                        <CardDescription>Transfer MDT from your wallet to the faucet contract so users can claim tokens.</CardDescription>
                     </CardHeader>
                     <CardContent>
                         <div className="space-y-4">
                            <div>
                                <Label htmlFor="fund-amount">Amount to Fund</Label>
                                <Input
                                    id="fund-amount"
                                    type="number"
                                    value={fundAmount}
                                    onChange={(e) => setFundAmount(e.target.value)}
                                    placeholder="e.g., 10000"
                                    disabled={!walletAddress || isFunding}
                                />
                            </div>
                            <Button onClick={handleFundFaucet} disabled={!walletAddress || isFunding || !fundAmount}>
                                {isFunding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Coins className="h-4 w-4 mr-2" />}
                                Fund Faucet
                            </Button>
                         </div>
                     </CardContent>
                 </Card>
              </CardContent>
            </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
