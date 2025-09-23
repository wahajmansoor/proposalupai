
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";
import { DashboardNav } from "@/components/dashboard-nav";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; 
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!userProfile?.subscriptionStatus || !['active', 'trialing'].includes(userProfile.subscriptionStatus)) {
        router.replace('/pricing');
    }
  }, [user, userProfile, loading, router]);

  if (loading || !user || !userProfile?.subscriptionStatus || !['active', 'trialing'].includes(userProfile.subscriptionStatus)) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
            <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
        </div>
      </div>
    );
  }

  // If all checks pass, render the profile page.
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <DashboardNav />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        {children}
      </main>
    </div>
  );
}
