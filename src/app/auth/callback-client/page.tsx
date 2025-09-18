"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { ProposalUpLogo } from '@/components/icons';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      signInWithCustomToken(auth, token)
        .then(() => {
          router.push('/dashboard');
        })
        .catch((error) => {
          console.error('Custom token sign-in error:', error);
          toast({
            title: 'Sign-In Failed',
            description: 'There was a problem signing you in. Please try again.',
            variant: 'destructive',
          });
          router.push('/login');
        });
    } else {
       toast({
        title: 'Authentication Error',
        description: 'No authentication token found. Please try logging in again.',
        variant: 'destructive',
      });
      router.push('/login');
    }
  }, [router, searchParams, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
        <p className="text-muted-foreground">Signing you in...</p>
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
