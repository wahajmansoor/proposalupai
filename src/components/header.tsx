import { AIProposalUpLogo } from '@/components/icons';
import { UserNav } from '@/components/user-nav';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-4 items-center">
          <AIProposalUpLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">AI Proposal Up</h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Link href="/dashboard" passHref>
              <Button variant="ghost" size="icon" aria-label="Dashboard">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
