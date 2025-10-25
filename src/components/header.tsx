
// src/components/header.tsx
import { ProposalUpLogo } from '@/components/icons';
import { UserNav } from '@/components/user-nav';
import Link from 'next/link';
import { Button } from './ui/button';
import { useAuth } from '@/context/auth-context';
import { Sparkles } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { SidebarTrigger } from './ui/sidebar';
import { CreditsButton } from './credits-button';

export function Header() {
  const { user, userProfile, loading } = useAuth();

  const canSeeCredits = user && userProfile?.subscriptionStatus && userProfile.subscriptionStatus !== 'N/A' && userProfile.subscriptionStatus !== null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
       <SidebarTrigger />
        <div className="w-full flex-1">
          {/* Optional: Add a search bar or other header content here */}
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-4">
           {canSeeCredits && <CreditsButton />}
          {user && userProfile?.subscriptionStatus === 'trialing' && (
            <Button asChild size="sm" className="hidden sm:flex">
              <Link href="/pricing">
                <Sparkles className="mr-2 h-4 w-4" />
                Activate Pro Plan
              </Link>
            </Button>
          )}
          <ThemeToggle />
          <UserNav />
        </div>
      </header>
  );
}

    
