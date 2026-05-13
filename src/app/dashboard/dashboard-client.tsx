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
import { AlertCircle, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";


export function DashboardClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const authLoading = status === "loading";
  const user = session?.user;
  const userProfile = user?.profile;
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
    if (userProfile && !isActiveOrTrial) {
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

  if (isInitialLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <>
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
            <div className="py-6 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4">
                   <span className="text-xl font-bold animate-none" style={{ animation: 'none' }}>{countdown}</span>
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

