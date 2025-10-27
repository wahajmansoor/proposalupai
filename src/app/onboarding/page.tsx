
"use client";

import { ProposalUpLogos } from '@/components/icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Rocket } from 'lucide-react';

export default function OnboardingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <ProposalUpLogos className="h-32 w-32 mb-6 text-primary" />
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
        Welcome to Proposal Up!
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl mb-8">
        Start your 2-Day Free Trial and explore how Proposal Up can help you win more projects.
      </p>
      <Button asChild size="lg">
        <Link href="/pricing">
          <Rocket className="mr-2" />
          Get Started
        </Link>
      </Button>
    </div>
  );
}
