
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; 
    }
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
            <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
       <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 p-4 md:p-8 container mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
