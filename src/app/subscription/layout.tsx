// src/app/subscription/layout.tsx
import { DashboardClientLayout } from '@/app/dashboard/client-layout';

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
