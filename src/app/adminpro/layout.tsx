
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";
import { AdminNav } from "@/components/admin-nav";

export default function AdminLayout({
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
    
    // The middleware handles the admin check server-side,
    // but we can add a client-side check as a fallback.
    if (userProfile && !userProfile.isAdmin) {
        router.replace("/dashboard");
    }

  }, [user, userProfile, loading, router]);

  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }
  
  // Final check to prevent flicker
  if (!userProfile.isAdmin) {
      return (
        <div className="flex items-center justify-center min-h-screen">
            <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <AdminNav />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        {children}
      </main>
    </div>
  );
}
