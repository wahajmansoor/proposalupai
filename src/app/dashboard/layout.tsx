
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";
import { DashboardNav } from "@/components/dashboard-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; // Wait for auth state to load
    }
    if (!user) {
      router.replace("/login");
      return;
    }

    const isSubscribed = userProfile?.subscriptionStatus === 'active' || userProfile?.subscriptionStatus === 'trialing';

    // All pages under /dashboard require a subscription except pricing and profile, but they have their own layouts.
    // So this layout only applies to pages that should be protected.
    if (!isSubscribed) {
        router.replace('/pricing');
    }
    
  }, [user, userProfile, loading, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }

  // If user is loaded but profile is still loading, or if they are not subscribed yet, show a loader.
  // This prevents a flash of content before the redirect happens.
  const isSubscribed = userProfile?.subscriptionStatus === 'active' || userProfile?.subscriptionStatus === 'trialing';
  if (!userProfile && !loading) {
      // This can happen briefly while the profile is fetched after the user is confirmed.
      return (
         <div className="flex items-center justify-center min-h-screen">
            <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
         </div>
      )
  }
  if (!isSubscribed) {
       return (
         <div className="flex items-center justify-center min-h-screen">
            <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
         </div>
      )
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <DashboardNav />
      <main className="flex-1 w-full p-4 md:p-8">
        <div className="container mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
