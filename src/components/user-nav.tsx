
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { ChevronDown, CreditCard, LogOut, User, Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession, signOut } from 'next-auth/react';

import { HugeiconsIcon } from '@hugeicons/react';
import { Logout01Icon, CreditCardValidationIcon, UserSettings01Icon } from "@hugeicons/core-free-icons";
import { Badge } from './ui/badge';


export function UserNav() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const user = session?.user;
  const userProfile = user?.profile;
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="hidden sm:flex flex-col gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Button asChild>
        <Link href="/login">Login</Link>
      </Button>
    );
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = user.name;
  const photoURL = user.image;
  const email = user.email;
  const isPremium = userProfile?.subscriptionStatus === 'active';


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative flex items-center gap-2 p-1 h-auto rounded-full border border-transparent hover:border-border focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0">
          <Avatar className="h-9 w-9">
            {photoURL && (
              <AvatarImage src={photoURL} alt={displayName || 'User avatar'} />
            )}
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-semibold text-sm leading-tight text-foreground">{displayName}</span>
            {isPremium && (
              <Badge variant="premium" className="px-1.5 py-0 h-auto justify-start w-fit">
                <Star className="mr-1 h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="font-medium leading-none">{displayName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {email}
            </p>
            {isPremium && (
              <Badge variant="premium" className="mt-2 w-fit">
                <Star className="mr-1 h-3 w-3" />
                Premium Plan
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <HugeiconsIcon icon={UserSettings01Icon} size={24} className="mr-2 h-4 w-4" />
              General Profile
            </Link>
          </DropdownMenuItem>
          {userProfile?.paddleCustomerId && (
            <DropdownMenuItem asChild>
              <Link href="/subscription">
                <HugeiconsIcon icon={CreditCardValidationIcon} size={24} className="mr-2 h-4 w-4" />
                Subscription
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => {
          await signOut({ callbackUrl: '/login' });
        }}>
          <HugeiconsIcon icon={Logout01Icon} size={24} className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
