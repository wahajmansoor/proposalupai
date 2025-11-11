"use client"

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "./notification-bell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { adminLogout } from "@/app/login/actions";
import type { AppUser } from "./users/actions";

export function AdminHeader({ recentUsers }: { recentUsers: AppUser[] }) {
    return (
        <TooltipProvider>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <NotificationBell recentUsers={recentUsers} />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>PU</AvatarFallback>
                            </Avatar>
                            <span className="sr-only">Toggle user menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Proposal Up Admin</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <form action={adminLogout}>
                            <DropdownMenuItem asChild>
                                <button type="submit" className="w-full">Logout</button>
                            </DropdownMenuItem>
                        </form>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </TooltipProvider>
    );
}
