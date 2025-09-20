
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until loading is false before doing anything
    if (loading) {
      return;
    }

    // If there's no user, redirect to login
    if (!user) {
      router.replace("/login");
      return;
    }

    // If there is a user but we are still waiting for the userProfile from Firestore
    if (!userProfile) {
      // Don't do anything yet, wait for the profile to load.
      // The loading screen below will cover this state.
      return;
    }
    
    // Allow access to pricing and profile pages regardless of subscription status
    const allowedPaths = ["/dashboard/pricing", "/dashboard/profile"];
    if (allowedPaths.includes(pathname)) {
      return;
    }

    // Check for active subscription or trial
    const hasActiveSubscription = userProfile.subscriptionStatus === "active";
    const isTrialActive = userProfile.trialEndDate && new Date() < userProfile.trialEndDate;

    if (!hasActiveSubscription && !isTrialActive) {
      // If no active sub and trial is over, redirect to pricing
      router.replace("/dashboard/pricing");
    }

  }, [user, userProfile, loading, router, pathname]);

  // Show a loading screen while auth state is being determined OR
  // if we have a user but are still waiting for their profile from the database.
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
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        {children}
      </main>
    </div>
  );
}
