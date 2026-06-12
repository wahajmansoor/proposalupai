
"use client"

import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "./notification-bell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { adminLogout } from "@/app/login/actions";
import type { AppUser } from "./users/actions";

export function AdminHeader({ recentUsers }: { recentUsers: AppUser[] }) {
    return (
        <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell recentUsers={recentUsers} />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full bg-background dark:hover:bg-background">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="dark:bg-background">PU</AvatarFallback>
                        </Avatar>
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Proposal Up Admin</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-background"/>
                    <form action={adminLogout}>
                        <DropdownMenuItem asChild>
                            <button type="submit" className="w-full dark:hover:bg-background">Logout</button>
                        </DropdownMenuItem>
                    </form>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
