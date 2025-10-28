"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProposalUpLogos } from '@/components/icons';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // This page is just a landing page. The actual app logic starts at /login or /dashboard.
        // For simplicity in this environment, we'll just redirect to login.
        // In a real app, this could be a marketing landing page.
        router.replace('/login');
    }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
    </div>
  );
}
