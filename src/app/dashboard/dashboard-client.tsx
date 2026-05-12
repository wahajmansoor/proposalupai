// src/app/dashboard/dashboard-client.tsx
"use client";

import { useSession } from "next-auth/react";
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
  const { data: session, status } = useSession();
  const authLoading = status === "loading";
  const user = session?.user;
  const userProfile = user?.profile;
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return; // 1. Wait for auth state to finish loading.
    }

    if (!user) {
      // 2. If no user after loading, redirect to login.
      router.replace("/login"); 
      return;
    }
    
    // --- From here, we know user is loaded ---

    const subscriptionStatus = userProfile?.subscriptionStatus;
    const isAllowedPricing = pathname === '/dashboard/pricing';
    const isAllowedRoot = pathname === '/';
    
    if (isAllowedRoot) {
        router.replace('/dashboard');
        return;
    }
    
    // User has completed onboarding via NextAuth signup, route them based on subscription
    const isActiveOrTrial = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
    if (userProfile && !isActiveOrTrial) {
        if (!isAllowedPricing && pathname !== '/subscription') {
            router.replace('/dashboard/pricing');
            return;
        }
    }

    // 6. If we've passed all checks, the user is authorized to see the page.
    setIsAuthorized(true);
    
  }, [user, userProfile, authLoading, router, pathname]);
  
  // Only show the loading screen on initial mount before we have a session or authorization.
  // If we already have a user, do not unmount the dashboard during background session updates!
  const isInitialLoading = authLoading && !user;

  if (isInitialLoading || !isAuthorized) {
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
