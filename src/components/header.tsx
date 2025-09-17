import { ProposalUpLogo } from '@/components/icons';
import { UserNav } from '@/components/user-nav';
import Link from 'next/link';
import { Button } from './ui/button';
import { LayoutDashboard, FolderKanban, PanelRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-1 items-center">
          <ProposalUpLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Proposal Up</h1>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
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

        {/* Mobile Navigation */}
        <div className="flex md:hidden flex-1 items-center justify-end">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-transparent">
                <PanelRight className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px]">
              <nav className="flex flex-col space-y-4 mt-8">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
                  <LayoutDashboard />
                  Dashboard
                </Link>
                <Link href="/dashboard/portfolio" className="flex items-center gap-2 text-lg font-semibold">
                  <FolderKanban />
                  Portfolio
                </Link>
                 <div className="absolute bottom-4 left-4">
                  <UserNav />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
