"use client";

import { useSession } from "next-auth/react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DeactivatedAccountBanner() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-2 bg-amber-100 dark:bg-amber-900/30">
        <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400 mr-2" />
        <span className="text-sm text-amber-800 dark:text-amber-200">Loading...</span>
      </div>
    );
  }

  const deactivated = (session?.user as any)?.deactivated;
  
  if (!deactivated?.isActive) {
    return null;
  }

  return (
    <Card className="m-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Account Deactivated
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {deactivated.message || "Your profile has been deactivated by an administrator."}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              You can still access your Subscription and Plan & Pricing pages, but other features are restricted.
              Please contact support to reactivate your account.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
