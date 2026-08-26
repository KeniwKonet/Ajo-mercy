import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { listStaff } from "@/lib/data/admin";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, StatusChip } from "@/components/ui/primitives";
import { StaffPermissions } from "./staff-permissions";
import { permissionsFor, ROLE_LABELS, type Permission } from "@/lib/rbac";
import { formatRelative } from "@/lib/format";
import type { UserRole } from "@/lib/types";

export const metadata: Metadata = { title: "Team", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requirePermission("staff.manage");
  const staff = await listStaff();

  return (
    <DashboardPage
      title="Team"
      description="Who can review and approve, and exactly what each of them is allowed to do."
    >
      <div className="space-y-8">
        <Alert tone="neutral" title="How access works">
          A role sets the default permissions. Individual permissions can be granted or withheld on
          top of that, so a reviewer can be trusted with approvals without becoming an admin. Only
          the super admin can change these, and the database enforces that separately.
        </Alert>

        <ul className="grid-rules border-t border-rule">
          {staff.map((member) => {
            const defaults = permissionsFor(member.role as UserRole);
            const overrides = Object.entries(member.permissions ?? {}) as Array<[Permission, boolean]>;

            return (
              <li key={member.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-medium text-ink">{member.full_name}</p>
                      <StatusChip tone={member.role === "super_admin" ? "feature" : "neutral"}>
                        {ROLE_LABELS[member.role as UserRole]}
                      </StatusChip>
                      {member.status !== "approved" && (
                        <StatusChip tone="negative">{member.status}</StatusChip>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {member.email}
                      {member.last_seen_at ? ` · last seen ${formatRelative(member.last_seen_at)}` : ""}
                    </p>
                  </div>

                  {member.role !== "super_admin" && (
                    <StaffPermissions
                      userId={member.id}
                      name={member.full_name}
                      role={member.role as "admin" | "reviewer"}
                      permissions={member.permissions ?? {}}
                    />
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {defaults.map((permission) => {
                    const override = member.permissions?.[permission];
                    const active = override ?? true;
                    return (
                      <span
                        key={permission}
                        className={`font-mono text-2xs ${
                          active ? "text-ink-soft" : "text-ink-faint line-through"
                        }`}
                      >
                        {permission}
                      </span>
                    );
                  })}
                  {overrides
                    .filter(([permission, granted]) => granted && !defaults.includes(permission))
                    .map(([permission]) => (
                      <span key={permission} className="font-mono text-2xs font-medium text-terracotta">
                        +{permission}
                      </span>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-rule pt-5 text-xs leading-relaxed text-ink-faint">
          To add someone, have them register normally, then change their role here. The super admin
          seat cannot be reassigned from this page.
        </p>
      </div>
    </DashboardPage>
  );
}
