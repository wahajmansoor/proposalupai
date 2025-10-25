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
    if (!user) {
      router.replace("/login");
      return;
    }

    const isSubscribed = userProfile?.subscriptionStatus === 'active' || userProfile?.subscriptionStatus === 'trialing';
    
    // Non-protected dashboard pages that are still part of the dashboard layout
    const nonProtectedPaths = ['/dashboard/skill-profiles', '/dashboard/proposals', '/profile', '/subscription', '/pricing'];

    const isAccessingNonProtectedPath = nonProtectedPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

    if (!isSubscribed && !isAccessingNonProtectedPath) {
        router.replace('/pricing');
    } else {
        setIsAuthorized(true);
    }
    
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
