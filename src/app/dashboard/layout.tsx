import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';
import { SessionProvider } from 'next-auth/react';
import { OnboardingTour } from '@/components/onboarding-tour';
import { DeactivatedAccountBanner } from '@/components/deactivated-account-banner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Concurrent Session Guard (Server-side)
  let dbUser = null;
  if (session?.user?.id) {
    dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { currentSessionId: true, onboardingCompleted: true } as any
    });

    const tokenSessionId = (session as any).sessionId;
    
    if (dbUser && dbUser.currentSessionId && tokenSessionId !== dbUser.currentSessionId) {
      console.log(`LAYOUT_LOCK: Session mismatch for ${session.user.email}. Redirecting to login.`);
      redirect('/login?error=ConcurrentLogin');
    }
  }

  const onboardingCompleted = session?.user ? !!(session.user as any)?.onboardingCompleted : false;

  return (
    <SessionProvider session={session}>
      <OnboardingTour onboardingCompleted={onboardingCompleted} />
      <DeactivatedAccountBanner />
      <DashboardClient onboardingCompleted={Boolean(dbUser?.onboardingCompleted)}>
        {children}
      </DashboardClient>
    </SessionProvider>
  );
}
