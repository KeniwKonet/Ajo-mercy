"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionProfile, requireProfileOrThrow, AuthorizationError } from "@/lib/auth";
import { emit } from "@/lib/events";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";
import { enforceRateLimit, RateLimitError, RATE_LIMITS } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";
import { verifyTurnstile, TurnstileError } from "@/lib/turnstile";
import { selectionSchema } from "@/lib/validation/schemas";
import { failure, success, toFieldErrors, type ActionResult } from "@/lib/validation/shared";
import type { BrandProfile, SupporterProfile } from "@/lib/types";

/**
 * Selection is the moment most open to abuse, so it is the most heavily
 * guarded path in the product: rate limit, Turnstile, approval check, credit
 * check, and a unique index that makes a duplicate impossible even under a race.
 */

export type Eligibility =
  | { state: "anonymous" }
  | { state: "unverified" }
  | { state: "pending_approval" }
  | { state: "rejected" }
  | { state: "wrong_role" }
  | { state: "no_credits"; remaining: 0 }
  | { state: "already_selected" }
  | { state: "eligible"; remaining: number; kind: "supporter" | "brand" };

/** What the support panel needs to know, without exposing anyone else's data. */
export async function getSelectionEligibility(alajoProfileId: string): Promise<Eligibility> {
  const profile = await getSessionProfile();
  if (!profile) return { state: "anonymous" };
  if (!profile.email_verified_at) return { state: "unverified" };

  const admin = createAdminSupabase();

  if (profile.role === "supporter") {
    const { data } = await admin
      .from("supporter_profiles")
      .select("status, selection_credits")
      .eq("user_id", profile.id)
      .maybeSingle();
    const supporter = data as Pick<SupporterProfile, "status" | "selection_credits"> | null;

    if (!supporter || ["draft", "submitted", "under_review", "more_information_required"].includes(supporter.status)) {
      return { state: "pending_approval" };
    }
    if (supporter.status !== "approved") return { state: "rejected" };

    const { count: used } = await admin
      .from("support_selections")
      .select("id", { count: "exact", head: true })
      .eq("selector_id", profile.id)
      .neq("status", "withdrawn");

    const { count: dupe } = await admin
      .from("support_selections")
      .select("id", { count: "exact", head: true })
      .eq("selector_id", profile.id)
      .eq("alajo_profile_id", alajoProfileId)
      .neq("status", "withdrawn");

    if ((dupe ?? 0) > 0) return { state: "already_selected" };

    const remaining = supporter.selection_credits - (used ?? 0);
    if (remaining <= 0) return { state: "no_credits", remaining: 0 };
    return { state: "eligible", remaining, kind: "supporter" };
  }

  if (profile.role === "brand") {
    const { data } = await admin
      .from("brand_profiles")
      .select("status")
      .eq("user_id", profile.id)
      .maybeSingle();
    const brand = data as Pick<BrandProfile, "status"> | null;
    if (!brand || brand.status !== "approved") return { state: "pending_approval" };

    const { count: dupe } = await admin
      .from("support_selections")
      .select("id", { count: "exact", head: true })
      .eq("selector_id", profile.id)
      .eq("alajo_profile_id", alajoProfileId)
      .neq("status", "withdrawn");

    if ((dupe ?? 0) > 0) return { state: "already_selected" };
    return { state: "eligible", remaining: Number.POSITIVE_INFINITY, kind: "brand" };
  }

  return { state: "wrong_role" };
}

export async function recordSelectionAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireProfileOrThrow();
    const ctx = await getRequestContext();

    // Limit per account and per address: one person with many accounts is the
    // failure mode this is really guarding against.
    await enforceRateLimit(RATE_LIMITS.selection, profile.id);
    await enforceRateLimit(RATE_LIMITS.selection, ctx.ipHash);
    await verifyTurnstile(formData.get("turnstileToken")?.toString(), ctx.ip);

    const raw = Object.fromEntries(formData.entries());
    const parsed = selectionSchema.safeParse({
      ...raw,
      campaignId: raw.campaignId || undefined,
      note: raw.note || undefined,
      confirmUnderstanding: raw.confirmUnderstanding === "on" || raw.confirmUnderstanding === "true",
    });

    if (!parsed.success) {
      return failure("Please confirm before selecting.", toFieldErrors(parsed.error));
    }

    const eligibility = await getSelectionEligibility(parsed.data.alajoProfileId);
    if (eligibility.state !== "eligible") {
      return failure(ELIGIBILITY_MESSAGES[eligibility.state]);
    }

    const admin = createAdminSupabase();
    const { data: selectionId, error } = await admin.rpc("record_selection", {
      p_alajo_profile_id: parsed.data.alajoProfileId,
      p_selector_id: profile.id,
      p_selector_kind: eligibility.kind,
      p_campaign_id: parsed.data.campaignId ?? null,
      p_note: parsed.data.note ?? null,
      p_ip_hash: ctx.ipHash,
      p_device_hash: ctx.deviceHash,
      p_user_agent: ctx.userAgent?.slice(0, 400) ?? null,
    });

    if (error) {
      // 23505 is the unique index: the same selector already picked this business.
      if (error.code === "23505") return failure("You have already selected this business.");
      console.error("[selection] rpc failed", error.message);
      return failure(error.message.includes("selections") ? error.message : "Could not record that selection.");
    }

    const id = selectionId as unknown as string;

    await recordAudit({
      actor: profile,
      action: AUDIT_ACTIONS.SELECTION_RECORDED,
      entityTable: "support_selections",
      entityId: id,
      entityLabel: `${profile.full_name} selected a business`,
    });

    await emit({ type: "supporter.selection_recorded", selectionId: id });

    revalidatePath("/dashboard/supporter");
    return success(
      "Selection recorded. The Ajo Mercy team reviews every selection before support is confirmed.",
    );
  } catch (err) {
    if (err instanceof AuthorizationError) return failure(err.message);
    if (err instanceof RateLimitError || err instanceof TurnstileError) return failure(err.message);
    console.error("[selection] failed", err);
    return failure("Could not record that selection. Please try again.");
  }
}

const ELIGIBILITY_MESSAGES: Record<Exclude<Eligibility["state"], "eligible">, string> = {
  anonymous: "Sign in to select a business.",
  unverified: "Confirm your email address first.",
  pending_approval: "Your account is still being reviewed. We will email you when it is approved.",
  rejected: "Your account is not approved to make selections.",
  wrong_role: "Only approved supporters and brands can select businesses.",
  no_credits: "You have used all of your selections.",
  already_selected: "You have already selected this business.",
};

export async function getEligibilityMessage(state: Exclude<Eligibility["state"], "eligible">) {
  return ELIGIBILITY_MESSAGES[state];
}
