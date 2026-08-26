import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function BrandDashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("brand");

  return (
    <DashboardShell
      roleLabel="Brand"
      userName={profile.full_name}
      groups={[
        {
          items: [
            { href: "/dashboard/brand", label: "Overview", exact: true },
            { href: "/dashboard/brand/campaigns", label: "Campaigns" },
            { href: "/alajos", label: "Browse businesses" },
          ],
        },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
