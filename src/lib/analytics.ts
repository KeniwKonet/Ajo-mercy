import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

/** Product events worth measuring. Names are stable; add, do not rename. */
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: "page_view",
  APPLICATION_STARTED: "application_started",
  APPLICATION_SUBMITTED: "application_submitted",
  APPLICATION_RESUBMITTED: "application_resubmitted",
  APPLICATION_APPROVED: "application_approved",
  SUPPORTER_REGISTERED: "supporter_registered",
  SUPPORTER_APPROVED: "supporter_approved",
  SUPPORTER_SELECTION: "supporter_selection",
  BRAND_REGISTERED: "brand_registered",
  BRAND_APPROVED: "brand_approved",
  CAMPAIGN_CREATED: "campaign_created",
  CAMPAIGN_SELECTION: "campaign_selection",
  SUPPORT_CONFIRMED: "support_confirmed",
  ALAJO_PROFILE_VIEWED: "alajo_profile_viewed",
  DISCOVERY_SEARCH: "discovery_search",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Props must stay non-identifying: ids and categories, never names, emails,
 * phone numbers or addresses. Anything not on this allowlist is dropped.
 */
const ALLOWED_PROP_KEYS = new Set([
  "alajo_profile_id", "campaign_id", "application_id", "category", "state",
  "role", "status", "source", "step", "query_length", "result_count", "filters",
]);

function sanitiseProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROP_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.length > 120) continue;
    out[key] = value;
  }
  return out;
}

export async function track(
  name: AnalyticsEvent,
  options: {
    userId?: string | null;
    role?: UserRole | null;
    sessionId?: string | null;
    props?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    const admin = createAdminSupabase();
    await admin.from("analytics_events").insert({
      name,
      user_id: options.userId ?? null,
      role: options.role ?? null,
      session_id: options.sessionId ?? null,
      props: sanitiseProps(options.props ?? {}),
    });
  } catch (err) {
    console.error("[analytics] failed to record", name, err);
  }
}
