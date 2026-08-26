import type { AlajoApplication, AlajoMedia } from "@/lib/types";

/**
 * Pure field metadata and completeness maths. Kept out of the server-only data
 * module so the review panel and the applicant's form can both use it — the
 * applicant and the reviewer should be looking at the same definition of
 * "complete", not two that drift apart.
 */

export const REQUIRED_FIELDS = [
  "founder_name",
  "date_of_birth",
  "personal_phone",
  "personal_address",
  "business_name",
  "business_category",
  "business_description",
  "year_started",
  "state",
  "city",
  "business_address",
  "business_phone",
  "story",
  "current_challenge",
  "support_would_enable",
  "requested_amount_ngn",
] as const satisfies ReadonlyArray<keyof AlajoApplication>;

export const FIELD_LABELS: Record<string, string> = {
  founder_name: "Your full name",
  date_of_birth: "Date of birth",
  personal_phone: "Your phone number",
  personal_address: "Your address",
  business_name: "Business name",
  business_category: "Business category",
  business_description: "What the business does",
  year_started: "Year started",
  employee_count: "Number of people employed",
  state: "State",
  city: "Town or city",
  business_address: "Business address",
  business_phone: "Business phone number",
  website_url: "Website",
  instagram_handle: "Instagram",
  tiktok_handle: "TikTok",
  story: "Your story",
  current_challenge: "The challenge you are facing",
  support_would_enable: "What support would let you do",
  requested_amount_ngn: "Amount you are asking for",
  profile_photo: "Photograph of you",
  business_photo: "Photographs of the business",
  identity_document: "Identity document",
  business_document: "Proof the business exists",
};

/**
 * How complete an application is, as a percentage. Media counts toward the
 * total because an application without a single photograph cannot be verified.
 */
export function calculateCompleteness(
  application: Partial<AlajoApplication>,
  media: Pick<AlajoMedia, "kind">[],
): number {
  const fieldPoints = REQUIRED_FIELDS.filter((field) => {
    const value = application[field];
    return value !== null && value !== undefined && String(value).trim() !== "";
  }).length;

  const hasProfilePhoto = media.some((m) => m.kind === "profile_photo") ? 1 : 0;
  const hasBusinessPhoto = media.some((m) => m.kind === "business_photo") ? 1 : 0;
  const hasDocument = media.some((m) => m.kind === "document") ? 1 : 0;

  const total = REQUIRED_FIELDS.length + 3;
  const scored = fieldPoints + hasProfilePhoto + hasBusinessPhoto + hasDocument;
  return Math.round((scored / total) * 100);
}

export function missingRequirements(
  application: Partial<AlajoApplication>,
  media: Pick<AlajoMedia, "kind">[],
): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value = application[field];
    if (value === null || value === undefined || String(value).trim() === "") {
      missing.push(FIELD_LABELS[field] ?? field);
    }
  }
  if (!media.some((m) => m.kind === "profile_photo")) missing.push(FIELD_LABELS.profile_photo!);
  if (!media.some((m) => m.kind === "business_photo")) missing.push(FIELD_LABELS.business_photo!);
  if (!media.some((m) => m.kind === "document")) missing.push(FIELD_LABELS.identity_document!);
  return missing;
}
