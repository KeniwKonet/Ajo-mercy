import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function AlajoDashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("alajo");

  return (
    <DashboardShell
      roleLabel="Alajo"
      userName={profile.full_name}
      groups={[
        {
          items: [
            { href: "/dashboard/alajo", label: "Overview", exact: true },
            { href: "/dashboard/alajo/application", label: "My application" },
            { href: "/dashboard/alajo/profile", label: "Public profile" },
          ],
        },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
