// src/app/subscription/layout.tsx
import DashboardLayout from '../dashboard/layout';

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
