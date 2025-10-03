"use client"

import { useState, useEffect } from 'react';
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AppUser } from "./users/actions";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

function getInitials(name: string | null | undefined) {
  if (!name) return "U";
  const names = name.split(" ");
  if (names.length > 1 && names[1]) {
    return `${names[0][0]}${names[names.length - 1][0]}`;
  }
  return name.substring(0, 2).toUpperCase();
}


export function NotificationBell({ recentUsers }: { recentUsers: AppUser[] }) {
    const [lastChecked, setLastChecked] = useState<string | null>(null);
    const [newUsersCount, setNewUsersCount] = useState(0);

    useEffect(() => {
        const storedLastChecked = localStorage.getItem('lastCheckedNotification');
        setLastChecked(storedLastChecked);

        if (storedLastChecked) {
            const newCount = recentUsers.filter(user => user.createdAt && new Date(user.createdAt) > new Date(storedLastChecked)).length;
            setNewUsersCount(newCount);
        } else {
            // If never checked, all recent users are new
            setNewUsersCount(recentUsers.length);
        }
    }, [recentUsers]);

    const handleOpenChange = (open: boolean) => {
        if (open) {
            const now = new Date().toISOString();
            localStorage.setItem('lastCheckedNotification', now);
            setNewUsersCount(0);
        }
    };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Bell className="h-5 w-5" />
          {newUsersCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{newUsersCount}</Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Recent Signups</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recentUsers.length > 0 ? (
            recentUsers.map(user => (
                 <DropdownMenuItem key={user.id} asChild>
                    <Link href={`/admin-portal/users`} className="flex items-center gap-3 cursor-pointer">
                         <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium">{user.name} joined</p>
                            <p className="text-xs text-muted-foreground">
                                {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'N/A'}
                            </p>
                        </div>
                    </Link>
                </DropdownMenuItem>
            ))
        ) : (
             <DropdownMenuItem disabled>
                <p className="text-sm text-muted-foreground text-center w-full py-4">No new notifications</p>
            </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
