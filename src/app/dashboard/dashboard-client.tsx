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

    // 4. User has an active subscription.
    if (status === 'active') {
        // If they are active but on the onboarding page, move them to the dashboard.
        if (isAllowedOnboarding) {
            router.replace('/dashboard');
            return;
        }
        // Otherwise, an active user can see any page.
        setIsAuthorized(true);
        return;
    }
    
    // 5. User is on a trial.
    if (status === 'trialing') {
        // If they are on trial but on the onboarding page, move them to the dashboard.
        if (isAllowedOnboarding) {
            router.replace('/dashboard');
            return;
        }
        // A trial user can see any page (including pricing).
        setIsAuthorized(true);
        return;
    }
    
    // 6. New user who has not selected a plan yet (status is null/undefined).
    if (!status) {
        // Force them to the onboarding page if they are not already there.
        if (!isAllowedOnboarding) {
            router.replace('/onboarding');
            return;
        }
        // They are authorized to see the onboarding page.
        setIsAuthorized(true);
        return;
    }
    
    // 7. User has a non-active status (e.g., 'canceled', 'past_due').
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
