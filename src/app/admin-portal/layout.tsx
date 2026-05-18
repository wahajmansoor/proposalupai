import Link from 'next/link';
import { getAdminSession, adminLogout } from '@/app/login/actions';
import { redirect } from 'next/navigation';
import { Home, Users, LogOut, PanelLeft, Ticket, Search, Bell, UserCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { getUsers } from './users/actions';
import { AdminHeader } from './admin-header';

function SidebarNav() {
  return (
    <nav className="flex flex-col h-full text-sm font-medium">
      <div className="flex-1">
        <div className="px-4 py-6">
          <Link href="/admin-portal" className="flex items-center gap-2 font-semibold">
            <span className="text-xl font-bold">Proposal Up Admin</span>
          </Link>
        </div>
        <div className="px-3 py-4 space-y-1">
          <Link
            href="/admin-portal"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/admin-portal/users"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
          >
            <Users className="h-4 w-4" />
            Users
          </Link>
          <Link
            href="/admin-portal/discounts"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
          >
            <Ticket className="h-4 w-4" />
            Discounts
          </Link>
          <Link
            href="/admin-portal/featured"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
          >
            <Star className="h-4 w-4" />
            Featured
          </Link>
        </div>
      </div>
      <div className="mt-auto p-4 border-t border-border">
        <form action={adminLogout}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </form>
      </div>
    </nav>
  )
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin-login');
  }

  const allUsers = await getUsers();
  const recentUsers = allUsers
    .filter(u => u.createdAt)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);


  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <SidebarNav />
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
              <SidebarNav />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">

          </div>
          <AdminHeader recentUsers={recentUsers} />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
