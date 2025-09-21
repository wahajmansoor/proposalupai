
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FilePlus2, FolderKanban, Save } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Create Proposal", icon: FilePlus2 },
  { href: "/dashboard/proposals", label: "Saved Proposals", icon: Save },
  { href: "/dashboard/portfolio", label: "Portfolio Collections", icon: FolderKanban },
];

function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="border-b">
        <div className="container mx-auto">
            <nav className="flex items-center gap-2 -mb-px">
                {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                    "flex items-center gap-2 py-3 px-3 border-b-2 text-sm font-medium transition-colors",
                    pathname === item.href
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                </Link>
                ))}
            </nav>
        </div>
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Still waiting for auth state...
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    // After loading, if there's a user but no profile yet, we wait.
    // If there is a profile, we check subscription.
    if (userProfile) {
      const hasActiveSubscription = userProfile.subscriptionStatus === "active" || userProfile.subscriptionStatus === "trialing";
      if (!hasActiveSubscription) {
        router.replace("/pricing");
      }
    }
    
  }, [user, userProfile, loading, router]);

  // This is the gatekeeper. Show a loader while we are verifying.
  // This prevents any flicker of the dashboard content.
  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }
  
  // Once verified, only show the content if they have a subscription.
  // The useEffect above will handle the redirect, but this is a final check.
  const isSubscribed = userProfile.subscriptionStatus === "active" || userProfile.subscriptionStatus === "trialing";
  if (!isSubscribed) {
      // Render the loader while redirecting
     return (
        <div className="flex items-center justify-center min-h-screen">
            <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
        </div>
    );
  }

  // If all checks pass, render the dashboard.
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
