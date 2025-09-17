import { ProposalUpLogo } from '@/components/icons';
import { UserNav } from '@/components/user-nav';
import Link from 'next/link';
import { Button } from './ui/button';
import { LayoutDashboard, FolderKanban } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-1 items-center">
          <ProposalUpLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Proposal Up</h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <LayoutDashboard />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/portfolio">
                <FolderKanban />
                Portfolio
              </Link>
            </Button>
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
