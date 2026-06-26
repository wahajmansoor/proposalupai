import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { CreditsButton } from '@/components/credits-button';
import { Sidebar } from '@/components/sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
async function SessionGuard({ userId, tokenSessionId, email }: { userId: string, tokenSessionId: string, email: string | null | undefined }) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentSessionId: true }
  });

  if (dbUser && dbUser.currentSessionId && tokenSessionId !== dbUser.currentSessionId) {
    console.log(`LAYOUT_LOCK: Session mismatch for ${email}. Redirecting to login.`);
    redirect('/login?error=ConcurrentLogin');
  }
  
  return null;
}

export default async function CreateProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      {session?.user?.id && (
        <Suspense fallback={null}>
          <SessionGuard 
            userId={session.user.id} 
            tokenSessionId={(session as any).sessionId} 
            email={session.user.email} 
          />
        </Suspense>
      )}
      
      <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950">
        <Sidebar collapsible="icon" />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <CreditsButton />
              <ThemeToggle />
              <UserNav />
            </div>
          </header>

          <main className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SessionProvider>
  );
}
