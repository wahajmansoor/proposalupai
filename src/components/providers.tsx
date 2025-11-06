
"use client";

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FirebaseErrorListener } from './FirebaseErrorListener';

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
          <FirebaseErrorListener />
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
