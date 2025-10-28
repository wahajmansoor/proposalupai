
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProposalUpLogos } from '@/components/icons';
import { WelcomeScreen } from '@/components/welcome-screen';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // This page is just a landing page. The actual app logic starts at /login or /dashboard.
        // For simplicity in this environment, we'll just redirect to login.
        // In a real app, this could be a marketing landing page.
        router.replace('/login');
    }, [router]);

  return (
    <WelcomeScreen description="You are being redirected..." />
  );
}
