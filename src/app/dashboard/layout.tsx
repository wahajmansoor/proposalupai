// src/app/dashboard/layout.tsx
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Concurrent Session Guard (Server-side)
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { currentSessionId: true }
    });

    const tokenSessionId = (session as any).sessionId;
    
    if (dbUser && dbUser.currentSessionId && tokenSessionId !== dbUser.currentSessionId) {
      console.log(`LAYOUT_LOCK: Session mismatch for ${session.user.email}. Redirecting to login.`);
      redirect('/login?error=ConcurrentLogin');
    }
  }

  return <DashboardClient>{children}</DashboardClient>;
}
