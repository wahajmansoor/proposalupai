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
    
    const status = userProfile.subscriptionStatus;
    const isAllowedOnboarding = pathname === '/onboarding';
    const isAllowedPricing = pathname === '/dashboard/pricing';

    // 4. New user who has not selected a plan yet.
    // Their status will be null or undefined. Force them to the onboarding page.
    if (!status) {
        if (!isAllowedOnboarding) {
            router.replace('/onboarding');
            return;
        }
        setIsAuthorized(true);
        return;
    }
    
    // 5. User has a status. Check if they are subscribed.
    const isSubscribed = status === 'active' || status === 'trialing';

    if (isSubscribed) {
        // If they are subscribed but somehow on the onboarding or pricing page, move them to the main dashboard.
        if (isAllowedOnboarding || isAllowedPricing) {
            router.replace('/dashboard');
            return;
        }
        // Otherwise, they are authorized to see any other dashboard page.
        setIsAuthorized(true);
        return;
    }
    
    // 6. User is not subscribed (e.g., status is 'canceled', 'past_due', etc.)
    // They should only be able to access the pricing page.
    if (!isAllowedPricing) {
        router.replace('/dashboard/pricing');
        return;
    }
    
    // If they are on the pricing page, they are authorized.
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
