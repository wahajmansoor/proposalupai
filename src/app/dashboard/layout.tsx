
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

    // Define paths that are PROTECTED and require a subscription.
    const protectedPaths = ['/dashboard', '/dashboard/skill-profiles', '/dashboard/proposals'];

    // Check if the user is trying to access a protected path.
    // We use `pathname === path` for `/dashboard` to avoid matching `/dashboard/subscription`.
    const isAccessingProtectedPath = protectedPaths.some(path => 
        path === '/dashboard' ? pathname === path : pathname.startsWith(path)
    );

    // If user is NOT subscribed and is trying to access a protected path, redirect them.
    if (!isSubscribed && isAccessingProtectedPath) {
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
