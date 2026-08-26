import { z } from "zod";
import {
  businessCategory,
  email,
  fullName,
  nairaAmount,
  nigerianPhone,
  nigerianState,
  optionalPhone,
  password,
  prose,
  socialHandle,
  turnstileToken,
  url,
} from "@/lib/validation/shared";
import { BUSINESS_CATEGORIES, DOCUMENT_TYPES, MEDIA_KINDS } from "@/lib/types";

// ------------------------------------------------------------------ auth ---

export const signUpSchema = z.object({
  fullName,
  email,
  password,
  role: z.enum(["alajo", "supporter", "brand"]),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You need to accept the terms to continue." }),
  }),
  turnstileToken,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  turnstileToken,
});

export const requestResetSchema = z.object({ email, turnstileToken });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The two passwords do not match.",
    path: ["confirmPassword"],
  });

// ------------------------------------------------- alajo application -------
// Split by step so a draft can be saved without passing the whole thing, then
// recombined for submission where every field is required.

export const alajoPersonalSchema = z.object({
  founderName: fullName,
  dateOfBirth: z
    .string()
    .refine((v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 18 && age <= 100;
    }, "You need to be 18 or older to apply."),
  gender: z.enum(["female", "male", "prefer_not_to_say"]).optional(),
  personalPhone: nigerianPhone,
  personalAddress: z.string().trim().min(8, "Enter your address.").max(300),
});

export const alajoBusinessSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name.").max(120),
  businessCategory,
  businessDescription: prose(15, 600, "The description of what you do"),
  yearStarted: z.coerce
    .number()
    .int()
    .min(1900, "Enter the year you started.")
    .max(new Date().getFullYear(), "That year is in the future."),
  employeeCount: z.coerce.number().int().min(0).max(100_000),
  state: nigerianState,
  city: z.string().trim().min(2, "Enter your town or city.").max(80),
  businessAddress: z.string().trim().min(8, "Enter the business address.").max(300),
  businessPhone: nigerianPhone,
  websiteUrl: url,
  instagramHandle: socialHandle,
  tiktokHandle: socialHandle,
  xHandle: socialHandle,
  facebookUrl: url,
});

export const alajoStorySchema = z.object({
  story: prose(60, 3000, "Your story"),
  currentChallenge: prose(20, 1200, "The challenge you are facing"),
  supportWouldEnable: prose(20, 1200, "What support would let you do"),
  requestedAmountNgn: nairaAmount,
});

export const alajoApplicationSchema = alajoPersonalSchema
  .merge(alajoBusinessSchema)
  .merge(alajoStorySchema);
export type AlajoApplicationInput = z.infer<typeof alajoApplicationSchema>;

/** Drafts save whatever is filled in; nothing is required until submission. */
export const alajoDraftSchema = alajoApplicationSchema.partial();

export const submitApplicationSchema = z.object({
  confirmAccurate: z.literal(true, {
    errorMap: () => ({ message: "Confirm that the information is accurate." }),
  }),
  confirmNoGuarantee: z.literal(true, {
    errorMap: () => ({ message: "Confirm you understand that registering does not guarantee support." }),
  }),
  turnstileToken,
});

// ------------------------------------------------------------ supporter ----

export const supporterProfileSchema = z.object({
  phone: nigerianPhone,
  state: nigerianState,
  city: z.string().trim().min(2, "Enter your town or city.").max(80),
  occupation: z.string().trim().min(2, "What do you do?").max(120),
  motivation: prose(15, 800, "Why you want to support a business"),
  howHeard: z.string().trim().max(200).optional(),
  interests: z
    .array(z.enum(BUSINESS_CATEGORIES))
    .min(1, "Pick at least one kind of business you care about.")
    .max(BUSINESS_CATEGORIES.length),
  turnstileToken,
});
export type SupporterProfileInput = z.infer<typeof supporterProfileSchema>;

export const selectionSchema = z.object({
  alajoProfileId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
  confirmUnderstanding: z.literal(true, {
    errorMap: () => ({ message: "Confirm you understand this is a selection, not a transfer of money." }),
  }),
  turnstileToken,
});

// ---------------------------------------------------------------- brand ----

export const brandProfileSchema = z.object({
  organisationName: z.string().trim().min(2, "Enter the organisation name.").max(160),
  registrationNumber: z.string().trim().max(60).optional(),
  websiteUrl: url,
  industry: z.string().trim().min(2, "What sector are you in?").max(120),
  about: prose(20, 1200, "The description of your organisation"),
  contactPersonName: fullName,
  contactPersonRole: z.string().trim().min(2, "What is their role?").max(120),
  contactEmail: email,
  contactPhone: nigerianPhone,
  linkedinUrl: url,
  instagramHandle: socialHandle,
  supportPurpose: prose(20, 1200, "Why you want to support businesses"),
  preferredCategories: z.array(z.enum(BUSINESS_CATEGORIES)).min(1, "Pick at least one sector."),
  preferredStates: z.array(z.string().max(60)).max(37).default([]),
  budgetMinNgn: nairaAmount.optional(),
  budgetMaxNgn: nairaAmount.optional(),
  businessesTarget: z.coerce
    .number()
    .int()
    .min(1, "How many businesses would you like to support?")
    .max(1000),
  turnstileToken,
}).refine(
  (v) => v.budgetMinNgn === undefined || v.budgetMaxNgn === undefined || v.budgetMaxNgn >= v.budgetMinNgn,
  { message: "The maximum must be at least the minimum.", path: ["budgetMaxNgn"] },
);
export type BrandProfileInput = z.infer<typeof brandProfileSchema>;

// ------------------------------------------------------------- campaign ----

export const campaignSchema = z.object({
  name: z.string().trim().min(3, "Give the campaign a name.").max(120),
  summary: prose(10, 800, "The campaign summary"),
  budgetNgn: nairaAmount.optional(),
  businessesTarget: z.coerce.number().int().min(1, "How many businesses?").max(1000),
  preferredCategories: z.array(z.enum(BUSINESS_CATEGORIES)).default([]),
  preferredStates: z.array(z.string().max(60)).max(37).default([]),
  selectionOpensAt: z.string().optional(),
  selectionClosesAt: z.string().optional(),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

// -------------------------------------------------------- admin actions ----

export const reviewDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    /** Optional note shown to the applicant in the approval email. */
    applicantMessage: z.string().trim().max(600).optional(),
    internalReason: z.string().trim().max(600).optional(),
    feature: z.boolean().default(false),
  }),
  z.object({
    decision: z.literal("request_info"),
    items: z
      .array(
        z.object({
          fieldKey: z.string().min(1).max(60),
          message: z.string().trim().min(5, "Say what needs to change.").max(400),
        }),
      )
      .min(1, "Add at least one thing you need."),
    applicantMessage: z.string().trim().max(600).optional(),
  }),
  z.object({
    decision: z.literal("reject"),
    applicantMessage: z.string().trim().max(600).optional(),
    internalReason: z.string().trim().min(5, "Record why, for the audit log.").max(600),
  }),
]);
export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;

export const simpleReviewSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve"), internalReason: z.string().trim().max(600).optional() }),
  z.object({
    decision: z.literal("reject"),
    applicantMessage: z.string().trim().max(600).optional(),
    internalReason: z.string().trim().min(5, "Record why, for the audit log.").max(600),
  }),
]);

export const confirmationSchema = z.object({
  alajoProfileId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  selectionId: z.string().uuid().optional(),
  amountNgn: nairaAmount.optional(),
  supportKind: z.string().trim().max(80).optional(),
  supporterLabel: z.string().trim().min(2, "How should the supporter be described?").max(120),
  internalNote: z.string().trim().max(1000).optional(),
});

export const profileStatusSchema = z.object({
  action: z.enum(["feature", "unfeature", "suspend", "restore", "archive"]),
  reason: z.string().trim().max(600).optional(),
});

export const staffSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "reviewer"]),
  permissions: z.record(z.string(), z.boolean()).default({}),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(4000),
  audience: z.enum(["public", "alajos", "supporters", "brands"]),
  publish: z.boolean().default(false),
});

export const adminNoteSchema = z.object({
  entityTable: z.string().min(1).max(60),
  entityId: z.string().uuid(),
  body: z.string().trim().min(2, "Write a note.").max(2000),
});

// ---------------------------------------------------------------- media ----

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const ALLOWED_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export const mediaUploadSchema = z.object({
  kind: z.enum(MEDIA_KINDS),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  caption: z.string().trim().max(200).optional(),
});

/**
 * MIME type from the browser is a hint, not a fact, so the server also checks
 * the file's magic bytes before it is stored.
 */
export function validateFile(
  kind: (typeof MEDIA_KINDS)[number],
  mimeType: string,
  sizeBytes: number,
): { ok: true } | { ok: false; message: string } {
  const rules = {
    profile_photo: { types: ALLOWED_IMAGE_TYPES, max: MAX_IMAGE_BYTES, label: "an image" },
    business_photo: { types: ALLOWED_IMAGE_TYPES, max: MAX_IMAGE_BYTES, label: "an image" },
    video: { types: ALLOWED_VIDEO_TYPES, max: MAX_VIDEO_BYTES, label: "an MP4 or WebM video" },
    document: { types: ALLOWED_DOCUMENT_TYPES, max: MAX_DOCUMENT_BYTES, label: "a PDF or image" },
  }[kind];

  if (!(rules.types as readonly string[]).includes(mimeType)) {
    return { ok: false, message: `That file needs to be ${rules.label}.` };
  }
  if (sizeBytes <= 0) return { ok: false, message: "That file is empty." };
  if (sizeBytes > rules.max) {
    return { ok: false, message: `Keep files under ${Math.round(rules.max / (1024 * 1024))} MB.` };
  }
  return { ok: true };
}

const MAGIC_BYTES: Array<{ mime: string; test: (b: Uint8Array) => boolean }> = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    mime: "image/webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  { mime: "application/pdf", test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  // ISO base media (MP4) and its variants declare "ftyp" at offset 4.
  { mime: "video/mp4", test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
  { mime: "video/webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  // AVIF is also ISO base media; the brand string sits after "ftyp".
  { mime: "image/avif", test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
];

export function sniffMimeType(header: Uint8Array): string | null {
  for (const entry of MAGIC_BYTES) {
    if (entry.test(header)) return entry.mime;
  }
  return null;
}

/** Groups MIME types that share a container so sniffing stays useful. */
export function mimeMatchesSniff(declared: string, sniffed: string | null): boolean {
  if (!sniffed) return false;
  if (declared === sniffed) return true;
  const isoBase = new Set(["video/mp4", "image/avif"]);
  return isoBase.has(declared) && isoBase.has(sniffed);
}

// ------------------------------------------------------------ discovery ----

export const discoveryQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.enum(BUSINESS_CATEGORIES).optional(),
  state: z.string().trim().max(60).optional(),
  need: z.enum(["under_500k", "500k_2m", "2m_5m", "over_5m"]).optional(),
  sort: z.enum(["recent", "featured", "name"]).default("featured"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});
export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;

export const NEED_BANDS: Record<
  NonNullable<DiscoveryQuery["need"]>,
  { label: string; min: number; max: number | null }
> = {
  under_500k: { label: "Under ₦500k", min: 0, max: 500_000 },
  "500k_2m": { label: "₦500k – ₦2m", min: 500_000, max: 2_000_000 },
  "2m_5m": { label: "₦2m – ₦5m", min: 2_000_000, max: 5_000_000 },
  over_5m: { label: "Over ₦5m", min: 5_000_000, max: null },
};

export const contactSchema = z.object({
  name: fullName,
  email,
  phone: optionalPhone,
  topic: z.enum(["general", "brand_partnership", "application_help", "report_concern", "press"]),
  message: prose(10, 2000, "Your message"),
  turnstileToken,
});
