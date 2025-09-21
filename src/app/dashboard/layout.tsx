
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
    // Wait until the initial loading of user and profile is complete
    if (loading) {
      return;
    }

    // If there's no user, redirect to login
    if (!user) {
      router.replace("/login");
      return;
    }

    // If the user profile is loaded, check for subscription
    if (userProfile) {
      // Allow access to profile page regardless of subscription
      if (pathname === "/dashboard/profile") {
        return; 
      }
      
      const hasActiveSubscription = userProfile.subscriptionStatus === "active" || userProfile.subscriptionStatus === "trialing";

      if (!hasActiveSubscription) {
        router.replace("/pricing");
      }
    }
    // If user exists but userProfile is still null after loading, it might be a new user.
    // The loading screen will show until the profile is created and this check re-runs.
    // A separate check for new users might redirect them to pricing page.

  }, [user, userProfile, loading, router, pathname]);

  // Show a loading screen while we verify auth and subscription status.
  // This prevents any flicker of content on initial load, logout, or for unauthorized users.
  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }
  
  // Once loaded and profile is available, we can safely render the layout
  // The useEffect above will handle redirection if they are not subscribed.
  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
      <Header />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        {children}
      </main>
    </div>
  );
}
