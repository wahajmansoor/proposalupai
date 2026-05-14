
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Star, Info, Loader2 } from 'lucide-react';
import { ShareIcons } from './icons';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { PADDLE_PRICES } from '@/lib/paddle/constants';
import PaddleCheckout from './paddle-checkout';
import { checkUserStatusAction } from '@/lib/paddle-actions';


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
    { name: "30 Credits", price: 5, credits: 30, priceId: PADDLE_PRICES.credits.ten },
    { name: "70 Credits", price: 10, credits: 70, priceId: PADDLE_PRICES.credits.twentyfive },
    { name: "200 Credits", price: 25, credits: 200, priceId: PADDLE_PRICES.credits.fifty }
];


function CreditsDialogContent() {
    const { data: session, update } = useSession();
    const user = session?.user;
    const userProfile = user?.profile;
    const { toast } = useToast();

    const [hasCopied, setHasCopied] = useState(false);
    const [referralLink, setReferralLink] = useState('');
    const referralCode = userProfile?.referralCode || user?.id?.substring(0, 8); 

    useEffect(() => {
        if (typeof window !== 'undefined' && referralCode) {
          setReferralLink(`${window.location.origin}/signup?invite=${referralCode}`);
        }
    }, [referralCode]);

    const copyToClipboard = () => {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink);
        setHasCopied(true);
        toast({ variant: "success",  title: "Copied!", description: "Referral link copied to clipboard." });
        setTimeout(() => setHasCopied(false), 2000);
    };

    const shareText = "Check out Proposal Up! The best way to generate winning proposals.";
    const socialShareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + referralLink)}`,
    };

    return (
         <div className="p-0">
            <div>
                {userProfile?.subscriptionStatus === 'trialing' ? (
                    <div className="flex flex-col items-center justify-center text-center p-4 bg-muted/50 rounded-lg">
                        <Info className="h-6 w-6 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">Credit purchases are available after your trial ends.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <h3 className="text-base font-semibold leading-none tracking-tight text-center">Buy More Credits</h3>
                         <div className="grid grid-cols-3 gap-2">
                            {creditPackages.map((pkg) => (
                                <div key={pkg.priceId} className="flex flex-col items-center gap-1 p-2 border rounded-lg flex-1">
                                    <span className="text-xl sm:text-2xl font-bold">${pkg.price}</span>
                                    <span className="font-semibold text-muted-foreground text-xs">{pkg.name}</span>
                                    <PaddleCheckout 
                                        priceId={pkg.priceId}
                                        userId={user?.id || ''}
                                        userEmail={user?.email || ''}
                                        customData={{ purchaseType: 'credits', creditAmount: pkg.credits }}
                                        buttonText="Buy"
                                        className="w-full inline-flex items-center justify-center rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900 hover:bg-yellow-500 h-8 mt-1"
                                        onSuccess={() => {
                                            toast({ variant: "success",  title: "Processing...", description: "Verifying your purchase. Please wait." });
                                            const currentCredits = userProfile?.proposalCredits || 0;
                                            let attempts = 0;
                                            const poll = setInterval(async () => {
                                                attempts++;
                                                const res = await checkUserStatusAction();
                                                if (res?.data?.proposalCredits && res.data.proposalCredits > currentCredits || attempts >= 10) {
                                                    clearInterval(poll);
                                                    await update();
                                                    toast({ variant: "success",  title: "Purchase Successful!", description: "Your credits have been added." });
                                                }
                                            }, 2000);
                                        }}
                                    />
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
                <p className="text-sm text-center mt-2 text-muted-foreground">
                    Invite a friend. You get 10 credits and they get 5 credits!
                </p>
            </div>
            <div className="space-y-4 mt-4">
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
                <Link href={socialShareLinks.facebook} target="_blank">
                  <ShareIcons.Facebook className="h-6 w-6 cursor-pointer dark:fill-white opacity-70 hover:opacity-100" />
                </Link>
                 <Link href={socialShareLinks.twitter} target="_blank">
                  <ShareIcons.Twitter className="h-6 w-6 cursor-pointer dark:fill-white opacity-70 hover:opacity-100" />
                </Link>
                 <Link href={socialShareLinks.linkedin} target="_blank">
                  <ShareIcons.LinkedIn className="h-6 w-6 cursor-pointer dark:fill-white opacity-70 hover:opacity-100" />
                </Link>
                 <Link href={socialShareLinks.whatsapp} target="_blank">
                  <ShareIcons.WhatsApp className="h-6 w-6 cursor-pointer dark:fill-white opacity-70 hover:opacity-100" />
                </Link>
              </div>
            </div>
        </div>
    )
}

export function CreditsButton() {
  const { data: session } = useSession();
  const userProfile = session?.user?.profile;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pops, setPops] = useState<number[]>([]);
  const isMobile = useIsMobile();

  const credits = userProfile?.proposalCredits ?? 0;
  
  if (!userProfile) {
    return null;
  }
  
  const DialogTriggerButton = (
    <Button
        id="tour-header-credits"
        variant="outline"
        className="relative h-9 px-3 bg-yellow-400 hover:bg-yellow-400 text-yellow-900 hover:text-yellow-900 font-semibold gap-2 rounded-full"
      >
        <img src="/coin-anim.gif" alt="coin" className="h-6 w-6" />
        <span>Credits</span>
        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-white text-xs">
          {credits}
        </span>
        {pops.map((amount, index) => (
            <CreditPopAnimation key={index} amount={amount} />
        ))}
    </Button>
  );

  if (isMobile) {
    return (
        <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DrawerTrigger asChild>
                {DialogTriggerButton}
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-center">
                    <DialogTitle>Credits</DialogTitle>
                </DrawerHeader>
                <ScrollArea className="overflow-y-auto max-h-[60vh] px-4">
                    <CreditsDialogContent />
                </ScrollArea>
                <DrawerFooter className="pt-2">
                    <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
         {DialogTriggerButton}
      </DialogTrigger>
       <DialogContent className="sm:max-w-lg p-7">
         <DialogHeader className="items-center text-center">
            <div className="flex justify-center">
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
        <CreditsDialogContent />
      </DialogContent>
    </Dialog>
  );
}

export function BuyMoreCreditsButton() {
  const { data: session } = useSession();
  const userProfile = session?.user?.profile;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!userProfile) {
    return null;
  }

  const TriggerButton = (
    <Button
        type="button"
        variant="outline"
        className="relative h-9 px-3 mt-2 bg-yellow-400 hover:bg-yellow-400 text-yellow-900 hover:text-yellow-900 font-semibold gap-2 rounded-full"
      >
        <img src="/coin-anim.gif" alt="coin" className="h-6 w-6" />
        <span>Buy More Credits</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DialogTitle>Buy Credits</DialogTitle>
          </DrawerHeader>
          <ScrollArea className="overflow-y-auto max-h-[60vh] px-4">
            <CreditsDialogContent />
          </ScrollArea>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-lg p-7">
        <DialogHeader className="items-center text-center">
          <DialogTitle>Buy More Credits</DialogTitle>
        </DialogHeader>
        <CreditsDialogContent />
      </DialogContent>
    </Dialog>
  );
}
