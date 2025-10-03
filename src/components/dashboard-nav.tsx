"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FilePlus2, FolderKanban, Save, User, CreditCard } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Create Proposal", icon: FilePlus2 },
  { href: "/dashboard/proposals", label: "Saved Proposals", icon: Save },
  { href: "/dashboard/portfolio", label: "Portfolio Collections", icon: FolderKanban },
  { href: "/pricing", label: "Plans & Pricing", icon: CreditCard },
  { href: "/profile", label: "General Profile", icon: User },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="border-b bg-white">
        <div className="container mx-auto">
            <nav className="flex items-center justify-around sm:justify-start sm:gap-2 -mb-px">
                {navItems.map((item) => (
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
                ))}
            </nav>
        </div>
    </div>
  );
}
