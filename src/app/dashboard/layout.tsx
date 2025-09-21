
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
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

  useEffect(() => {
    if (loading) {
      return; // Still waiting for auth state...
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    // After loading, if there's a user but no profile yet, we wait.
    // If there is a profile, we check subscription.
    if (userProfile) {
      const hasActiveSubscription = userProfile.subscriptionStatus === "active" || userProfile.subscriptionStatus === "trialing";
      if (!hasActiveSubscription) {
        router.replace("/pricing");
      }
    }
    
  }, [user, userProfile, loading, router]);

  // This is the gatekeeper. Show a loader while we are verifying.
  // This prevents any flicker of the dashboard content.
  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }
  
  // Once verified, only show the content if they have a subscription.
  // The useEffect above will handle the redirect, but this is a final check.
  const isSubscribed = userProfile.subscriptionStatus === "active" || userProfile.subscriptionStatus === "trialing";
  if (!isSubscribed) {
      // Render the loader while redirecting
     return (
        <div className="flex items-center justify-center min-h-screen">
            <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
        </div>
    );
  }

  // If all checks pass, render the dashboard.
  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
      <Header />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        {children}
      </main>
    </div>
  );
}
