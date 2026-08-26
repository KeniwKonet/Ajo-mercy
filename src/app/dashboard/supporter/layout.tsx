import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function SupporterDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("supporter");

  return (
    <DashboardShell
      roleLabel="Supporter"
      userName={profile.full_name}
      groups={[
        {
          items: [
            { href: "/dashboard/supporter", label: "Overview", exact: true },
            { href: "/dashboard/supporter/selections", label: "My selections" },
            { href: "/alajos", label: "Browse businesses" },
          ],
        },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
