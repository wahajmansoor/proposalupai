// src/app/profile/layout.tsx
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";

function ProfilePageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 container py-8">
      <Skeleton className="h-9 w-1/3" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}


export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth state is done loading and there's still no user,
    // redirect to login.
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // The gatekeeper:
  // Show a loader/skeleton while we are verifying authentication
  // or if the user object is not yet available.
  // This prevents any flicker of content or rendering with incomplete data.
  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
        <Header />
        <main className="flex-1">
          <ProfilePageSkeleton />
        </main>
      </div>
    );
  }

  // If all checks pass, render the actual content.
  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
