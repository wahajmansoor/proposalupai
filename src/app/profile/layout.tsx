// src/app/profile/layout.tsx
import { DashboardClientLayout } from '@/app/dashboard/client-layout';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
