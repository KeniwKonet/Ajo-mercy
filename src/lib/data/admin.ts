import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { safeRead } from "@/lib/data/safe";
import type { AdminDashboardCounts } from "@/lib/supabase/database.types";
import type {
  AuditLog,
  BrandProfile,
  BusinessCategory,
  EmailEvent,
  SelectionStatus,
  SupportCampaign,
  SupportConfirmation,
  SupporterProfile,
} from "@/lib/types";

const EMPTY_COUNTS: AdminDashboardCounts = {
  pending_alajo_reviews: 0,
  alajo_awaiting_resubmission: 0,
  pending_supporter_reviews: 0,
  pending_brand_reviews: 0,
  pending_confirmations: 0,
  unreviewed_selections: 0,
  active_campaigns: 0,
  email_failures: 0,
  live_profiles: 0,
  suspended_profiles: 0,
  total_supporters: 0,
  total_brands: 0,
  support_confirmed_total: 0,
  businesses_supported: 0,
};

/** Single round trip for every number the dashboard leads with. */
export async function getDashboardCounts(): Promise<AdminDashboardCounts> {
  return safeRead(
    "getDashboardCounts",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin.rpc("admin_dashboard_counts");
      if (error) throw new Error(error.message);
      return (data as unknown as AdminDashboardCounts) ?? EMPTY_COUNTS;
    },
    EMPTY_COUNTS,
  );
}

export type ActivityItem = {
  id: string;
  actor: string | null;
  action: string;
  entityLabel: string | null;
  entityTable: string;
  entityId: string | null;
  createdAt: string;
};

export async function getRecentActivity(limit = 12): Promise<ActivityItem[]> {
  return safeRead(
    "getRecentActivity",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin
        .from("audit_logs")
        .select("id, actor_email, action, entity_label, entity_table, entity_id, created_at, profiles:actor_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);

      return ((data ?? []) as unknown as Array<
        Pick<AuditLog, "id" | "actor_email" | "action" | "entity_label" | "entity_table" | "entity_id" | "created_at"> & {
          profiles: { full_name: string } | { full_name: string }[] | null;
        }
      >).map((row) => {
        const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          actor: actor?.full_name ?? row.actor_email,
          action: row.action,
          entityLabel: row.entity_label,
          entityTable: row.entity_table,
          entityId: row.entity_id,
          createdAt: row.created_at,
        };
      });
    },
    [],
  );
}

export type PendingSupporter = SupporterProfile & { full_name: string; email: string };

export async function listSupporterQueue(
  statuses: SupporterProfile["status"][] = ["submitted", "under_review"],
): Promise<PendingSupporter[]> {
  return safeRead(
    "listSupporterQueue",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin
        .from("supporter_profiles")
        .select("*, profiles!supporter_profiles_user_id_fkey!inner(full_name, email)")
        .in("status", statuses)
        .order("submitted_at", { ascending: true, nullsFirst: false })
        .limit(100);
      if (error) throw new Error(error.message);

      return ((data ?? []) as unknown as Array<
        SupporterProfile & { profiles: { full_name: string; email: string } | { full_name: string; email: string }[] }
      >).map((row) => {
        const { profiles, ...rest } = row;
        const person = Array.isArray(profiles) ? profiles[0] : profiles;
        return { ...rest, full_name: person?.full_name ?? "", email: person?.email ?? "" };
      });
    },
    [],
  );
}

export type PendingBrand = BrandProfile & { full_name: string; email: string };

export async function listBrandQueue(
  statuses: BrandProfile["status"][] = ["submitted", "under_review"],
): Promise<PendingBrand[]> {
  return safeRead(
    "listBrandQueue",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin
        .from("brand_profiles")
        .select("*, profiles!brand_profiles_user_id_fkey!inner(full_name, email)")
        .in("status", statuses)
        .order("submitted_at", { ascending: true, nullsFirst: false })
        .limit(100);
      if (error) throw new Error(error.message);

      return ((data ?? []) as unknown as Array<
        BrandProfile & { profiles: { full_name: string; email: string } | { full_name: string; email: string }[] }
      >).map((row) => {
        const { profiles, ...rest } = row;
        const person = Array.isArray(profiles) ? profiles[0] : profiles;
        return { ...rest, full_name: person?.full_name ?? "", email: person?.email ?? "" };
      });
    },
    [],
  );
}

export type SelectionQueueItem = {
  id: string;
  status: SelectionStatus;
  created_at: string;
  note: string | null;
  selector_kind: "supporter" | "brand" | "admin";
  selector_name: string;
  selector_email: string;
  business_name: string;
  business_slug: string;
  business_category: BusinessCategory;
  alajo_profile_id: string;
  campaign_name: string | null;
  campaign_id: string | null;
};

export async function listSelectionQueue(
  statuses: SelectionStatus[] = ["recorded", "shortlisted"],
): Promise<SelectionQueueItem[]> {
  return safeRead(
    "listSelectionQueue",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin
        .from("support_selections")
        .select(
          "id, status, created_at, note, selector_kind, alajo_profile_id, campaign_id, " +
            "profiles:selector_id(full_name, email), " +
            "alajo_profiles(business_name, slug, business_category), " +
            "support_campaigns(name)",
        )
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);

      const one = <T>(value: T | T[] | null): T | null =>
        Array.isArray(value) ? (value[0] ?? null) : value;

      return ((data ?? []) as unknown as Array<{
        id: string;
        status: SelectionStatus;
        created_at: string;
        note: string | null;
        selector_kind: "supporter" | "brand" | "admin";
        alajo_profile_id: string;
        campaign_id: string | null;
        profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
        alajo_profiles:
          | { business_name: string; slug: string; business_category: BusinessCategory }
          | { business_name: string; slug: string; business_category: BusinessCategory }[]
          | null;
        support_campaigns: { name: string } | { name: string }[] | null;
      }>).map((row) => {
        const selector = one(row.profiles);
        const business = one(row.alajo_profiles);
        const campaign = one(row.support_campaigns);
        return {
          id: row.id,
          status: row.status,
          created_at: row.created_at,
          note: row.note,
          selector_kind: row.selector_kind,
          selector_name: selector?.full_name ?? "Unknown",
          selector_email: selector?.email ?? "",
          business_name: business?.business_name ?? "Removed business",
          business_slug: business?.slug ?? "",
          business_category: business?.business_category ?? "other",
          alajo_profile_id: row.alajo_profile_id,
          campaign_name: campaign?.name ?? null,
          campaign_id: row.campaign_id,
        };
      });
    },
    [],
  );
}

export type ConfirmationItem = SupportConfirmation & {
  business_name: string;
  business_slug: string;
  campaign_name: string | null;
};

export async function listConfirmations(
  statuses: SupportConfirmation["status"][] = ["pending", "confirmed", "announced"],
): Promise<ConfirmationItem[]> {
  return safeRead(
    "listConfirmations",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin
        .from("support_confirmations")
        .select("*, alajo_profiles(business_name, slug), support_campaigns(name)")
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);

      const one = <T>(value: T | T[] | null): T | null =>
        Array.isArray(value) ? (value[0] ?? null) : value;

      return ((data ?? []) as unknown as Array<
        SupportConfirmation & {
          alajo_profiles: { business_name: string; slug: string } | { business_name: string; slug: string }[] | null;
          support_campaigns: { name: string } | { name: string }[] | null;
        }
      >).map((row) => {
        const { alajo_profiles, support_campaigns, ...rest } = row;
        const business = one(alajo_profiles);
        const campaign = one(support_campaigns);
        return {
          ...rest,
          business_name: business?.business_name ?? "Removed business",
          business_slug: business?.slug ?? "",
          campaign_name: campaign?.name ?? null,
        };
      });
    },
    [],
  );
}

export type CampaignItem = SupportCampaign & {
  brand_name: string | null;
  selection_count: number;
};

export async function listCampaigns(): Promise<CampaignItem[]> {
  return safeRead(
    "listCampaigns",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin
        .from("support_campaigns")
        .select("*, brand_profiles(organisation_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as Array<
        SupportCampaign & {
          brand_profiles: { organisation_name: string | null } | { organisation_name: string | null }[] | null;
        }
      >;

      if (rows.length === 0) return [];

      // One grouped count rather than a query per campaign.
      const { data: selectionRows } = await admin
        .from("support_selections")
        .select("campaign_id")
        .in("campaign_id", rows.map((r) => r.id))
        .neq("status", "withdrawn");

      const counts = new Map<string, number>();
      for (const row of (selectionRows ?? []) as Array<{ campaign_id: string | null }>) {
        if (!row.campaign_id) continue;
        counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1);
      }

      return rows.map((row) => {
        const { brand_profiles, ...rest } = row;
        const brand = Array.isArray(brand_profiles) ? brand_profiles[0] : brand_profiles;
        return {
          ...rest,
          brand_name: brand?.organisation_name ?? null,
          selection_count: counts.get(row.id) ?? 0,
        };
      });
    },
    [],
  );
}

export async function listEmailEvents(options: {
  status?: EmailEvent["status"][];
  limit?: number;
}): Promise<EmailEvent[]> {
  return safeRead(
    "listEmailEvents",
    async () => {
      const admin = createAdminSupabase();
      let builder = admin
        .from("email_events")
        .select("*")
        .order("queued_at", { ascending: false })
        .limit(options.limit ?? 100);
      if (options.status?.length) builder = builder.in("status", options.status);
      const { data, error } = await builder;
      if (error) throw new Error(error.message);
      return (data ?? []) as EmailEvent[];
    },
    [],
  );
}

export async function listAuditLog(options: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityTable?: string;
}): Promise<{ items: ActivityItem[]; total: number }> {
  return safeRead(
    "listAuditLog",
    async () => {
      const admin = createAdminSupabase();
      const pageSize = options.pageSize ?? 50;
      const page = options.page ?? 1;
      const from = (page - 1) * pageSize;

      let builder = admin
        .from("audit_logs")
        .select(
          "id, actor_email, action, entity_label, entity_table, entity_id, created_at, profiles:actor_id(full_name)",
          { count: "exact" },
        );

      if (options.action) builder = builder.eq("action", options.action);
      if (options.entityTable) builder = builder.eq("entity_table", options.entityTable);

      const { data, count, error } = await builder
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);

      const items = ((data ?? []) as unknown as Array<
        Pick<AuditLog, "id" | "actor_email" | "action" | "entity_label" | "entity_table" | "entity_id" | "created_at"> & {
          profiles: { full_name: string } | { full_name: string }[] | null;
        }
      >).map((row) => {
        const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          actor: actor?.full_name ?? row.actor_email,
          action: row.action,
          entityLabel: row.entity_label,
          entityTable: row.entity_table,
          entityId: row.entity_id,
          createdAt: row.created_at,
        };
      });

      return { items, total: count ?? 0 };
    },
    { items: [], total: 0 },
  );
}

/** Devices or addresses tied to more than one selecting account. */
export async function listSelectionRisk(): Promise<
  Array<{ device_hash: string | null; ip_hash: string | null; selection_count: number; distinct_selectors: number; last_seen: string }>
> {
  return safeRead(
    "listSelectionRisk",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin.from("admin_selection_risk").select("*").limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{
        device_hash: string | null;
        ip_hash: string | null;
        selection_count: number;
        distinct_selectors: number;
        last_seen: string;
      }>;
    },
    [],
  );
}

export async function listStaff(): Promise<
  Array<{ id: string; full_name: string; email: string; role: string; status: string; permissions: Record<string, boolean>; last_seen_at: string | null }>
> {
  return safeRead(
    "listStaff",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin
        .from("profiles")
        .select("id, full_name, email, role, status, permissions, last_seen_at")
        .in("role", ["super_admin", "admin", "reviewer"])
        .order("role", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{
        id: string;
        full_name: string;
        email: string;
        role: string;
        status: string;
        permissions: Record<string, boolean>;
        last_seen_at: string | null;
      }>;
    },
    [],
  );
}
