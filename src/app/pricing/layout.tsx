// src/app/pricing/layout.tsx
import DashboardLayout from '../dashboard/layout';

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
