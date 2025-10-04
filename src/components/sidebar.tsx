// src/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProposalUpLogo } from "@/components/icons";
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


const navItems = [
  { href: "/dashboard", label: "Create Proposal", icon: FilePlus },
  { href: "/dashboard/proposals", label: "Saved Proposals", icon: Bookmark },
  { href: "/dashboard/skill-profiles", label: "Skill Profiles", icon: User },
  { href: "/pricing", label: "Plans & Pricing", icon: CreditCard },
];

function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const handleLogout = async () => {
    // Clear session cookie on the server
    await fetch('/api/auth/session', { method: 'DELETE' });
    // Sign out from Firebase client-side
    await signOut(auth);
  };

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <ProposalUpLogo className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Proposal Up</span>
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
      {user && (
        <SidebarFooter>
           <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base p-3" onClick={handleLogout}>
            <LogOut className="h-6 w-6" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </Button>
        </SidebarFooter>
      )}
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
