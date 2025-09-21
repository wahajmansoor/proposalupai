
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";

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
      return; // Wait until auth state is confirmed
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    // Wait for userProfile to be loaded
    if (!userProfile) {
      return; 
    }
    
    // User can always access pricing and their profile
    const allowedPaths = ["/dashboard/pricing", "/dashboard/profile"];
    if (allowedPaths.includes(pathname)) {
      setIsAuthorized(true);
      return;
    }

    const hasActiveSubscription = userProfile?.subscriptionStatus === "active" || userProfile?.subscriptionStatus === "trialing";

    if (!hasActiveSubscription) {
      router.replace("/dashboard/pricing");
    } else {
      setIsAuthorized(true);
    }

  }, [user, userProfile, loading, router, pathname]);

  // Show a loading screen while we verify auth and subscription status
  if (!isAuthorized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
      <Header />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        {children}
      </main>
    </div>
  );
}
