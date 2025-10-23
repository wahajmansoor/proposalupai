// src/app/dashboard/layout.tsx
import { DashboardClientLayout } from './client-layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
