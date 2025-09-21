
import { ProposalUpLogo } from '@/components/icons';
import { UserNav } from '@/components/user-nav';
import Link from 'next/link';
import { Button } from './ui/button';
import { useAuth } from '@/context/auth-context';

export function Header() {
  const { user, loading } = useAuth();

  if (!user && !loading) {
    return (
       <header className="sticky top-0 z-40 w-full border-b bg-background">
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
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex gap-1 items-center">
          <ProposalUpLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Proposal Up</h1>
        </div>

        <div className="flex items-center justify-end">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
