
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { ProposalUpLogo, ProposalUpLogoLight } from '@/components/icons';

export function WelcomeDialog({
  open,
  onOpenChange,
  subscriptionStatus,
  planInterval,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionStatus?: string;
  planInterval?: 'monthly' | 'yearly' | null;
}) {
  const isTrialing = subscriptionStatus === 'trialing';

  const getPlanName = () => {
    if (!planInterval) return 'Pro';
    return planInterval === 'yearly' ? 'Pro Yearly' : 'Pro Monthly';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="bg-primary/10 rounded-full p-3 mb-4">
            <ProposalUpLogo className="dark:hidden h-16 w-16 text-primary" />
            <ProposalUpLogoLight className="hidden dark:block h-16 w-16 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            {isTrialing ? "Welcome to Proposal Up!" : "Welcome to Proposal Up!"}
          </DialogTitle>
          <DialogDescription className="text-base text-center">
            Your subscription is active, and your journey to winning more projects has begun.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold">Your Plan: {getPlanName()}</h4>
              <p className="text-sm text-muted-foreground">
                You have unlimited access to all features.
              </p>
            </div>
          </div>
          {isTrialing ? (
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold">2-Day Free Trial</h4>
                <p className="text-sm text-muted-foreground">
                  Your free trial has started. You won't be charged for 2 days.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold">{getPlanName()} Plan Activated</h4>
                <p className="text-sm text-muted-foreground">
                  Thank you for upgrading! Your account is now on the {getPlanName()}.
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-center">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Start Creating Proposals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
