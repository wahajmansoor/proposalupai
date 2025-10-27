// src/app/pricing/layout.tsx
import { DashboardClient } from '../dashboard/dashboard-client';

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClient>{children}</DashboardClient>;
}
