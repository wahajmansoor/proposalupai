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
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import { PanelLeft, LogOut, FilePlus, Bookmark, User, CreditCard } from "lucide-react";


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
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b p-4 h-16">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <ProposalUpLogo className="h-8 w-8" />
          <span className="text-lg font-bold">Proposal Up</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start gap-1 px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary",
                pathname.startsWith(item.href) && item.href !== '/dashboard' ? "bg-muted text-primary" : pathname === '/dashboard' && item.href === '/dashboard' ? "bg-muted text-primary" : ""
              )}
            >
              <item.icon className="h-6 w-6" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {user && (
        <div className="mt-auto border-t p-4">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
            <LogOut className="h-6 w-6" />
            Logout
          </Button>
        </div>
      )}
    </div>
  )
}


export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[290px]">
          <SidebarNav />
        </SheetContent>
      </Sheet>
      
      {/* Desktop Sidebar */}
      <aside className="fixed top-0 left-0 z-50 h-full flex-col border-r border-border bg-background text-foreground transition-all duration-300 ease-in-out hidden md:flex w-[290px] -translate-x-full md:translate-x-0">
        <SidebarNav />
      </aside>

       {/* Button to toggle mobile sidebar */}
       <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
          >
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
      </div>
    </>
  );
}
