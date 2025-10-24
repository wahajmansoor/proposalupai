// src/app/subscription/layout.tsx
import DashboardLayout from "@/app/dashboard/layout";

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
