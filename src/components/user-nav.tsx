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
import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';

export function UserNav() {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    // The AuthProvider will handle redirecting the user
  };

  if (loading) {
    return (
        <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-9 w-9 rounded-full" />
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative flex items-center gap-2 p-1 h-auto rounded-full">
          <div className="hidden sm:flex flex-col text-right">
              <span className="font-semibold text-sm leading-tight">{user.displayName}</span>
              <span className="text-xs text-muted-foreground leading-tight">{user.email}</span>
          </div>
          <Avatar className="h-9 w-9">
            {user.photoURL && (
              <AvatarImage src={user.photoURL} alt={user.displayName || 'User avatar'} />
            )}
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="font-medium leading-none">{user.displayName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile">Profile</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
