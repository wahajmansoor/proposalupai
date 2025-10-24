
"use client";

import { useState, useEffect } from 'react';
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
import { Copy, Check, Star } from 'lucide-react';
import { ShareIcons } from './icons';
import Link from 'next/link';


function CreditPopAnimation({ amount }: { amount: number }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div key={Date.now()} className="animate-credit-pop absolute text-2xl font-bold text-yellow-500">
                +{amount}
            </div>
        </div>
    );
}

export function CreditsButton() {
  const { userProfile, creditChange } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pops, setPops] = useState<number[]>([]);
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  
  const credits = userProfile?.proposalCredits ?? 0;
  const referralCode = userProfile?.referralCode;

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
          <DialogTitle>Refer a Friend, Get Credits</DialogTitle>
           <DialogDescription>
            Share your link with friends. When they sign up and become a paying subscriber, you'll both get 5 extra proposal improvement credits!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="referral-link">Your Unique Referral Link</Label>
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
