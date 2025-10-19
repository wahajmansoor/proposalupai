// src/app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { ProposalUpLogos } from '@/components/icons';
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";

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
    
    // Define paths that are PROTECTED and require a subscription.
    const protectedPaths = ['/dashboard', '/dashboard/skill-profiles', '/dashboard/proposals'];

    // Check if the user is trying to access a protected path.
    const isAccessingProtectedPath = protectedPaths.some(path => 
        path === '/dashboard' ? pathname === path : pathname.startsWith(path)
    );

    // If user is NOT subscribed (which includes past_due, unpaid, etc.) and is trying to access a protected path, redirect them.
    if (!isSubscribed && isAccessingProtectedPath) {
        router.replace('/pricing');
        return; // Important: stop further execution
    }
    
  }, [user, userProfile, loading, router, pathname]);
  
  if (loading || !user) {
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
