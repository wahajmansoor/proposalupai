
"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/app/lib/stripe-actions";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ProposalUpLogo } from "./icons";
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrialDialogProps {
  open: boolean;
}

export function TrialDialog({ open }: TrialDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartTrial = async () => {
    setIsSubmitting(true);
    try {
      await createCheckoutSession();
      // User will be redirected to Stripe by the server action
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "Could not initiate checkout. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <CustomDialogContent
        className="max-w-md p-0 overflow-hidden"
        hideCloseButton={true}
        onInteractOutside={(e) => {
            e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
            e.preventDefault();
        }}
      >
        <div className="bg-[#FF69B4] p-8 text-center text-white">
            <ProposalUpLogo className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Start Your Free Trial</h2>
          <p className="text-sm opacity-90">
            Unlock all features. No commitment, cancel anytime.
          </p>
        </div>
        <div className="p-8 bg-card">
          <div className="text-center mb-6">
            <p className="font-semibold text-muted-foreground">2 days free trial</p>
            <span className="text-5xl font-extrabold text-foreground">$20</span>
            <span className="text-muted-foreground">/ month</span>
          </div>

          <Button
            size="lg"
            className="w-full bg-slate-900 text-white hover:bg-slate-800"
            onClick={handleStartTrial}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Redirecting..." : "Start a 2-day free trial"}
          </Button>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}


// Custom DialogContent to allow hiding the close button
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideCloseButton?: boolean }
>(({ className, children, hideCloseButton, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
CustomDialogContent.displayName = DialogPrimitive.Content.displayName;
