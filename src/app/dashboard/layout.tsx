// src/app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

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

    // If user is NOT subscribed and is trying to access a protected path, redirect them.
    if (!isSubscribed && isAccessingProtectedPath) {
        router.replace('/pricing');
        return; // Important: stop further execution
    }
    
    // If we've passed all checks, the user is authorized to see the content.
    setIsAuthorized(true);
    
  }, [user, userProfile, loading, router, pathname]);
  
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }
  
  return (
     <div className="min-h-screen flex bg-main-background">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[290px]">
        <Header />
        <main className="flex-1 w-full p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
