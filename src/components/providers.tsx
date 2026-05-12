"use client";

import { ThemeProvider } from '@/components/theme-provider';
import NextAuthProvider from '@/components/next-auth-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NextAuthProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </NextAuthProvider>
    </ThemeProvider>
  );
}
