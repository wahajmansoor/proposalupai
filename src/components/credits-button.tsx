
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from './ui/button';
import { CoinIcon } from './icons';
import { ReferralDialog } from './referral-dialog';

export function CreditsButton() {
  const { userProfile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const credits = userProfile?.proposalCredits ?? 0;
  const referralCode = userProfile?.referralCode;

  if (!userProfile || userProfile.subscriptionStatus === 'active') {
    return null;
  }

  return (
    <ReferralDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} referralCode={referralCode}>
      <Button
        variant="outline"
        className="h-auto px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 border-yellow-500 text-yellow-900 font-semibold gap-2"
        onClick={() => setIsDialogOpen(true)}
      >
        <CoinIcon className="h-5 w-5" />
        <span>Credits</span>
        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-white text-xs">
          {credits}
        </span>
      </Button>
    </ReferralDialog>
  );
}
