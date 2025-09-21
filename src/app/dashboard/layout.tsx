
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
      return; // Wait until auth state is confirmed
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    // This condition ensures we don't proceed until userProfile is loaded.
    // A user exists, but their profile data hasn't been fetched yet.
    if (!userProfile) {
      return; 
    }
    
    // User can always access pricing and their profile
    const allowedPaths = ["/dashboard/pricing", "/dashboard/profile"];
    if (allowedPaths.includes(pathname)) {
      setShowTrialDialog(false); // Make sure dialog is hidden on these pages
      return;
    }

    const hasActiveSubscription = userProfile?.subscriptionStatus === "active" || userProfile?.subscriptionStatus === "trialing";
    const trialEndDate = userProfile?.trialEndDate;
    const isTrialActive = trialEndDate && new Date() < trialEndDate;

    if (!hasActiveSubscription) {
      if (isTrialActive) {
        // User is in trial, show the non-dismissible dialog
        setShowTrialDialog(true);
      } else {
        // Trial is over, redirect to pricing
        router.replace("/dashboard/pricing");
      }
    } else {
      // User is subscribed, hide the dialog
      setShowTrialDialog(false);
    }

  }, [user, userProfile, loading, router, pathname]);

  if (loading || !user) {
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
