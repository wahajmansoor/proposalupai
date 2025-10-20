
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
          
          const creationTime = userCredential.user.metadata.creationTime ? new Date(userCredential.user.metadata.creationTime).getTime() : 0;
          const lastSignInTime = userCredential.user.metadata.lastSignInTime ? new Date(userCredential.user.metadata.lastSignInTime).getTime() : 0;
          const isNewUser = Math.abs(creationTime - lastSignInTime) < 2000;

          const redirectPath = isNewUser ? '/pricing' : '/dashboard';

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
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
        <p className="text-muted-foreground">Finalizing authentication...</p>
      </div>
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

    