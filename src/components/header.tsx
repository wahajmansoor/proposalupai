
import { ProposalUpLogo } from '@/components/icons';
import { UserNav } from '@/components/user-nav';
import Link from 'next/link';
import { Button } from './ui/button';
import { LayoutDashboard, FolderKanban, MoreVertical, Archive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

export function Header() {
  const { user, loading } = useAuth();
  const navLinkClasses = "text-muted-foreground hover:text-primary transition-colors hover:bg-transparent focus-visible:bg-transparent";

  if (!user && !loading) {
    return (
       <header className="sticky top-0 z-40 w-full border-b bg-card">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex gap-1 items-center">
              <ProposalUpLogo className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Proposal Up</h1>
            </div>
            <Button asChild>
                <Link href="/login">Login</Link>
            </Button>
          </div>
       </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-1 items-center">
          <ProposalUpLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Proposal Up</h1>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Button variant="ghost" asChild className={navLinkClasses}>
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2" />
                Dashboard
              </Link>
            </Button>
             <Button variant="ghost" asChild className={navLinkClasses}>
              <Link href="/dashboard/proposals">
                <Archive className="mr-2" />
                Saved Proposals
              </Link>
            </Button>
            <Button variant="ghost" asChild className={navLinkClasses}>
              <Link href="/dashboard/portfolio">
                <FolderKanban className="mr-2" />
                Portfolio Collection
              </Link>
            </Button>
          </nav>

          {/* Mobile Navigation Dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                  <Link href="/dashboard/proposals">
                    <Archive className="mr-2 h-4 w-4" />
                    <span>Saved Proposals</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/portfolio">
                    <FolderKanban className="mr-2 h-4 w-4" />
                    <span>Portfolio Collection</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Nav (visible on all screen sizes) */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
