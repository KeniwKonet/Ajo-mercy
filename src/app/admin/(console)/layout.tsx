import { requireStaff } from "@/lib/auth";
import { getDashboardCounts } from "@/lib/data/admin";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { DashboardShell, type NavGroup } from "@/components/dashboard/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  const counts = await getDashboardCounts();

  // The nav is built from permissions, so a reviewer never sees a link to a
  // page they would be bounced from.
  const groups: NavGroup[] = [
    {
      items: [
        { href: "/admin", label: "Dashboard", exact: true },
        {
          href: "/admin/alajos",
          label: "Applications",
          badge: counts.pending_alajo_reviews,
        },
      ],
    },
    {
      heading: "Review",
      items: [
        ...(can(profile, "supporter.review")
          ? [{ href: "/admin/supporters", label: "Supporters", badge: counts.pending_supporter_reviews }]
          : []),
        ...(can(profile, "brand.review")
          ? [{ href: "/admin/brands", label: "Brands", badge: counts.pending_brand_reviews }]
          : []),
        ...(can(profile, "campaign.review_selections")
          ? [{ href: "/admin/selections", label: "Selections", badge: counts.unreviewed_selections }]
          : []),
        ...(can(profile, "confirmation.create")
          ? [{ href: "/admin/confirmations", label: "Support", badge: counts.pending_confirmations }]
          : []),
        ...(can(profile, "campaign.manage")
          ? [{ href: "/admin/campaigns", label: "Campaigns", badge: counts.active_campaigns }]
          : []),
      ],
    },
    {
      heading: "Operations",
      items: [
        ...(can(profile, "email.view")
          ? [{ href: "/admin/emails", label: "Email", badge: counts.email_failures }]
          : []),
        ...(can(profile, "audit.view") ? [{ href: "/admin/audit", label: "Audit log" }] : []),
        ...(can(profile, "staff.manage") ? [{ href: "/admin/staff", label: "Team" }] : []),
      ],
    },
  ].filter((group) => group.items.length > 0);

  return (
    <DashboardShell
      roleLabel={ROLE_LABELS[profile.role]}
      userName={profile.full_name}
      groups={groups}
      homeHref="/admin"
    >
      {children}
    </DashboardShell>
  );
}
