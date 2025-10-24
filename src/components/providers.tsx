
"use client";

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';
import { SidebarProvider } from '@/components/ui/sidebar';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
