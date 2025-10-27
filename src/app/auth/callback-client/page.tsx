
"use client";

import { useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signInWithCustomToken } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { ProposalUpLogos } from '@/components/icons';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const handleAuth = useCallback(async (customToken: string) => {
    try {
      // Step 1: Sign in on the client
      const userCredential = await signInWithCustomToken(auth, customToken);
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      // Step 2: Create the server session
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      
      // Step 3: Check onboarding status
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists() && userDocSnap.data()?.onboardingComplete === false) {
         // New user, redirect to onboarding
        router.push('/onboarding');
      } else {
        // Returning user, redirect to dashboard
        router.push('/dashboard');
      }

    } catch (error: any) {
      console.error("Firebase custom sign-in error:", error);
      if (window.opener) {
        window.opener.postMessage({ type: 'auth-error', error: 'firebase-signin-failed', details: error.message }, window.location.origin);
        window.close();
      } else {
        toast({
          title: 'Authentication Error',
          description: 'Failed to sign you in. Please try again.',
          variant: 'destructive',
        });
        router.push('/login');
      }
    }
  }, [router, toast]);


  useEffect(() => {
    const customToken = searchParams.get('token');
    
    if (customToken) {
      handleAuth(customToken);
    } else {
      // Handle errors passed in URL params from the server
      const error = searchParams.get('error') || 'unknown-error';
      const details = searchParams.get('details') || 'An unknown error occurred.';
      if (window.opener) {
        window.opener.postMessage({ type: 'auth-error', error, details }, window.location.origin);
        window.close();
      } else {
        toast({
          title: 'Authentication Error',
          description: details,
          variant: 'destructive',
        });
        router.push('/login');
      }
    }
  }, [searchParams, toast, router, handleAuth]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
    </div>
  );
}

export default function AuthCallbackClientPage() {
    return (
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
          </div>
        }>
            <AuthCallback />
        </Suspense>
    )
}
