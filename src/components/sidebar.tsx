// src/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { signOut } from "firebase/auth";
import { HugeiconsIcon } from '@hugeicons/react';
import { FileEditIcon, BookmarkIcon, Profile02Icon, CreditCardIcon, Logout01Icon, CreditCardValidationIcon, UserSettings01Icon } from "@hugeicons/core-free-icons";
import { auth } from "@/lib/firebase/config";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar";
import {
  FilePlus,
  Bookmark,
  User,
  CreditCard,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";
import { ProposalUpLogos } from "./icons";


const navItems = [
  { href: "/dashboard", label: "Create Proposal", icon: FileEditIcon },
  { href: "/dashboard/proposals", label: "Saved Proposals", icon: BookmarkIcon },
  { href: "/dashboard/skill-profiles", label: "Skill Profiles", icon: Profile02Icon },
  { href: "/pricing", label: "Plans & Pricing", icon: CreditCardIcon },
];

function SidebarNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  
  const handleLogout = async () => {
    // Clear session cookie on the server
    await fetch('/api/auth/session', { method: 'DELETE' });
    // Sign out from Firebase client-side
    await signOut(auth);
  };
  
  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-0 font-semibold group-data-[collapsible=icon]:justify-center">
          <ProposalUpLogos className="h-10 w-10 text-primary group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 transition-all" />
          <span className="whitespace-nowrap text-2xl font-bold origin-left transition-all duration-200 ease-in-out group-data-[collapsible=icon]:scale-x-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">Proposal Up</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  onClick={handleLinkClick}
                  isActive={
                    item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
                  }
                  tooltip={item.label}
                >
                  <HugeiconsIcon icon={item.icon} size={24} className="h-6 w-6" />
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
                    onClick={handleLinkClick}
                    isActive={pathname.startsWith('/profile')}
                    tooltip="General Profile"
                    >
                    <HugeiconsIcon icon={UserSettings01Icon} size={24} className="h-6 w-6"/>
                    <span>General Profile</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/subscription" legacyBehavior passHref>
                    <SidebarMenuButton
                    onClick={handleLinkClick}
                    isActive={pathname.startsWith('/subscription')}
                    tooltip="Subscription"
                    >
                    <HugeiconsIcon icon={CreditCardValidationIcon} size={24} className="h-6 w-6"/>
                    <span>Subscription</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <form action={handleLogout} className="w-full">
                <SidebarMenuButton
                  tooltip="Logout"
                  className="w-full"
                >
                  <HugeiconsIcon icon={Logout01Icon} size={24} className="h-6 w-6"/>
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
