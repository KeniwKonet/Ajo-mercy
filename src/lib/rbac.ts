import type { Profile, UserRole } from "@/lib/types";

/**
 * Capability model. Roles map to a default capability set; individual staff
 * accounts can be widened or narrowed through `profiles.permissions`, which is
 * why every check goes through `can()` rather than comparing roles inline.
 */
export const PERMISSIONS = [
  "alajo.review",
  "alajo.approve",
  "alajo.reject",
  "alajo.request_info",
  "alajo.feature",
  "alajo.suspend",
  "supporter.review",
  "brand.review",
  "campaign.manage",
  "campaign.review_selections",
  "confirmation.create",
  "confirmation.confirm",
  "confirmation.announce",
  "email.view",
  "email.retry",
  "audit.view",
  "announcement.manage",
  "staff.manage",
  "analytics.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const REVIEWER_PERMISSIONS: Permission[] = [
  "alajo.review",
  "alajo.request_info",
  "supporter.review",
  "brand.review",
  "audit.view",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...REVIEWER_PERMISSIONS,
  "alajo.approve",
  "alajo.reject",
  "alajo.feature",
  "alajo.suspend",
  "campaign.manage",
  "campaign.review_selections",
  "confirmation.create",
  "confirmation.confirm",
  "email.view",
  "email.retry",
  "announcement.manage",
  "analytics.view",
];

const ROLE_DEFAULTS: Record<UserRole, Permission[]> = {
  super_admin: [...PERMISSIONS],
  admin: ADMIN_PERMISSIONS,
  reviewer: REVIEWER_PERMISSIONS,
  alajo: [],
  supporter: [],
  brand: [],
};

export const STAFF_ROLES: UserRole[] = ["super_admin", "admin", "reviewer"];

export function isStaff(profile: Pick<Profile, "role" | "status"> | null): boolean {
  return Boolean(profile && STAFF_ROLES.includes(profile.role) && profile.status === "approved");
}

export function isSuperAdmin(profile: Pick<Profile, "role" | "status"> | null): boolean {
  return Boolean(profile && profile.role === "super_admin" && profile.status === "approved");
}

/**
 * A per-account override wins over the role default in both directions, so a
 * reviewer can be granted `alajo.approve` and an admin can have `alajo.reject`
 * withheld without inventing new roles.
 */
export function can(
  profile: Pick<Profile, "role" | "status" | "permissions"> | null,
  permission: Permission,
): boolean {
  if (!profile || profile.status !== "approved") return false;
  const override = profile.permissions?.[permission];
  if (typeof override === "boolean") return override;
  return ROLE_DEFAULTS[profile.role].includes(permission);
}

export function permissionsFor(role: UserRole): Permission[] {
  return ROLE_DEFAULTS[role];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  reviewer: "Reviewer",
  alajo: "Alajo",
  supporter: "Supporter",
  brand: "Brand",
};

/** Where each role lands after signing in. */
export function homeFor(profile: Pick<Profile, "role"> | null): string {
  switch (profile?.role) {
    case "super_admin":
    case "admin":
    case "reviewer":
      return "/admin";
    case "alajo":
      return "/dashboard/alajo";
    case "brand":
      return "/dashboard/brand";
    case "supporter":
      return "/dashboard/supporter";
    default:
      return "/";
  }
}
