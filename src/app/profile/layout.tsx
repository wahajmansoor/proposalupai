// src/app/profile/layout.tsx
import DashboardLayout from '../dashboard/layout';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
