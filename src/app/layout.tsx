import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Outfit } from 'next/font/google';
import { Providers } from '@/components/providers';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { auth } from '@/auth';
import { OnboardingTour } from '@/components/onboarding-tour';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Proposal Up',
  description: 'Generate tailored proposals with the power of AI',
  icons: [
    {
      rel: 'icon',
      url: '/favicon-light.ico',
      media: '(prefers-color-scheme: light)',
      type: 'image/x-icon',
    },
    {
      rel: 'icon',
      url: '/favicon-dark.ico',
      media: '(prefers-color-scheme: dark)',
      type: 'image/x-icon',
    },
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        <Providers>
          {session && <OnboardingTour onboardingCompleted={!!(session.user as any)?.onboardingCompleted} />}
          {children}
          <Toaster />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
