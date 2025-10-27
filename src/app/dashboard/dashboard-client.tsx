
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

    // 2. If the user is on the onboarding page, they are allowed to be there.
    if (pathname === '/onboarding') {
        setIsAuthorized(true);
        return;
    }
    
    // 3. If user has not completed onboarding, and is NOT on the onboarding page, redirect them.
    if (userProfile?.onboardingComplete === false) {
      router.replace('/onboarding');
      return;
    }
    
    // 4. For users who HAVE completed onboarding, check subscription status.
    const isSubscribed = userProfile?.subscriptionStatus === 'active' || userProfile?.subscriptionStatus === 'trialing';
    
    // Define pages accessible to non-subscribed but onboarded users
    const nonSubscribedAllowedPaths = ['/pricing', '/subscription', '/profile', '/dashboard/skill-profiles', '/dashboard/proposals'];
    const isAccessingAllowedPath = nonSubscribedAllowedPaths.some(path => pathname.startsWith(path));
    
    if (!isSubscribed && !isAccessingAllowedPath) {
        // If not subscribed and not on an allowed page, redirect to pricing.
        router.replace('/pricing');
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
