
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from './ui/button';
import { ReferralDialog } from './referral-dialog';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  useEffect(() => {
    if (creditChange > 0) {
      setPops(prev => [...prev, creditChange]);
      // Remove the pop after the animation duration
      setTimeout(() => {
        setPops(prev => prev.slice(1));
      }, 1500); // Must match animation duration in tailwind.config.ts
    }
  }, [creditChange]);


  const credits = userProfile?.proposalCredits ?? 0;
  const referralCode = userProfile?.referralCode;

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
      <ReferralDialog referralCode={referralCode} />
    </Dialog>
  );
}
