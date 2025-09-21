
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProposalUpLogo } from "@/components/icons";
import { Header } from "@/components/header";

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

  // Show a loader while we are verifying authentication.
  // This prevents any flicker of content.
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }

  // If the user is logged in, show the profile page.
  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
