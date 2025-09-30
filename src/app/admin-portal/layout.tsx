
import { getAdminSession } from '@/app/login/actions';
import { redirect } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarTrigger, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import { Home, Users, LogOut, PanelLeft } from 'lucide-react';
import { ProposalUpLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { adminLogout } from '@/app/login/actions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  
  if (!session) {
    redirect('/admin-login');
  }

  const handleLogout = async () => {
    'use server';
    await adminLogout();
    redirect('/admin-login');
  }

  return (
    <SidebarProvider>
        <div className="flex min-h-screen">
            <Sidebar side="left" className="w-64 bg-gray-800 text-white flex-shrink-0">
                <SidebarContent className="p-0">
                    <SidebarHeader className="p-4 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            <ProposalUpLogo className="h-8 w-8 text-primary" />
                            <h2 className="font-semibold text-lg">Admin Panel</h2>
                        </div>
                    </SidebarHeader>
                    <SidebarMenu className="flex-1 p-4">
                        <SidebarMenuItem>
                            <SidebarMenuButton href="/admin-portal" className="text-white hover:bg-gray-700">
                                <Home />
                                <span>Dashboard</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton href="/admin-portal/users" className="text-white hover:bg-gray-700">
                                <Users />
                                <span>Users</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                    <SidebarFooter className="p-4 border-t border-gray-700">
                        <form action={handleLogout} className="w-full">
                            <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-700 hover:text-white">
                                <LogOut className="mr-2" />
                                Logout
                            </Button>
                        </form>
                    </SidebarFooter>
                </SidebarContent>
            </Sidebar>
            <div className="flex-1 flex flex-col">
                 <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <SidebarTrigger className="md:hidden">
                        <PanelLeft />
                        <span className="sr-only">Toggle Menu</span>
                    </SidebarTrigger>
                </header>
                <main className="flex-1 p-6 bg-muted/40">
                    {children}
                </main>
            </div>
        </div>
    </SidebarProvider>
  );
}
