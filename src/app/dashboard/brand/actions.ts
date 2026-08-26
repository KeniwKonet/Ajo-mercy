"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireRoleOrThrow, AuthorizationError } from "@/lib/auth";
import { emit } from "@/lib/events";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";
import { enforceRateLimit, RateLimitError, RATE_LIMITS } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";
import { verifyTurnstile, TurnstileError } from "@/lib/turnstile";
import { assertTransition, InvalidTransitionError } from "@/lib/state-machine";
import { brandProfileSchema, campaignSchema, selectionSchema } from "@/lib/validation/schemas";
import { failure, success, toFieldErrors, type ActionResult } from "@/lib/validation/shared";
import { slugify } from "@/lib/format";
import type { BrandProfile, BusinessCategory, SupportCampaign } from "@/lib/types";

async function requireBrand() {
  return requireRoleOrThrow("brand");
}

function guard(err: unknown): ActionResult | null {
  if (err instanceof AuthorizationError) return failure(err.message);
  if (err instanceof RateLimitError || err instanceof TurnstileError) return failure(err.message);
  if (err instanceof InvalidTransitionError) return failure(err.message);
  return null;
}

/** Registers or resubmits the organisation for review. */
export async function submitBrandProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const profile = await requireBrand();
    const ctx = await getRequestContext();

    await enforceRateLimit(RATE_LIMITS.applicationSubmit, ctx.ipHash ?? profile.id);
    await verifyTurnstile(formData.get("turnstileToken")?.toString(), ctx.ip);

    const parsed = brandProfileSchema.safeParse({
      ...Object.fromEntries(formData.entries()),
      preferredCategories: formData.getAll("preferredCategories").map(String),
      preferredStates: formData.getAll("preferredStates").map(String),
      budgetMinNgn: formData.get("budgetMinNgn") || undefined,
      budgetMaxNgn: formData.get("budgetMaxNgn") || undefined,
    });

    if (!parsed.success) {
      return failure("Please check the highlighted fields.", toFieldErrors(parsed.error));
    }

    const supabase = await createServerSupabase();
    const { data: existingRow } = await supabase
      .from("brand_profiles")
      .select("id, status, slug")
      .eq("user_id", profile.id)
      .maybeSingle();

    const existing = existingRow as Pick<BrandProfile, "id" | "status" | "slug"> | null;
    if (existing && !["draft", "more_information_required"].includes(existing.status)) {
      return failure("Your registration has already been submitted.");
    }

    const d = parsed.data;
    const values = {
      organisation_name: d.organisationName,
      registration_number: d.registrationNumber ?? null,
      website_url: d.websiteUrl ?? null,
      industry: d.industry,
      about: d.about,
      contact_person_name: d.contactPersonName,
      contact_person_role: d.contactPersonRole,
      contact_email: d.contactEmail,
      contact_phone: d.contactPhone,
      linkedin_url: d.linkedinUrl ?? null,
      instagram_handle: d.instagramHandle ?? null,
      support_purpose: d.supportPurpose,
      preferred_categories: d.preferredCategories as BusinessCategory[],
      preferred_states: d.preferredStates,
      budget_min_ngn: d.budgetMinNgn ?? null,
      budget_max_ngn: d.budgetMaxNgn ?? null,
      businesses_target: d.businessesTarget,
      status: "submitted" as const,
      submitted_at: new Date().toISOString(),
    };

    if (existing) {
      assertTransition("application", existing.status, "submitted");
      const { error } = await supabase.from("brand_profiles").update(values).eq("id", existing.id);
      if (error) return failure(error.message);
    } else {
      const { error } = await supabase
        .from("brand_profiles")
        .insert({ user_id: profile.id, ...values });
      if (error) return failure(error.message);
    }

    await emit({ type: "brand.submitted", userId: profile.id });

    revalidatePath("/dashboard/brand");
    return success("Registration submitted. We will be in touch once it has been reviewed.");
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    console.error("[brand] submit failed", err);
    return failure("Could not submit your registration. Please try again.");
  }
}

/**
 * Creates a campaign as a draft, then immediately opens it for admin review.
 * Brands cannot publish a campaign themselves; the Ajo Mercy team moves it into
 * the selection period.
 */
export async function createCampaignAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireBrand();

    const parsed = campaignSchema.safeParse({
      ...Object.fromEntries(formData.entries()),
      preferredCategories: formData.getAll("preferredCategories").map(String),
      preferredStates: formData.getAll("preferredStates").map(String),
      budgetNgn: formData.get("budgetNgn") || undefined,
    });

    if (!parsed.success) {
      return failure("Please check the highlighted fields.", toFieldErrors(parsed.error));
    }

    const supabase = await createServerSupabase();
    const { data: brandRow } = await supabase
      .from("brand_profiles")
      .select("id, status, organisation_name")
      .eq("user_id", profile.id)
      .maybeSingle();

    const brand = brandRow as Pick<BrandProfile, "id" | "status" | "organisation_name"> | null;
    if (!brand || brand.status !== "approved") {
      return failure("Your organisation needs to be approved before you can create a campaign.");
    }

    const d = parsed.data;
    const admin = createAdminSupabase();
    const slug = await uniqueCampaignSlug(`${brand.organisation_name ?? "campaign"}-${d.name}`);

    const { data: created, error } = await admin
      .from("support_campaigns")
      .insert({
        brand_id: brand.id,
        created_by: profile.id,
        slug,
        name: d.name,
        summary: d.summary,
        budget_ngn: d.budgetNgn ?? null,
        businesses_target: d.businessesTarget,
        preferred_categories: d.preferredCategories as BusinessCategory[],
        preferred_states: d.preferredStates,
        selection_opens_at: d.selectionOpensAt || null,
        selection_closes_at: d.selectionClosesAt || null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !created) return failure(error?.message ?? "Could not create the campaign.");
    const campaignId = (created as { id: string }).id;

    // draft -> open puts it in front of the admin team for review.
    await admin.from("support_campaigns").update({ status: "open" }).eq("id", campaignId);

    await recordAudit({
      actor: profile,
      action: AUDIT_ACTIONS.CAMPAIGN_CREATED,
      entityTable: "support_campaigns",
      entityId: campaignId,
      entityLabel: d.name,
    });

    await emit({ type: "campaign.created", campaignId });

    revalidatePath("/dashboard/brand/campaigns");
    return success("Campaign created. The Ajo Mercy team will review it and open selections.");
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    console.error("[brand] createCampaign failed", err);
    return failure("Could not create the campaign.");
  }
}

/** A brand selecting a business for one of its own campaigns. */
export async function brandSelectAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireBrand();
    const ctx = await getRequestContext();

    await enforceRateLimit(RATE_LIMITS.selection, profile.id);
    await verifyTurnstile(formData.get("turnstileToken")?.toString(), ctx.ip);

    const parsed = selectionSchema.safeParse({
      ...Object.fromEntries(formData.entries()),
      confirmUnderstanding: formData.get("confirmUnderstanding") === "on" || formData.get("confirmUnderstanding") === "true",
      note: formData.get("note") || undefined,
    });

    if (!parsed.success) return failure("Please confirm before selecting.", toFieldErrors(parsed.error));
    if (!parsed.data.campaignId) return failure("Choose which campaign this selection belongs to.");

    const supabase = await createServerSupabase();
    const { data: brandRow } = await supabase
      .from("brand_profiles")
      .select("id, status")
      .eq("user_id", profile.id)
      .maybeSingle();
    const brand = brandRow as Pick<BrandProfile, "id" | "status"> | null;
    if (!brand || brand.status !== "approved") return failure("Your organisation is not approved yet.");

    // The campaign must belong to this brand and be accepting selections.
    const { data: campaignRow } = await supabase
      .from("support_campaigns")
      .select("id, brand_id, status, businesses_target")
      .eq("id", parsed.data.campaignId)
      .maybeSingle();
    const campaign = campaignRow as Pick<
      SupportCampaign,
      "id" | "brand_id" | "status" | "businesses_target"
    > | null;

    if (!campaign || campaign.brand_id !== brand.id) return failure("That campaign is not yours.");
    if (campaign.status !== "selection_period") {
      return failure("This campaign is not open for selections right now.");
    }

    const admin = createAdminSupabase();
    const { count } = await admin
      .from("support_selections")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .neq("status", "withdrawn");

    if ((count ?? 0) >= campaign.businesses_target) {
      return failure(
        `This campaign is set to support ${campaign.businesses_target} ${campaign.businesses_target === 1 ? "business" : "businesses"} and that many are already selected.`,
      );
    }

    const { data: selectionId, error } = await admin.rpc("record_selection", {
      p_alajo_profile_id: parsed.data.alajoProfileId,
      p_selector_id: profile.id,
      p_selector_kind: "brand",
      p_campaign_id: campaign.id,
      p_note: parsed.data.note ?? null,
      p_ip_hash: ctx.ipHash,
      p_device_hash: ctx.deviceHash,
      p_user_agent: ctx.userAgent?.slice(0, 400) ?? null,
    });

    if (error) {
      if (error.code === "23505") return failure("You have already selected this business for this campaign.");
      return failure("Could not record that selection.");
    }

    const id = selectionId as unknown as string;

    await recordAudit({
      actor: profile,
      action: AUDIT_ACTIONS.SELECTION_RECORDED,
      entityTable: "support_selections",
      entityId: id,
      entityLabel: "Brand selection",
    });

    await emit({
      type: "alajo.selected_for_consideration",
      alajoProfileId: parsed.data.alajoProfileId,
      campaignId: campaign.id,
    });

    revalidatePath(`/dashboard/brand/campaigns/${campaign.id}`);
    return success("Selection recorded. The Ajo Mercy team confirms before anything is arranged.");
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    console.error("[brand] select failed", err);
    return failure("Could not record that selection.");
  }
}

async function uniqueCampaignSlug(base: string): Promise<string> {
  const admin = createAdminSupabase();
  const root = slugify(base).slice(0, 60) || "campaign";
  let candidate = root;
  let suffix = 1;

  for (;;) {
    const { data } = await admin
      .from("support_campaigns")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}
