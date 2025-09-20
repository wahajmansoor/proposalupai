
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";
import { TrialDialog } from "@/components/trial-dialog";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showTrialDialog, setShowTrialDialog] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }
    
    if (!userProfile) {
      return;
    }
    
    const allowedPaths = ["/dashboard/pricing", "/dashboard/profile"];
    if (allowedPaths.includes(pathname)) {
      return;
    }

    const hasActiveSubscription = userProfile.subscriptionStatus === "active";
    const isTrialActive = userProfile.trialEndDate && new Date() < userProfile.trialEndDate;

    if (!hasActiveSubscription) {
      if (isTrialActive) {
        // User is in trial and not subscribed, show the modal.
        setShowTrialDialog(true);
      } else {
        // Trial is over and not subscribed, redirect to pricing.
        router.replace("/dashboard/pricing");
      }
    } else {
        // User has an active subscription, hide modal.
        setShowTrialDialog(false);
    }

  }, [user, userProfile, loading, router, pathname]);

  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
      <Header />
      <TrialDialog open={showTrialDialog} />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        {children}
      </main>
    </div>
  );
}
