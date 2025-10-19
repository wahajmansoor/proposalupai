
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { ProposalUpLogos } from '@/components/icons';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state is fully loaded
    if (!loading) {
      if (user) {
        // If user is logged in, redirect to the dashboard
        router.replace('/dashboard');
      } else {
        // If user is not logged in, redirect to the login page
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Show a loading indicator while the auth state is being determined
  return (
    <div className="flex items-center justify-center min-h-screen">
      <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
    </div>
  );
}
