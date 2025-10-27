
"use client";

import { ProposalUpLogos } from '@/components/icons';

export function WelcomeScreen({ description }: { description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <ProposalUpLogos className="h-32 w-32 mb-6 text-primary animate-pulse" />
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Welcome to Proposal Up!</h1>
      <p className="text-lg text-muted-foreground max-w-xl">
        {description}
      </p>
    </div>
  );
}
