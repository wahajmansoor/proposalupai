// src/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { HugeiconsIcon } from '@hugeicons/react';
import { FileEditIcon, BookmarkIcon, Profile02Icon, CreditCardIcon, Logout01Icon, CreditCardValidationIcon, UserSettings01Icon, SecurityCheckIcon } from "@hugeicons/core-free-icons";
import { isAdmin as checkAdmin } from "@/lib/utils";
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
import { ProposalUpLogos } from "./icons";


const navItems = [
  { href: "/dashboard", label: "Create Proposal", icon: FileEditIcon },
  { href: "/dashboard/proposals", label: "Saved Proposals", icon: BookmarkIcon },
  { href: "/dashboard/skill-profiles", label: "Skill Profiles", icon: Profile02Icon },
  { href: "/dashboard/pricing", label: "Plans & Pricing", icon: CreditCardIcon },
];

function SidebarNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { data: session } = useSession();
  const isAdminUser = checkAdmin(session?.user?.email);

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
            <SidebarMenuItem
              key={item.href}
              id={
                item.href === '/dashboard/skill-profiles' ? 'tour-sidebar-profiles' :
                  item.href === '/dashboard/pricing' ? 'tour-sidebar-pricing' :
                    undefined
              }
            >
              <Link href={item.href}>
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
          {isAdminUser && (
            <SidebarMenuItem>
              <Link href="/admin-portal">
                <SidebarMenuButton
                  onClick={handleLinkClick}
                  isActive={pathname.startsWith('/admin-portal')}
                  tooltip="Admin Portal"
                  className="text-primary hover:text-primary/90"
                >
                  <HugeiconsIcon icon={SecurityCheckIcon} size={24} className="h-6 w-6" />
                  <span className="font-bold">Admin Portal</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem id="tour-sidebar-general">
            <Link href="/profile">
              <SidebarMenuButton
                onClick={handleLinkClick}
                isActive={pathname.startsWith('/profile')}
                tooltip="General Profile"
              >
                <HugeiconsIcon icon={UserSettings01Icon} size={24} className="h-6 w-6" />
                <span>General Profile</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem id="tour-sidebar-subscription">
            <Link href="/subscription">
              <SidebarMenuButton
                onClick={handleLinkClick}
                isActive={pathname.startsWith('/subscription')}
                tooltip="Subscription"
              >
                <HugeiconsIcon icon={CreditCardValidationIcon} size={24} className="h-6 w-6" />
                <span>Subscription</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
<SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.href = '/';
              }}
              tooltip="Logout"
              className="w-full"
            >
              <HugeiconsIcon icon={Logout01Icon} size={24} className="h-6 w-6" />
              <span>Logout</span>
            </SidebarMenuButton>
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
