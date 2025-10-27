
"use client";

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signInWithCustomToken } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { WelcomeScreen } from '@/components/welcome-screen';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [welcomeMessage, setWelcomeMessage] = useState("Signing you in and getting things ready...");
  const [showWelcome, setShowWelcome] = useState(true); // Always show welcome screen initially

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
          
          const userDocRef = doc(db, 'users', userCredential.user.uid);
          const userDoc = await getDoc(userDocRef);
          
          let redirectPath = '/dashboard';
          if (userDoc.exists() && userDoc.data().isNewUser) {
            setWelcomeMessage("Start your 2 Days Free Trial and Explore Proposal Up!");
            redirectPath = '/pricing';
            // Mark the new user flag as false so they don't see this again
            await updateDoc(userDocRef, { isNewUser: false });
          } else {
            setWelcomeMessage("Stop drafting from scratch, Proposal Up creates tailored proposals and cover letters that win attention fast.");
          }

          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage({ type: 'auth-success', redirectPath }, window.location.origin);
              window.close();
            } else {
               router.push(redirectPath);
            }
          }, 3000); // Show welcome screen for 3 seconds
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
  
  if (showWelcome) {
    return <WelcomeScreen description={welcomeMessage} />;
  }
  
  // This part will likely not be seen, but is a good fallback
  return <WelcomeScreen description="Redirecting..." />;
}

export default function AuthCallbackClientPage() {
    return (
        <Suspense>
            <AuthCallback />
        </Suspense>
    )
}
