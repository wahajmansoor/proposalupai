// src/app/dashboard/dashboard-client.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProposalUpLogos } from '@/components/icons';
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { checkSessionStatusAction } from "@/app/lib/actions";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { isAdmin as checkAdmin } from "@/lib/utils";
import { OnboardingTour } from "@/components/onboarding-tour";


export function DashboardClient({
  children,
  onboardingCompleted,
}: {
  children: React.ReactNode;
  onboardingCompleted: boolean;
}) {
  const { data: session, status } = useSession();
  const authLoading = status === "loading";
  const user = session?.user;
  const userProfile = user?.profile;
  const deactivated = (user as any)?.deactivated;
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sessionMismatch, setSessionMismatch] = useState(false);
  const [countdown, setCountdown] = useState(5);


  useEffect(() => {
    if (authLoading) {
      return; // 1. Wait for auth state to finish loading.
    }

    if (!user) {
      // 2. If no user after loading, redirect to login.
      router.replace("/login");
      return;
    }

// Skip deactivation check for admins
    const isAdmin = checkAdmin(user?.email);
    
    // Allow deactivated users to access subscription and pricing pages
    const isAllowedDeactivatedPage = 
      pathname === '/dashboard/subscription' || 
      pathname === '/dashboard/pricing';

    if (deactivated && !isAdmin && !isAllowedDeactivatedPage) {
      // Show banner but block other pages
      setIsAuthorized(true);
      return;
    }

    // --- From here, we know user is loaded ---

    const subscriptionStatus = userProfile?.subscriptionStatus;
    const isAllowedPricing = pathname === '/dashboard/pricing';
    const isAllowedRoot = pathname === '/';

    if (isAllowedRoot) {
      router.replace('/dashboard');
      return;
    }

    // User has completed onboarding via NextAuth signup, route them based on subscription
    const isActiveOrTrial = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

    if (userProfile && !isActiveOrTrial && !isAdmin) {
      if (!isAllowedPricing && pathname !== '/subscription') {
        router.replace('/dashboard/pricing');
        return;
      }
    }

    // 6. If we've passed all checks, the user is authorized to see the page.
    setIsAuthorized(true);

  }, [user, userProfile, authLoading, router, pathname]);

  // Background session check
  useEffect(() => {
    if (!user || !isAuthorized || sessionMismatch) return;

    const interval = setInterval(async () => {
      const result = await checkSessionStatusAction((session as any).sessionId);
      if (result.status === 'invalidated') {
        setSessionMismatch(true);
        clearInterval(interval);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, isAuthorized, session, sessionMismatch]);

  // Handle countdown
  useEffect(() => {
    if (!sessionMismatch) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Force logout and redirect
      signOut({ redirect: false }).then(() => {
        router.push('/login?error=ConcurrentLogin');
      });
    }
  }, [sessionMismatch, countdown, router]);


  // Only show the loading screen on initial mount before we have a session or authorization.
  // If we already have a user, do not unmount the dashboard during background session updates!
  const isInitialLoading = authLoading && !user;

  if (isInitialLoading || (!isAuthorized && !deactivated)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
      </div>
    );
  }

  if (deactivated && !checkAdmin(user?.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <AlertDialog open={true}>
          <AlertDialogContent className="max-w-md border-t-4 border-t-destructive shadow-2xl">
            <AlertDialogHeader className="items-center text-center sm:text-center md:text-center">
              <div className="p-4 bg-destructive/10 rounded-full mb-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <AlertDialogTitle className="text-3xl font-bold text-destructive">Profile Deactivated</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-base mt-2 space-y-4">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {deactivated.message}
                  </p>
<div className="p-4 border border-slate-200 dark:border text-sm text-muted-foreground">
                    If you want to reactivate your profile, contact an admin. help@proposalupai.com
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center">
              <Button onClick={() => signOut({ callbackUrl: '/login' })} className="gap-2 text-white bg-red-700">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <>
      <OnboardingTour onboardingCompleted={onboardingCompleted} />
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

      <AlertDialog open={sessionMismatch}>
        <AlertDialogContent className="max-w-md border-t-4 border-t-destructive">
          <AlertDialogHeader className="items-center text-center">
            <div className="p-3 bg-destructive/10 rounded-full mb-4">
              <AlertCircle className="h-10 w-10 text-destructive animate-pulse" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold">New Login Detected</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You have been logged in from another device. To protect your account security, this session is now inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-6 text-center flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center h-16 w-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <span className="relative text-xl font-bold">{countdown}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" />
              Redirecting to login...
            </p>
          </div>
          <AlertDialogFooter className="sm:justify-center">
            <p className="text-xs text-muted-foreground italic">
              If this wasn't you, please change your password immediately.
            </p>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
