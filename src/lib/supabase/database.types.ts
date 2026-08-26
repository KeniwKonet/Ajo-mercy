import type {
  AlajoApplication,
  AlajoMedia,
  AlajoProfile,
  AuditLog,
  BrandProfile,
  EmailEvent,
  ImpactStats,
  Profile,
  SupportCampaign,
  SupportConfirmation,
  SupportSelection,
  SupporterProfile,
  UserRole,
  VerificationRequest,
} from "@/lib/types";

/**
 * Schema type for the Supabase client. Hand-written rather than generated so it
 * stays the same shape as `@/lib/types` — one domain model, not two that drift.
 * Regenerate-and-diff is not needed: the migrations, these types and
 * `tests/schema.test.ts` are checked against each other.
 */

type Table<Row, RequiredOnInsert extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredOnInsert>;
  Update: Partial<Row>;
  Relationships: [];
};

type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

type AdminNote = {
  id: string;
  author_id: string | null;
  entity_table: string;
  entity_id: string;
  body: string;
  created_at: string;
}

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
}

type CampaignAlajo = {
  campaign_id: string;
  alajo_profile_id: string;
  added_by: string | null;
  created_at: string;
}

type BusinessVerification = {
  id: string;
  application_id: string;
  check_key: string;
  passed: boolean | null;
  note: string | null;
  checked_by: string | null;
  checked_at: string | null;
}

type AnalyticsEvent = {
  id: number;
  name: string;
  user_id: string | null;
  role: UserRole | null;
  props: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
}

type SelectionRisk = {
  device_hash: string | null;
  ip_hash: string | null;
  selection_count: number;
  distinct_selectors: number;
  first_seen: string;
  last_seen: string;
}

/** Columns held on selections that are admin-only and absent from the domain type. */
type SupportSelectionRow = SupportSelection & {
  ip_hash: string | null;
  device_hash: string | null;
  user_agent: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id" | "email" | "full_name">;
      alajo_applications: Table<AlajoApplication, "user_id">;
      verification_requests: Table<VerificationRequest, "application_id" | "field_key" | "message">;
      alajo_media: Table<AlajoMedia, "application_id" | "kind" | "storage_path" | "mime_type" | "size_bytes">;
      business_verifications: Table<BusinessVerification, "application_id" | "check_key">;
      alajo_profiles: Table<
        AlajoProfile,
        "user_id" | "application_id" | "slug" | "business_name" | "founder_name" | "business_category" | "state" | "story"
      >;
      supporter_profiles: Table<SupporterProfile, "user_id">;
      brand_profiles: Table<BrandProfile, "user_id">;
      support_campaigns: Table<SupportCampaign, "created_by" | "slug" | "name">;
      campaign_alajos: Table<CampaignAlajo, "campaign_id" | "alajo_profile_id">;
      support_selections: Table<SupportSelectionRow, "alajo_profile_id" | "selector_id" | "selector_kind">;
      support_confirmations: Table<SupportConfirmation, "alajo_profile_id">;
      email_events: Table<EmailEvent, "event_type" | "recipient_email" | "subject">;
      notifications: Table<Notification, "user_id" | "kind" | "title">;
      audit_logs: Table<AuditLog & { ip_hash: string | null }, "action" | "entity_table">;
      admin_notes: Table<AdminNote, "entity_table" | "entity_id" | "body">;
      announcements: Table<Announcement, "title" | "body">;
      analytics_events: Table<AnalyticsEvent, "name">;
      rate_limits: Table<
        { bucket: string; identifier: string; window_start: string; count: number },
        "bucket" | "identifier" | "window_start"
      >;
      state_transitions: Table<
        { entity: string; from_state: string; to_state: string },
        "entity" | "from_state" | "to_state"
      >;
    };
    Views: {
      public_impact_stats: { Row: ImpactStats; Relationships: [] };
      admin_selection_risk: { Row: SelectionRisk; Relationships: [] };
    };
    Functions: {
      bump_rate_limit: {
        Args: { p_bucket: string; p_identifier: string; p_window_seconds: number };
        Returns: number;
      };
      increment_profile_view: {
        Args: { p_profile_id: string };
        Returns: undefined;
      };
      approve_alajo_application: {
        Args: {
          p_application_id: string;
          p_reviewer_id: string;
          p_applicant_message?: string | null;
          p_feature?: boolean;
        };
        Returns: Array<{ profile_id: string; slug: string }>;
      };
      record_selection: {
        Args: {
          p_alajo_profile_id: string;
          p_selector_id: string;
          p_selector_kind: "supporter" | "brand" | "admin";
          p_campaign_id?: string | null;
          p_note?: string | null;
          p_ip_hash?: string | null;
          p_device_hash?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
      admin_dashboard_counts: {
        Args: Record<string, never>;
        Returns: AdminDashboardCounts;
      };
      sweep_rate_limits: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type AdminDashboardCounts = {
  pending_alajo_reviews: number;
  alajo_awaiting_resubmission: number;
  pending_supporter_reviews: number;
  pending_brand_reviews: number;
  pending_confirmations: number;
  unreviewed_selections: number;
  active_campaigns: number;
  email_failures: number;
  live_profiles: number;
  suspended_profiles: number;
  total_supporters: number;
  total_brands: number;
  support_confirmed_total: number;
  businesses_supported: number;
}
