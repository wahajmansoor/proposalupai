import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProposalUpLogos } from '@/components/icons';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <ProposalUpLogos className="h-16 w-16 mb-8 text-primary" />
      <h2 className="text-2xl font-bold tracking-tight mb-2">404 - Page Not Found</h2>
      <p className="text-muted-foreground mb-8 text-center">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}
