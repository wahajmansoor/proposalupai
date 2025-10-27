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
      return; // 1. Wait for auth state to load
    }

    if (!user) {
      router.replace("/login"); // 2. If not logged in, redirect to login
      return;
    }

    if (!userProfile) {
      return; // 3. If user exists but profile is still loading, wait.
    }

    // 4. If user HAS NOT completed onboarding, they must be on the onboarding page.
    if (userProfile.onboardingComplete === false) {
      if (pathname !== '/onboarding') {
        router.replace('/onboarding');
        return; // Redirect and stop further checks
      }
      setIsAuthorized(true);
      return;
    }

    // At this point, user has completed onboarding.
    
    // 5. For onboarded users, check subscription status.
    const isSubscribed = userProfile.subscriptionStatus === 'active' || userProfile.subscriptionStatus === 'trialing';
    const isPricingPage = pathname === '/dashboard/pricing';

    // If user is not subscribed and is trying to access a page other than the pricing page, redirect them.
    if (!isSubscribed && !isPricingPage) {
      router.replace('/dashboard/pricing');
      return;
    }
    
    // 6. If all checks pass, authorize the user to see the page.
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
