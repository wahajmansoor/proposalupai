
import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProposalUpLogos, ProposalUpLogoLight } from '@/components/icons';
import { ArrowLeft } from 'lucide-react';
import { BgPattern } from '@/components/bg-pattern';
import { ThemeToggle } from '@/components/theme-toggle';
import { SignupForm } from './signup-form';

function SignupPageSkeleton() {
  return (
    <div className="min-h-screen w-full relative">
      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        <div className="flex flex-col justify-center p-4 sm:p-12 xl:p-20">
          <div className="w-full max-w-md mx-auto">
            <Link href="https://www.proposalupai.com/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Create an Account</h1>
              <p className="text-muted-foreground mt-1">Enter your information to get started.</p>
            </div>
            <div className="flex items-center justify-center h-48">
              <ProposalUpLogos className="h-24 w-24 animate-pulse text-primary" />
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-col items-center justify-center bg-background dark:bg-card text-white relative">
          <BgPattern />
          <div className="flex flex-col items-center text-center z-10">
            <Link href="/" className="mb-4">
              <ProposalUpLogoLight className="h-32 w-32 text-white" />
            </Link>
            <h2 className="text-3xl font-bold mb-2">Proposal Up</h2>
            <p className="text-lg text-white/80 max-w-md">
              Generate tailored proposals with the power of AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function SignupPage() {
    return (
        <Suspense fallback={<SignupPageSkeleton />}>
            <SignupForm />
        </Suspense>
    )
}
