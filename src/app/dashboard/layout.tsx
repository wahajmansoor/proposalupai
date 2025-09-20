
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
    if (!loading) {
      if (!user) {
        // If not logged in, redirect to login page
        router.replace("/login");
        return;
      }
      
      // Allow access to pricing and profile pages regardless of subscription status
      const allowedPaths = ["/dashboard/pricing", "/dashboard/profile"];
      if (allowedPaths.includes(pathname)) {
        return;
      }

      // Check for active subscription or trial
      const hasActiveSubscription = userProfile?.subscriptionStatus === "active";
      const isTrialActive =
        userProfile?.trialEndDate && new Date() < userProfile.trialEndDate;

      if (!hasActiveSubscription && !isTrialActive) {
        // If no active sub and trial is over, redirect to pricing
        router.replace("/dashboard/pricing");
      }
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
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        {children}
      </main>
    </div>
  );
}
