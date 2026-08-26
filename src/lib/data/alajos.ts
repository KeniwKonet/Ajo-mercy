import "server-only";

import { createPublicSupabase } from "@/lib/supabase/public";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { safeRead } from "@/lib/data/safe";
import { NEED_BANDS, type DiscoveryQuery } from "@/lib/validation/schemas";
import type { AlajoMedia, AlajoProfile, AlajoProfileWithMedia, ImpactStats } from "@/lib/types";

export const PAGE_SIZE = 12;

export const EMPTY_STATS: ImpactStats = {
  alajos_registered: 0,
  alajos_approved: 0,
  businesses_supported: 0,
  support_facilitated_ngn: 0,
  states_reached: 0,
  categories_supported: 0,
  brands_participating: 0,
  supporters_approved: 0,
};

/** Public storage paths resolve to a stable CDN URL; documents never do. */
export { publicMediaUrl } from "@/lib/data/media-url";

const PROFILE_COLUMNS =
  "id, user_id, application_id, slug, status, business_name, founder_name, business_category, " +
  "state, city, year_started, story, current_challenge, support_would_enable, requested_amount_ngn, " +
  "cover_media_id, avatar_media_id, website_url, instagram_handle, tiktok_handle, featured_at, " +
  "approved_at, archived_at, view_count, created_at, updated_at";

export interface DiscoveryResult {
  profiles: AlajoProfileWithMedia[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Discovery listing. Runs as `anon`, so RLS limits it to approved and featured
 * profiles no matter who is browsing, and the result stays cacheable.
 */
export async function listAlajos(query: DiscoveryQuery): Promise<DiscoveryResult> {
  return safeRead(
    "listAlajos",
    async () => {
      const supabase = createPublicSupabase();
      const from = (query.page - 1) * PAGE_SIZE;

      let builder = supabase
        .from("alajo_profiles")
        .select(PROFILE_COLUMNS, { count: "exact" })
        .in("status", ["approved", "featured"]);

      if (query.category) builder = builder.eq("business_category", query.category);
      if (query.state) builder = builder.eq("state", query.state);

      if (query.need) {
        const band = NEED_BANDS[query.need];
        builder = builder.gte("requested_amount_ngn", band.min);
        if (band.max !== null) builder = builder.lt("requested_amount_ngn", band.max);
      }

      if (query.q) {
        // PostgREST `or` takes a comma-separated filter list, so characters
        // with meaning in that grammar are stripped rather than escaped.
        const term = query.q.replace(/[%,()*]/g, " ").trim();
        if (term) {
          builder = builder.or(
            `business_name.ilike.%${term}%,founder_name.ilike.%${term}%,city.ilike.%${term}%,state.ilike.%${term}%`,
          );
        }
      }

      switch (query.sort) {
        case "name":
          builder = builder.order("business_name", { ascending: true });
          break;
        case "recent":
          builder = builder.order("approved_at", { ascending: false, nullsFirst: false });
          break;
        default:
          // Featured first, then most recently approved.
          builder = builder
            .order("featured_at", { ascending: false, nullsFirst: false })
            .order("approved_at", { ascending: false, nullsFirst: false });
      }

      const { data, count, error } = await builder.range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);

      const profiles = await attachMedia((data ?? []) as unknown as AlajoProfile[]);
      return {
        profiles,
        total: count ?? 0,
        page: query.page,
        pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
      };
    },
    { profiles: [], total: 0, page: query.page, pageCount: 1 },
  );
}

/** Featured stories for the landing page, newest feature first. */
export async function listFeaturedAlajos(limit = 6): Promise<AlajoProfileWithMedia[]> {
  return safeRead(
    "listFeaturedAlajos",
    async () => {
      const supabase = createPublicSupabase();
      const { data, error } = await supabase
        .from("alajo_profiles")
        .select(PROFILE_COLUMNS)
        .eq("status", "featured")
        .order("featured_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return attachMedia((data ?? []) as unknown as AlajoProfile[]);
    },
    [],
  );
}

export async function listRecentAlajos(limit = 8): Promise<AlajoProfileWithMedia[]> {
  return safeRead(
    "listRecentAlajos",
    async () => {
      const supabase = createPublicSupabase();
      const { data, error } = await supabase
        .from("alajo_profiles")
        .select(PROFILE_COLUMNS)
        .in("status", ["approved", "featured"])
        .order("approved_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return attachMedia((data ?? []) as unknown as AlajoProfile[]);
    },
    [],
  );
}

export async function getAlajoBySlug(slug: string): Promise<AlajoProfileWithMedia | null> {
  return safeRead(
    "getAlajoBySlug",
    async () => {
      const supabase = createPublicSupabase();
      const { data, error } = await supabase
        .from("alajo_profiles")
        .select(PROFILE_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const [profile] = await attachMedia([data as unknown as AlajoProfile]);
      return profile ?? null;
    },
    null,
  );
}

export async function listAlajoSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  return safeRead(
    "listAlajoSlugs",
    async () => {
      const admin = createAdminSupabase();
      const { data, error } = await admin
        .from("alajo_profiles")
        .select("slug, updated_at")
        .in("status", ["approved", "featured"]);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ slug: string; updated_at: string }>;
    },
    [],
  );
}

/**
 * One extra query for all profiles rather than one per profile. Documents are
 * excluded here so a public listing can never leak an ID card.
 */
async function attachMedia(profiles: AlajoProfile[]): Promise<AlajoProfileWithMedia[]> {
  if (profiles.length === 0) return [];
  const supabase = createPublicSupabase();
  const applicationIds = profiles.map((p) => p.application_id);

  const { data } = await supabase
    .from("alajo_media")
    .select(
      "id, application_id, kind, document_type, storage_path, mime_type, size_bytes, caption, sort_order, created_at",
    )
    .in("application_id", applicationIds)
    .in("kind", ["profile_photo", "business_photo", "video"])
    .order("sort_order", { ascending: true });

  const media = (data ?? []) as unknown as AlajoMedia[];
  const byApplication = new Map<string, AlajoMedia[]>();
  for (const item of media) {
    const list = byApplication.get(item.application_id) ?? [];
    list.push(item);
    byApplication.set(item.application_id, list);
  }

  return profiles.map((profile) => {
    const items = byApplication.get(profile.application_id) ?? [];
    const byId = new Map(items.map((m) => [m.id, m]));
    const gallery = items.filter((m) => m.kind === "business_photo" || m.kind === "video");
    return {
      ...profile,
      cover: (profile.cover_media_id ? byId.get(profile.cover_media_id) : undefined) ?? gallery[0] ?? null,
      avatar:
        (profile.avatar_media_id ? byId.get(profile.avatar_media_id) : undefined) ??
        items.find((m) => m.kind === "profile_photo") ??
        null,
      gallery,
    };
  });
}

/** Aggregates over approved rows only. Returns zeros, never invented numbers. */
export async function getImpactStats(): Promise<ImpactStats> {
  return safeRead(
    "getImpactStats",
    async () => {
      const supabase = createPublicSupabase();
      const { data, error } = await supabase.from("public_impact_stats").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return (data as unknown as ImpactStats) ?? EMPTY_STATS;
    },
    EMPTY_STATS,
  );
}

/** Category counts for the discovery sidebar. Empty categories are dropped. */
export async function getCategoryCounts(): Promise<Array<{ category: string; count: number }>> {
  return safeRead(
    "getCategoryCounts",
    async () => {
      const supabase = createPublicSupabase();
      const { data, error } = await supabase
        .from("alajo_profiles")
        .select("business_category")
        .in("status", ["approved", "featured"]);
      if (error) throw new Error(error.message);

      const counts = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ business_category: string }>) {
        counts.set(row.business_category, (counts.get(row.business_category) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
    },
    [],
  );
}

export async function getStateCounts(): Promise<Array<{ state: string; count: number }>> {
  return safeRead(
    "getStateCounts",
    async () => {
      const supabase = createPublicSupabase();
      const { data, error } = await supabase
        .from("alajo_profiles")
        .select("state")
        .in("status", ["approved", "featured"]);
      if (error) throw new Error(error.message);

      const counts = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ state: string }>) {
        counts.set(row.state, (counts.get(row.state) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));
    },
    [],
  );
}

/** Fire-and-forget view counter. Never blocks the page render. */
export async function incrementViewCount(profileId: string): Promise<void> {
  try {
    const admin = createAdminSupabase();
    await admin.rpc("increment_profile_view", { p_profile_id: profileId });
  } catch {
    // A missed view count is not worth an error page.
  }
}
