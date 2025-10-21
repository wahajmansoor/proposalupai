
"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ProposalUpLogos } from '@/components/icons';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const customToken = searchParams.get('token');
    
    if (customToken) {
      signInWithCustomToken(auth, customToken)
        .then(async (userCredential) => {
          const idToken = await userCredential.user.getIdToken();
          
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          
          const redirectPath = '/dashboard';

          if (window.opener) {
            window.opener.postMessage({ type: 'auth-success', redirectPath }, window.location.origin);
            window.close();
          } else {
             router.push(redirectPath);
          }
        })
        .catch((error) => {
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
        });
    } else {
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
  }, [router, searchParams, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
      <h1 className="mt-6 text-2xl font-semibold">Welcome Back!</h1>
      <p className="text-muted-foreground mt-2">Signing you in and getting things ready...</p>
    </div>
  );
}

export default function AuthCallbackClientPage() {
    return (
        <Suspense>
            <AuthCallback />
        </Suspense>
    )
}
