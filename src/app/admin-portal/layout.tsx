
import Link from 'next/link';
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
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <Sidebar side="left" className="hidden border-r bg-gray-900 text-white md:block">
                <SidebarContent className="flex h-full max-h-screen flex-col gap-2">
                    <SidebarHeader className="flex h-14 items-center border-b border-gray-800 px-4 lg:h-[60px] lg:px-6">
                        <Link href="/admin-portal" className="flex items-center gap-2 font-semibold text-white">
                            <ProposalUpLogo className="h-6 w-6 text-primary" />
                            <span className="">Admin Panel</span>
                        </Link>
                    </SidebarHeader>
                    <div className="flex-1">
                        <SidebarMenu className="px-2 py-4 text-sm font-medium text-gray-300 lg:px-4">
                            <SidebarMenuItem>
                                <Link href="/admin-portal" className="w-full">
                                    <SidebarMenuButton className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
                                        <Home className="mr-2 h-4 w-4" />
                                        Dashboard
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link href="/admin-portal/users" className="w-full">
                                    <SidebarMenuButton className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
                                        <Users className="mr-2 h-4 w-4" />
                                        Users
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </div>
                     <SidebarFooter className="mt-auto p-4 border-t border-gray-800">
                        <form action={handleLogout} className="w-full">
                            <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </form>
                    </SidebarFooter>
                </SidebarContent>
            </Sidebar>
            <div className="flex flex-col">
                 <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
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
