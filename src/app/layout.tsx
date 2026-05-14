
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Outfit } from 'next/font/google';
import { Providers } from '@/components/providers';
import { SpeedInsights } from '@vercel/speed-insights/next';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
