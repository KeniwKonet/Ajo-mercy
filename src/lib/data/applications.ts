import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { calculateCompleteness, missingRequirements } from "@/lib/data/application-fields";
import type {
  AlajoApplication,
  AlajoMedia,
  AlajoProfile,
  VerificationRequest,
} from "@/lib/types";

// Field metadata and completeness maths live in a client-safe module so the
// review panel can use them too; re-exported here for existing call sites.
export {
  REQUIRED_FIELDS,
  FIELD_LABELS,
  calculateCompleteness,
  missingRequirements,
} from "@/lib/data/application-fields";

export type AlajoWorkspace = {
  application: AlajoApplication | null;
  media: AlajoMedia[];
  openRequests: VerificationRequest[];
  profile: AlajoProfile | null;
  completeness: number;
  missing: string[];
  /** Whether the applicant may edit right now. */
  editable: boolean;
};

/** Everything the Alajo dashboard needs, in one place. */
export async function getAlajoWorkspace(userId: string): Promise<AlajoWorkspace> {
  const supabase = await createServerSupabase();

  const { data: appRow } = await supabase
    .from("alajo_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const application = (appRow as AlajoApplication | null) ?? null;

  if (!application) {
    return {
      application: null,
      media: [],
      openRequests: [],
      profile: null,
      completeness: 0,
      missing: [],
      editable: true,
    };
  }

  const [{ data: mediaRows }, { data: requestRows }, { data: profileRow }] = await Promise.all([
    supabase
      .from("alajo_media")
      .select("*")
      .eq("application_id", application.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("verification_requests")
      .select("*")
      .eq("application_id", application.id)
      .is("resolved_at", null)
      .order("created_at", { ascending: true }),
    supabase.from("alajo_profiles").select("*").eq("application_id", application.id).maybeSingle(),
  ]);

  const media = (mediaRows ?? []) as AlajoMedia[];

  return {
    application,
    media,
    openRequests: (requestRows ?? []) as VerificationRequest[],
    profile: (profileRow as AlajoProfile | null) ?? null,
    completeness: calculateCompleteness(application, media),
    missing: missingRequirements(application, media),
    editable: application.status === "draft" || application.status === "more_information_required",
  };
}

/** Creates the draft on first visit so the form always has a row to write to. */
export async function ensureApplication(userId: string): Promise<AlajoApplication> {
  const supabase = await createServerSupabase();
  const { data: existing } = await supabase
    .from("alajo_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing as AlajoApplication;

  const { data, error } = await supabase
    .from("alajo_applications")
    .insert({ user_id: userId, status: "draft" })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not start an application.");
  return data as AlajoApplication;
}

// ------------------------------------------------------------- admin reads --

export type ReviewQueueItem = {
  id: string;
  user_id: string;
  status: AlajoApplication["status"];
  business_name: string | null;
  founder_name: string | null;
  business_category: string | null;
  state: string | null;
  submitted_at: string | null;
  updated_at: string;
  completeness: number;
  applicant_email: string;
};

/** Review queue. Service role, because reviewers need every applicant's row. */
export async function listReviewQueue(options: {
  status?: AlajoApplication["status"][];
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: ReviewQueueItem[]; total: number }> {
  const admin = createAdminSupabase();
  const pageSize = options.pageSize ?? 20;
  const page = options.page ?? 1;
  const from = (page - 1) * pageSize;

  let builder = admin
    .from("alajo_applications")
    .select(
      "id, user_id, status, business_name, founder_name, business_category, state, submitted_at, updated_at, completeness, profiles!inner(email)",
      { count: "exact" },
    );

  if (options.status?.length) builder = builder.in("status", options.status);
  if (options.search) {
    const term = options.search.replace(/[%,()*]/g, " ").trim();
    if (term) {
      builder = builder.or(`business_name.ilike.%${term}%,founder_name.ilike.%${term}%`);
    }
  }

  const { data, count, error } = await builder
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("[data] listReviewQueue failed", error.message);
    return { items: [], total: 0 };
  }

  const items = ((data ?? []) as unknown as Array<
    Omit<ReviewQueueItem, "applicant_email"> & { profiles: { email: string } | { email: string }[] }
  >).map((row) => {
    const { profiles, ...rest } = row;
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    return { ...rest, applicant_email: profile?.email ?? "" };
  });

  return { items, total: count ?? 0 };
}

export type ReviewDetail = {
  application: AlajoApplication;
  applicant: { id: string; email: string; full_name: string; created_at: string; status: string };
  media: AlajoMedia[];
  openRequests: VerificationRequest[];
  allRequests: VerificationRequest[];
  profile: AlajoProfile | null;
  notes: Array<{ id: string; body: string; created_at: string; author_name: string | null }>;
  completeness: number;
  missing: string[];
};

/** Everything the review workspace shows for one application. */
export async function getReviewDetail(applicationId: string): Promise<ReviewDetail | null> {
  const admin = createAdminSupabase();

  const { data: appRow } = await admin
    .from("alajo_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (!appRow) return null;
  const application = appRow as AlajoApplication;

  const [{ data: applicantRow }, { data: mediaRows }, { data: requestRows }, { data: profileRow }, { data: noteRows }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, email, full_name, created_at, status")
        .eq("id", application.user_id)
        .maybeSingle(),
      admin.from("alajo_media").select("*").eq("application_id", applicationId).order("sort_order"),
      admin
        .from("verification_requests")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false }),
      admin.from("alajo_profiles").select("*").eq("application_id", applicationId).maybeSingle(),
      admin
        .from("admin_notes")
        .select("id, body, created_at, profiles:author_id(full_name)")
        .eq("entity_table", "alajo_applications")
        .eq("entity_id", applicationId)
        .order("created_at", { ascending: false }),
    ]);

  const media = (mediaRows ?? []) as AlajoMedia[];
  const allRequests = (requestRows ?? []) as VerificationRequest[];

  const notes = ((noteRows ?? []) as unknown as Array<{
    id: string;
    body: string;
    created_at: string;
    profiles: { full_name: string } | { full_name: string }[] | null;
  }>).map((row) => {
    const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { id: row.id, body: row.body, created_at: row.created_at, author_name: author?.full_name ?? null };
  });

  return {
    application,
    applicant: (applicantRow as ReviewDetail["applicant"]) ?? {
      id: application.user_id,
      email: "",
      full_name: "",
      created_at: application.created_at,
      status: "pending",
    },
    media,
    openRequests: allRequests.filter((r) => !r.resolved_at),
    allRequests,
    profile: (profileRow as AlajoProfile | null) ?? null,
    notes,
    completeness: calculateCompleteness(application, media),
    missing: missingRequirements(application, media),
  };
}
