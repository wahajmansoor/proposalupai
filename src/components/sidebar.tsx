// src/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter
} from "@/components/ui/sidebar";
import {
  FilePlus,
  Bookmark,
  User,
  CreditCard,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";
import { ProposalUpLogo } from "./icons";


const navItems = [
  { href: "/dashboard", label: "Create Proposal", icon: FilePlus },
  { href: "/dashboard/proposals", label: "Saved Proposals", icon: Bookmark },
  { href: "/dashboard/skill-profiles", label: "Skill Profiles", icon: User },
  { href: "/pricing", label: "Plans & Pricing", icon: CreditCard },
];

function SidebarNav() {
  const pathname = usePathname();
  
  const handleLogout = async () => {
    // Clear session cookie on the server
    await fetch('/api/auth/session', { method: 'DELETE' });
    // Sign out from Firebase client-side
    await signOut(auth);
  };

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold group-data-[collapsible=icon]:justify-center">
          <ProposalUpLogo className="h-8 w-8 text-primary group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12" />
          <span className="text-2xl font-bold group-data-[collapsible=icon]:hidden">Proposal Up</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={
                    item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
                  }
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
       <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/profile" legacyBehavior passHref>
                    <SidebarMenuButton
                    isActive={pathname.startsWith('/profile')}
                    tooltip="General Profile"
                    >
                    <User />
                    <span>General Profile</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/subscription" legacyBehavior passHref>
                    <SidebarMenuButton
                    isActive={pathname.startsWith('/subscription')}
                    tooltip="Subscription"
                    >
                    <CreditCard />
                    <span>Subscription</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <form action={handleLogout} className="w-full">
                <SidebarMenuButton
                  variant="destructive"
                  tooltip="Logout"
                  className="w-full"
                >
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </form>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}


export function Sidebar({ collapsible, ...props }: { collapsible?: "icon" | "offcanvas" | "none" }) {
  return (
    <SidebarPrimitive collapsible={collapsible} {...props}>
      <SidebarNav />
    </SidebarPrimitive>
  );
}
