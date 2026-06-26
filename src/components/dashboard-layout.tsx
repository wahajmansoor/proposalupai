import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';
import { SessionProvider } from 'next-auth/react';
import { OnboardingTour } from '@/components/onboarding-tour';
import { DeactivatedAccountBanner } from '@/components/deactivated-account-banner';
import { Suspense } from 'react';

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Read from session profile, avoiding duplicate DB query in the layout root
  const onboardingCompleted = session?.user && (session.user as any).profile?.onboardingCompleted;

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
      <OnboardingTour onboardingCompleted={Boolean(onboardingCompleted)} />
      <DeactivatedAccountBanner />
      <DashboardClient onboardingCompleted={Boolean(onboardingCompleted)}>
        {children}
      </DashboardClient>
    </SessionProvider>
  );
}
