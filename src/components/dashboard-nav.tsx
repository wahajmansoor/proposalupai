"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FilePlus2, FolderKanban, Save, User, CreditCard, DollarSign } from "lucide-react";

const leftNavItems = [
  { href: "/dashboard", label: "Create Proposal", icon: FilePlus2 },
  { href: "/dashboard/proposals", label: "Saved Proposals", icon: Save },
  { href: "/dashboard/portfolio", label: "Portfolio Collections", icon: FolderKanban },
];

const rightNavItems = [
  { href: "/pricing", label: "Plans & Pricing", icon: DollarSign },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { href: "/profile", label: "General Profile", icon: User },
];

export function DashboardNav() {
  const pathname = usePathname();

  const renderNavItems = (items: typeof leftNavItems) => {
    return items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-2 py-3 px-2 sm:px-3 border-b-2 text-sm font-medium transition-colors",
          pathname === item.href
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <item.icon className="h-5 w-5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">{item.label}</span>
      </Link>
    ));
  };

  return (
    <div className="border-b bg-white">
        <div className="container mx-auto">
            <nav className="flex items-center justify-between -mb-px">
                <div className="flex items-center justify-start sm:gap-2">
                    {renderNavItems(leftNavItems)}
                </div>
                <div className="flex items-center justify-end sm:gap-2">
                    {renderNavItems(rightNavItems)}
                </div>
            </nav>
        </div>
    </div>
  );
}
