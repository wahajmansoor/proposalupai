
// This layout is now handled by the logic in DashboardClient.
// We keep it to avoid Next.js errors, but it just passes children through.
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
