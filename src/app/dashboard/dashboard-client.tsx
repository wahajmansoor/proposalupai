
// src/app/dashboard/dashboard-client.tsx
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProposalUpLogos } from '@/components/icons';
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";

export function DashboardClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth state to load
    }

    // 1. If not logged in, redirect to login
    if (!user) {
      router.replace("/login");
      return;
    }

    // 2. If user exists but profile is still loading, wait.
    if (!userProfile) {
      return;
    }

    // 3. If user has NOT completed onboarding, they must be on the onboarding page.
    if (userProfile.onboardingComplete === false) {
      if (pathname !== '/onboarding') {
        router.replace('/onboarding');
        return; // Redirect and stop further checks
      }
      // If they are on the onboarding page, they are authorized.
      setIsAuthorized(true);
      return;
    }

    // 4. For users who HAVE completed onboarding, check subscription status for other pages.
    const isSubscribed = userProfile.subscriptionStatus === 'active' || userProfile.subscriptionStatus === 'trialing';
    
    // The main dashboard requires a subscription.
    if (pathname === '/dashboard' && !isSubscribed) {
      router.replace('/dashboard/pricing');
      return;
    }

    // If all checks pass, authorize the user to see the page.
    setIsAuthorized(true);
    
  }, [user, userProfile, authLoading, router, pathname]);
  
  // Render loading state until authorization check is complete.
  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
      </div>
    );
  }
  
  // A special case for the onboarding page - it doesn't need the full dashboard layout.
  if (pathname === '/onboarding') {
    return <main>{children}</main>;
  }

  return (
     <div className="min-h-screen flex bg-main-background">
      <Sidebar collapsible="icon" />
      <div className="flex-1 flex flex-col">
        <Header />
        <SidebarInset>
            <main className="flex-1 w-full p-4 md:p-8">
                {children}
            </main>
        </SidebarInset>
      </div>
    </div>
  );
}
