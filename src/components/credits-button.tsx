
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from './ui/button';
import { ReferralDialog } from './referral-dialog';

export function CreditsButton() {
  const { userProfile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const credits = userProfile?.proposalCredits ?? 0;
  const referralCode = userProfile?.referralCode;

  if (!userProfile) {
    return null;
  }

  return (
    <ReferralDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} referralCode={referralCode}>
      <Button
        variant="outline"
        className="h-9 px-3 bg-yellow-400 hover:bg-yellow-400 text-yellow-900 hover:text-yellow-900 font-semibold gap-2 rounded-full"
        onClick={() => setIsDialogOpen(true)}
      >
        <img src="/coin-anim.gif" alt="Credits" className="h-6 w-6" />
        <span>Credits</span>
        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-white text-xs">
          {credits}
        </span>
      </Button>
    </ReferralDialog>
  );
}
