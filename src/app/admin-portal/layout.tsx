
import Link from 'next/link';
import { getAdminSession } from '@/app/login/actions';
import { redirect } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarTrigger, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import { Home, Users, LogOut, PanelLeft } from 'lucide-react';
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
        <div className="group flex min-h-screen w-full bg-muted/40">
            <Sidebar side="left" className="hidden shrink-0 md:flex md:flex-col" collapsible="icon">
                <SidebarContent className="flex h-full max-h-screen flex-col gap-2 bg-gray-900 text-white overflow-hidden">
                    <SidebarHeader className="flex h-14 items-start justify-start border-b border-gray-800 px-4 lg:h-[60px] lg:px-6">
                        <Link href="/admin-portal" className="flex items-start gap-2 font-semibold text-white whitespace-nowrap">
                            <span className="text-2xl">Admin Panel</span>
                        </Link>
                    </SidebarHeader>
                    <div className="flex-1 overflow-y-auto">
                        <SidebarMenu className="px-2 py-4 text-sm font-medium lg:px-4">
                            <SidebarMenuItem>
                                <Link href="/admin-portal" className="w-full">
                                    <SidebarMenuButton className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 whitespace-nowrap" tooltip="Dashboard">
                                        <Home />
                                        <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link href="/admin-portal/users" className="w-full">
                                    <SidebarMenuButton className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 whitespace-nowrap" tooltip="Users">
                                        <Users />
                                        <span className="group-data-[collapsible=icon]:hidden">Users</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </div>
                     <SidebarFooter className="mt-auto p-4 border-t border-gray-800">
                        <form action={handleLogout} className="w-full">
                            <SidebarMenuButton asChild className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 whitespace-nowrap" tooltip="Logout">
                                <button type="submit" className="w-full">
                                    <LogOut />
                                    <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                                </button>
                            </SidebarMenuButton>
                        </form>
                    </SidebarFooter>
                </SidebarContent>
            </Sidebar>
            <div className="flex flex-1 flex-col">
                 <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 z-10">
                    <SidebarTrigger className="shrink-0 md:hidden">
                        <PanelLeft />
                        <span className="sr-only">Toggle Menu</span>
                    </SidebarTrigger>
                    <div className="w-full flex-1">
                       {/* You can add breadcrumbs or search here if needed */}
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
                    {children}
                </main>
            </div>
        </div>
    </SidebarProvider>
  );
}
