"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProposalUpLogo } from "@/components/icons";
import { FilePlus2, Save, User, DollarSign, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Create Proposal", icon: FilePlus2 },
  { href: "/dashboard/proposals", label: "Saved Proposals", icon: Save },
  { href: "/dashboard/skill-profiles", label: "Skill Profiles", icon: User },
  { href: "/pricing", label: "Plans & Pricing", icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b p-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <ProposalUpLogo className="h-8 w-8" />
          <span className="">Proposal Up</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start gap-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === item.href && "bg-muted text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t p-2">
        <Button variant="ghost" className="w-full justify-start gap-3">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}