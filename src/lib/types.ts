/** Domain model. Mirrors the enums and shapes declared in supabase/migrations. */

export const USER_ROLES = ["super_admin", "admin", "reviewer", "alajo", "supporter", "brand"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["pending", "approved", "suspended", "rejected"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "more_information_required",
  "approved",
  "rejected",
  "suspended",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const ALAJO_PROFILE_STATUSES = [
  "private",
  "pending",
  "approved",
  "featured",
  "suspended",
  "archived",
] as const;
export type AlajoProfileStatus = (typeof ALAJO_PROFILE_STATUSES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "open",
  "selection_period",
  "under_review",
  "confirmed",
  "announced",
  "completed",
  "cancelled",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const SELECTION_STATUSES = ["recorded", "shortlisted", "confirmed", "declined", "withdrawn"] as const;
export type SelectionStatus = (typeof SELECTION_STATUSES)[number];

export const CONFIRMATION_STATUSES = ["pending", "confirmed", "announced", "completed", "cancelled"] as const;
export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number];

export const EMAIL_STATUSES = [
  "queued",
  "sending",
  "sent",
  "delivered",
  "bounced",
  "complained",
  "failed",
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const MEDIA_KINDS = ["profile_photo", "business_photo", "video", "document"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const DOCUMENT_TYPES = [
  "cac_certificate",
  "government_id",
  "proof_of_address",
  "bank_statement",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const BUSINESS_CATEGORIES = [
  "food_and_beverage",
  "fashion_and_textiles",
  "agriculture",
  "beauty_and_wellness",
  "retail_and_trading",
  "technology",
  "education",
  "logistics_and_transport",
  "creative_and_media",
  "manufacturing",
  "professional_services",
  "health",
  "other",
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  food_and_beverage: "Food & Beverage",
  fashion_and_textiles: "Fashion & Textiles",
  agriculture: "Agriculture",
  beauty_and_wellness: "Beauty & Wellness",
  retail_and_trading: "Retail & Trading",
  technology: "Technology",
  education: "Education",
  logistics_and_transport: "Logistics & Transport",
  creative_and_media: "Creative & Media",
  manufacturing: "Manufacturing",
  professional_services: "Professional Services",
  health: "Health",
  other: "Other",
};

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
] as const;
export type NigerianState = (typeof NIGERIAN_STATES)[number];

// ------------------------------------------------------------------ rows ---

export type Profile = {
  id: string;
  role: UserRole;
  status: UserStatus;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  permissions: Record<string, boolean>;
  email_verified_at: string | null;
  last_seen_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type AlajoApplication = {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  founder_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  personal_phone: string | null;
  personal_address: string | null;
  business_name: string | null;
  business_category: BusinessCategory | null;
  business_description: string | null;
  year_started: number | null;
  employee_count: number | null;
  state: string | null;
  city: string | null;
  business_address: string | null;
  business_phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  x_handle: string | null;
  facebook_url: string | null;
  story: string | null;
  current_challenge: string | null;
  support_would_enable: string | null;
  requested_amount_ngn: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  decision_reason: string | null;
  applicant_message: string | null;
  completeness: number;
  created_at: string;
  updated_at: string;
}

export type AlajoMedia = {
  id: string;
  application_id: string;
  kind: MediaKind;
  document_type: DocumentType | null;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export type VerificationRequest = {
  id: string;
  application_id: string;
  field_key: string;
  message: string;
  resolved_at: string | null;
  requested_by: string | null;
  created_at: string;
}

export type AlajoProfile = {
  id: string;
  user_id: string;
  application_id: string;
  slug: string;
  status: AlajoProfileStatus;
  business_name: string;
  founder_name: string;
  business_category: BusinessCategory;
  state: string;
  city: string | null;
  year_started: number | null;
  story: string;
  current_challenge: string | null;
  support_would_enable: string | null;
  requested_amount_ngn: number | null;
  cover_media_id: string | null;
  avatar_media_id: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  featured_at: string | null;
  approved_at: string | null;
  archived_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export type AlajoProfileWithMedia = AlajoProfile & {
  cover: AlajoMedia | null;
  avatar: AlajoMedia | null;
  gallery: AlajoMedia[];
}

export type SupporterProfile = {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  phone: string | null;
  state: string | null;
  city: string | null;
  occupation: string | null;
  motivation: string | null;
  how_heard: string | null;
  interests: BusinessCategory[];
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  decision_reason: string | null;
  /** Maximum selections allowed. Null means unlimited, which is the default. */
  selection_credits: number | null;
  created_at: string;
  updated_at: string;
}

export type BrandProfile = {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  slug: string | null;
  organisation_name: string | null;
  registration_number: string | null;
  logo_url: string | null;
  website_url: string | null;
  industry: string | null;
  about: string | null;
  contact_person_name: string | null;
  contact_person_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  linkedin_url: string | null;
  instagram_handle: string | null;
  support_purpose: string | null;
  preferred_categories: BusinessCategory[];
  preferred_states: string[];
  budget_min_ngn: number | null;
  budget_max_ngn: number | null;
  businesses_target: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type SupportCampaign = {
  id: string;
  brand_id: string | null;
  created_by: string;
  slug: string;
  name: string;
  status: CampaignStatus;
  summary: string | null;
  budget_ngn: number | null;
  businesses_target: number;
  preferred_categories: BusinessCategory[];
  preferred_states: string[];
  selection_opens_at: string | null;
  selection_closes_at: string | null;
  announced_at: string | null;
  completed_at: string | null;
  is_platform_campaign: boolean;
  created_at: string;
  updated_at: string;
}

export type SupportSelection = {
  id: string;
  alajo_profile_id: string;
  campaign_id: string | null;
  selector_id: string;
  selector_kind: "supporter" | "brand" | "admin";
  status: SelectionStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type SupportConfirmation = {
  id: string;
  alajo_profile_id: string;
  campaign_id: string | null;
  selection_id: string | null;
  status: ConfirmationStatus;
  amount_ngn: number | null;
  support_kind: string | null;
  supporter_label: string | null;
  internal_note: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  announced_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailEvent = {
  id: string;
  event_type: string;
  recipient_email: string;
  recipient_user_id: string | null;
  subject: string;
  related_table: string | null;
  related_id: string | null;
  status: EmailStatus;
  provider: string;
  provider_message_id: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  error_message: string | null;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  idempotency_key: string | null;
}

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: UserRole | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  entity_label: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export type ImpactStats = {
  alajos_registered: number;
  alajos_approved: number;
  businesses_supported: number;
  support_facilitated_ngn: number;
  states_reached: number;
  categories_supported: number;
  brands_participating: number;
  supporters_approved: number;
}
