
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
      return; // 1. Wait for auth state and profile to finish loading.
    }

    if (!user || !userProfile) {
      // 2. If, after loading, there's no user or profile, redirect to login.
      // This is the critical check that waits for the Firestore fetch to complete.
      router.replace("/login"); 
      return;
    }
    
    // --- From here, we know user and userProfile are loaded ---

    const status = userProfile.subscriptionStatus;
    const isAllowedOnboarding = pathname === '/onboarding';
    const isAllowedPricing = pathname === '/dashboard/pricing';
    const isAllowedRoot = pathname === '/';
    
    if (isAllowedRoot) {
        router.replace('/dashboard');
        return;
    }
    
    // 4. New user who has not selected a plan yet (onboarding incomplete)
    if (userProfile.onboardingComplete === false) {
        if (!isAllowedOnboarding) {
            router.replace('/onboarding');
            return;
        }
    } else {
        // User has completed onboarding, they should not be on the onboarding page
        if (isAllowedOnboarding) {
            router.replace('/dashboard');
            return;
        }
    }
    
    // 5. User has completed onboarding but has a non-active subscription status
    // (e.g., 'canceled', 'past_due'). They should be on the pricing/subscription page.
    const isActiveOrTrial = status === 'active' || status === 'trialing';
    if (userProfile.onboardingComplete && !isActiveOrTrial) {
        if (!isAllowedPricing && pathname !== '/subscription') {
            router.replace('/dashboard/pricing');
            return;
        }
    }

    // 6. If we've passed all checks, the user is authorized to see the page.
    setIsAuthorized(true);
    
  }, [user, userProfile, authLoading, router, pathname]);
  
  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
      </div>
    );
  }
  
  // Do not render the main layout for the onboarding page
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
