
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
import { ProposalUpLogos } from '@/components/icons';
import Link from 'next/link';

export function WelcomeDialog({
  open,
  onOpenChange,
  subscriptionStatus,
  planInterval,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionStatus?: string | null;
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
            <ProposalUpLogos className="h-16 w-16 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            {isTrialing ? "Welcome to Proposal Up AI!" : "Welcome to Proposal Up AI!"}
          </DialogTitle>
          <DialogDescription className="text-base text-center">
            Your account is ready, and your journey to winning more projects has begun.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 space-y-3">
          {isTrialing ? (
            <div className="flex items-start gap-3 p-3 bg-card rounded-lg text-left">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold">7 Days Free Trial</h4>
                <p className="text-sm text-muted-foreground">
                  Your free trial has started. You can use all AI features.
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
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-center">
          {isTrialing ? (
            <>
              <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Start Creating Proposal
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Start Creating Proposals
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
