
"use client";

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Star, Info, Loader2 } from 'lucide-react';
import { ShareIcons } from './icons';
import Link from 'next/link';
import { chargeCardForCredits } from '@/lib/stripe-actions';
import { useRouter } from 'next/navigation';


function CreditPopAnimation({ amount }: { amount: number }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div key={Date.now()} className="animate-credit-pop absolute text-2xl font-bold text-yellow-500">
                +{amount}
            </div>
        </div>
    );
}

const creditPackages = [
    { name: "10 Credits", price: 5, credits: 10, priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_10_PRICE_ID! },
    { name: "25 Credits", price: 10, credits: 25, priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_25_PRICE_ID! },
    { name: "50 Credits", price: 25, credits: 50, priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_50_PRICE_ID! }
];

export function CreditsButton() {
  const { user, userProfile, creditChange } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pops, setPops] = useState<number[]>([]);
  const [hasCopied, setHasCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  
  const [isPending, startTransition] = useTransition();
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);

  const credits = userProfile?.proposalCredits ?? 0;
  const referralCode = userProfile?.referralCode;

  const handlePurchase = (priceId: string) => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to purchase credits.", variant: "destructive"});
        return;
    }
    setSelectedPriceId(priceId);
    startTransition(async () => {
        const formData = new FormData();
        formData.append('priceId', priceId);
        
        const result = await chargeCardForCredits(formData);

        if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        } else if (result.success) {
            toast({ title: "Purchase Successful!", description: result.message });
            // The onSnapshot in AuthProvider will update the credits, no need to refresh page
        }
        setSelectedPriceId(null);
    });
  };

  useEffect(() => {
    if (creditChange > 0) {
      setPops(prev => [...prev, creditChange]);
      // Remove the pop after the animation duration
      setTimeout(() => {
        setPops(prev => prev.slice(1));
      }, 1500); // Must match animation duration in tailwind.config.ts
    }
  }, [creditChange]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && referralCode) {
      setReferralLink(`${window.location.origin}/signup?invite=${referralCode}`);
    }
  }, [referralCode]);

  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setHasCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    setTimeout(() => setHasCopied(false), 2000);
  };
  
  const shareText = "Check out Proposal Up! The best way to generate winning proposals.";
  const socialShareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + referralLink)}`,
  };


  if (!userProfile) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
         <Button
            variant="outline"
            className="relative h-9 px-3 bg-yellow-400 hover:bg-yellow-400 text-yellow-900 hover:text-yellow-900 font-semibold gap-2 rounded-full"
          >
            <img src="/coin-anim.gif" alt="Credits" className="h-6 w-6" />
            <span>Credits</span>
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-white text-xs">
              {credits}
            </span>
            {pops.map((amount, index) => (
                <CreditPopAnimation key={index} amount={amount} />
            ))}
          </Button>
      </DialogTrigger>
       <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
            <div className="flex justify-center pb-4">
                <div 
                    className="flex items-center justify-center h-32 w-32 rounded-full"
                    style={{ backgroundColor: '#facc15' }}
                >
                    <div className="text-center">
                        <p className="text-4xl font-bold" style={{ color: '#713f12' }}>{credits}</p>
                        <p className="text-sm font-medium uppercase tracking-wider" style={{ color: '#713f12' }}>Credits</p>
                    </div>
                </div>
            </div>
          
        </DialogHeader>

        <div className="mt-2">
            {userProfile?.subscriptionStatus === 'trialing' ? (
                <div className="flex flex-col items-center justify-center text-center p-4 bg-muted/50 rounded-lg">
                    <Info className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Credit purchases are available after your trial ends.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <h3 className="text-base font-semibold leading-none tracking-tight text-center">Buy More Credits</h3>
                     <div className="flex justify-center gap-2">
                        {creditPackages.map((pkg) => (
                             <div key={pkg.priceId} className="flex flex-col items-center gap-1">
                                <Button
                                    onClick={() => handlePurchase(pkg.priceId)}
                                    disabled={isPending}
                                    variant="outline"
                                    className="relative h-9 px-4 bg-yellow-400 hover:bg-yellow-400 text-yellow-900 hover:text-yellow-900 font-semibold gap-2 rounded-full"
                                >
                                    {isPending && selectedPriceId === pkg.priceId ? (
                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                    ) : (
                                        <>
                                            <img src="/coin-anim.gif" alt="Credits" className="h-6 w-6" />
                                            <span>Buy Now</span>
                                        </>
                                    )}
                                </Button>
                                <span className="text-sm text-muted-foreground">{pkg.credits} credits for ${pkg.price}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
        </div>

        <div className="text-center">
            <DialogTitle>Refer a Friend, Get Credits</DialogTitle>
            <DialogDescription className="text-base text-center mt-2">
                Invite a friend using your referral link. When they sign up and start their trial, you both get 5 free credits to improve your proposals!
            </DialogDescription>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral-link" className="text-center w-full block">Your Referral Link</Label>
            <div className="flex items-center gap-2">
              <Input id="referral-link" value={referralLink} readOnly />
              <Button size="icon" variant="outline" onClick={copyToClipboard} disabled={!referralLink}>
                {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-8 pt-2">
            <Link href={socialShareLinks.facebook} target="_blank" passHref>
              <ShareIcons.Facebook className="h-6 w-6 cursor-pointer dark:fill-white" />
            </Link>
             <Link href={socialShareLinks.twitter} target="_blank" passHref>
              <ShareIcons.Twitter className="h-6 w-6 cursor-pointer dark:fill-white" />
            </Link>
             <Link href={socialShareLinks.linkedin} target="_blank" passHref>
              <ShareIcons.LinkedIn className="h-6 w-6 cursor-pointer dark:fill-white" />
            </Link>
             <Link href={socialShareLinks.whatsapp} target="_blank" passHref>
              <ShareIcons.WhatsApp className="h-6 w-6 cursor-pointer dark:fill-white" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
