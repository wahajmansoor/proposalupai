"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ProposalUpLogo } from '@/components/icons';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    
    // Check if this window was opened by a parent window
    if (window.opener) {
      if (token) {
        // Send the token to the parent window
        window.opener.postMessage({ type: 'auth-token', token }, window.location.origin);
      } else {
        // Send an error to the parent window
        const error = searchParams.get('error') || 'unknown-error';
        const details = searchParams.get('details') || 'An unknown error occurred.';
        window.opener.postMessage({ type: 'auth-error', error, details }, window.location.origin);
      }
       // The popup should close itself after posting the message.
       // The parent window will handle the sign-in logic.
       window.close();
    } else {
      // Fallback for cases where it's not a popup (e.g., direct navigation)
      toast({
        title: 'Authentication Error',
        description: 'Please try logging in again from the login page.',
        variant: 'destructive',
      });
      router.push('/login');
    }
  }, [router, searchParams, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
        <p className="text-muted-foreground">Finalizing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackClientPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthCallback />
        </Suspense>
    )
}
