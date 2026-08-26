"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requirePermissionOrThrow, AuthorizationError } from "@/lib/auth";
import { emit } from "@/lib/events";
import { retryEmail } from "@/lib/email/send";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";
import { assertTransition, InvalidTransitionError } from "@/lib/state-machine";
import {
  adminNoteSchema,
  announcementSchema,
  confirmationSchema,
  profileStatusSchema,
  reviewDecisionSchema,
  simpleReviewSchema,
  staffSchema,
} from "@/lib/validation/schemas";
import { failure, success, toFieldErrors, type ActionResult } from "@/lib/validation/shared";
import { FIELD_LABELS } from "@/lib/data/application-fields";
import type {
  AlajoApplication,
  AlajoProfile,
  BrandProfile,
  SupportCampaign,
  SupportConfirmation,
  SupporterProfile,
} from "@/lib/types";
import { z } from "zod";

/**
 * Administrative actions.
 *
 * Every one of these: checks a specific permission, validates its input,
 * asserts the state transition, performs the change, writes an audit row, and
 * emits a domain event. That order matters — the audit row is written from the
 * same code path that made the change, so it cannot drift.
 */

function guard(err: unknown): ActionResult | null {
  if (err instanceof AuthorizationError) return failure(err.message);
  if (err instanceof InvalidTransitionError) return failure(err.message);
  return null;
}

// ------------------------------------------------- alajo application review --

export async function reviewAlajoApplicationAction(input: {
  applicationId: string;
  decision: unknown;
}): Promise<ActionResult> {
  try {
    const parsed = reviewDecisionSchema.safeParse(input.decision);
    if (!parsed.success) return failure("Check the decision form.", toFieldErrors(parsed.error));

    const decision = parsed.data;
    const permission =
      decision.decision === "approve"
        ? "alajo.approve"
        : decision.decision === "reject"
          ? "alajo.reject"
          : "alajo.request_info";

    const reviewer = await requirePermissionOrThrow(permission);
    const admin = createAdminSupabase();

    const { data: appRow } = await admin
      .from("alajo_applications")
      .select("id, status, business_name, user_id")
      .eq("id", input.applicationId)
      .maybeSingle();

    if (!appRow) return failure("That application no longer exists.");
    const application = appRow as Pick<AlajoApplication, "id" | "status" | "business_name" | "user_id">;
    const label = application.business_name ?? "Untitled application";

    if (decision.decision === "approve") {
      assertTransition("application", application.status, "approved");

      // One transaction: application approved, profile published, user activated.
      const { data, error } = await admin.rpc("approve_alajo_application", {
        p_application_id: application.id,
        p_reviewer_id: reviewer.id,
        p_applicant_message: decision.applicantMessage ?? null,
        p_feature: decision.feature,
      });

      if (error) {
        console.error("[admin] approve failed", error.message);
        return failure(error.message);
      }

      const result = Array.isArray(data) ? data[0] : null;

      await recordAudit({
        actor: reviewer,
        action: AUDIT_ACTIONS.ALAJO_APPLICATION_APPROVED,
        entityTable: "alajo_applications",
        entityId: application.id,
        entityLabel: label,
        before: { status: application.status },
        after: { status: "approved", slug: result?.slug ?? null, featured: decision.feature },
        reason: decision.internalReason ?? null,
      });

      await emit({
        type: "alajo.application_approved",
        applicationId: application.id,
        ...(decision.applicantMessage ? { message: decision.applicantMessage } : {}),
      });

      revalidateAdmin(application.id);
      revalidatePath("/alajos");
      return success(`${label} is approved and live.`);
    }

    if (decision.decision === "request_info") {
      assertTransition("application", application.status, "more_information_required");

      const { error } = await admin
        .from("alajo_applications")
        .update({
          status: "more_information_required",
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewer.id,
          applicant_message: decision.applicantMessage ?? null,
        })
        .eq("id", application.id);

      if (error) return failure(error.message);

      await admin.from("verification_requests").insert(
        decision.items.map((item) => ({
          application_id: application.id,
          field_key: item.fieldKey,
          message: item.message,
          requested_by: reviewer.id,
        })),
      );

      await recordAudit({
        actor: reviewer,
        action: AUDIT_ACTIONS.ALAJO_APPLICATION_INFO_REQUESTED,
        entityTable: "alajo_applications",
        entityId: application.id,
        entityLabel: label,
        before: { status: application.status },
        after: { status: "more_information_required", items: decision.items.length },
      });

      await emit({
        type: "alajo.information_requested",
        applicationId: application.id,
        items: decision.items.map(
          (item) => `${FIELD_LABELS[item.fieldKey] ?? item.fieldKey}: ${item.message}`,
        ),
        ...(decision.applicantMessage ? { message: decision.applicantMessage } : {}),
      });

      revalidateAdmin(application.id);
      return success(`Sent ${decision.items.length} request${decision.items.length === 1 ? "" : "s"} to ${label}.`);
    }

    // reject
    assertTransition("application", application.status, "rejected");

    const { error } = await admin
      .from("alajo_applications")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer.id,
        decision_reason: decision.internalReason,
        applicant_message: decision.applicantMessage ?? null,
      })
      .eq("id", application.id);

    if (error) return failure(error.message);

    await recordAudit({
      actor: reviewer,
      action: AUDIT_ACTIONS.ALAJO_APPLICATION_REJECTED,
      entityTable: "alajo_applications",
      entityId: application.id,
      entityLabel: label,
      before: { status: application.status },
      after: { status: "rejected" },
      reason: decision.internalReason,
    });

    await emit({
      type: "alajo.application_rejected",
      applicationId: application.id,
      ...(decision.applicantMessage ? { message: decision.applicantMessage } : {}),
    });

    revalidateAdmin(application.id);
    return success(`${label} was not approved.`);
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    console.error("[admin] review failed", err);
    return failure("Could not record that decision.");
  }
}

/** Marks an application as being actively looked at, so reviewers do not collide. */
export async function startReviewAction(applicationId: string): Promise<ActionResult> {
  try {
    const reviewer = await requirePermissionOrThrow("alajo.review");
    const admin = createAdminSupabase();

    const { data } = await admin
      .from("alajo_applications")
      .select("id, status, business_name")
      .eq("id", applicationId)
      .maybeSingle();
    if (!data) return failure("That application no longer exists.");
    const application = data as Pick<AlajoApplication, "id" | "status" | "business_name">;

    if (application.status !== "submitted") return success();

    assertTransition("application", application.status, "under_review");
    await admin
      .from("alajo_applications")
      .update({ status: "under_review", reviewed_by: reviewer.id })
      .eq("id", applicationId);

    await recordAudit({
      actor: reviewer,
      action: AUDIT_ACTIONS.ALAJO_APPLICATION_REVIEW_STARTED,
      entityTable: "alajo_applications",
      entityId: applicationId,
      entityLabel: application.business_name ?? "Untitled application",
    });

    revalidateAdmin(applicationId);
    return success();
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    return failure("Could not start the review.");
  }
}

// ------------------------------------------------------- profile lifecycle --

export async function updateProfileStatusAction(input: {
  profileId: string;
  action: unknown;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const parsed = profileStatusSchema.safeParse({ action: input.action, reason: input.reason });
    if (!parsed.success) return failure("Unknown action.");

    const needsSuspend = ["suspend", "archive"].includes(parsed.data.action);
    const reviewer = await requirePermissionOrThrow(needsSuspend ? "alajo.suspend" : "alajo.feature");

    const admin = createAdminSupabase();
    const { data } = await admin
      .from("alajo_profiles")
      .select("id, status, business_name")
      .eq("id", input.profileId)
      .maybeSingle();
    if (!data) return failure("That profile no longer exists.");
    const profile = data as Pick<AlajoProfile, "id" | "status" | "business_name">;

    const target = {
      feature: "featured",
      unfeature: "approved",
      suspend: "suspended",
      restore: "approved",
      archive: "archived",
    }[parsed.data.action] as AlajoProfile["status"];

    assertTransition("alajo_profile", profile.status, target);

    const patch: Partial<AlajoProfile> = { status: target };
    if (parsed.data.action === "feature") patch.featured_at = new Date().toISOString();
    if (parsed.data.action === "unfeature") patch.featured_at = null;
    if (parsed.data.action === "archive") patch.archived_at = new Date().toISOString();

    const { error } = await admin.from("alajo_profiles").update(patch).eq("id", profile.id);
    if (error) return failure(error.message);

    const auditAction = {
      feature: AUDIT_ACTIONS.ALAJO_PROFILE_FEATURED,
      unfeature: AUDIT_ACTIONS.ALAJO_PROFILE_UNFEATURED,
      suspend: AUDIT_ACTIONS.ALAJO_PROFILE_SUSPENDED,
      restore: AUDIT_ACTIONS.ALAJO_PROFILE_RESTORED,
      archive: AUDIT_ACTIONS.ALAJO_PROFILE_ARCHIVED,
    }[parsed.data.action];

    await recordAudit({
      actor: reviewer,
      action: auditAction,
      entityTable: "alajo_profiles",
      entityId: profile.id,
      entityLabel: profile.business_name,
      before: { status: profile.status },
      after: { status: target },
      reason: parsed.data.reason ?? null,
    });

    revalidatePath("/admin/alajos");
    revalidatePath("/alajos");
    return success("Updated.");
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    return failure("Could not update that profile.");
  }
}

// ---------------------------------------------- supporter and brand review --

export async function reviewSupporterAction(input: {
  userId: string;
  decision: unknown;
}): Promise<ActionResult> {
  try {
    const parsed = simpleReviewSchema.safeParse(input.decision);
    if (!parsed.success) return failure("Check the decision form.", toFieldErrors(parsed.error));

    const reviewer = await requirePermissionOrThrow("supporter.review");
    const admin = createAdminSupabase();

    const { data } = await admin
      .from("supporter_profiles")
      .select("id, status, user_id")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (!data) return failure("That registration no longer exists.");
    const supporter = data as Pick<SupporterProfile, "id" | "status" | "user_id">;

    const target = parsed.data.decision === "approve" ? "approved" : "rejected";
    assertTransition("application", supporter.status, target);

    const { data: personRow } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", input.userId)
      .maybeSingle();
    const name = (personRow as { full_name: string } | null)?.full_name ?? "Supporter";

    const { error } = await admin
      .from("supporter_profiles")
      .update({
        status: target,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer.id,
        decision_reason: parsed.data.internalReason ?? null,
      })
      .eq("id", supporter.id);

    if (error) return failure(error.message);

    // The account itself only becomes usable when the registration is approved.
    await admin
      .from("profiles")
      .update({ status: target === "approved" ? "approved" : "rejected" })
      .eq("id", input.userId);

    await recordAudit({
      actor: reviewer,
      action: target === "approved" ? AUDIT_ACTIONS.SUPPORTER_APPROVED : AUDIT_ACTIONS.SUPPORTER_REJECTED,
      entityTable: "supporter_profiles",
      entityId: supporter.id,
      entityLabel: name,
      before: { status: supporter.status },
      after: { status: target },
      reason: parsed.data.internalReason ?? null,
    });

    if (target === "approved") {
      await emit({ type: "supporter.approved", userId: input.userId });
    } else {
      await emit({
        type: "supporter.rejected",
        userId: input.userId,
        ...(parsed.data.decision === "reject" && parsed.data.applicantMessage
          ? { message: parsed.data.applicantMessage }
          : {}),
      });
    }

    revalidatePath("/admin/supporters");
    return success(target === "approved" ? `${name} is approved.` : `${name} was not approved.`);
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    console.error("[admin] supporter review failed", err);
    return failure("Could not record that decision.");
  }
}

export async function reviewBrandAction(input: {
  userId: string;
  decision: unknown;
}): Promise<ActionResult> {
  try {
    const parsed = simpleReviewSchema.safeParse(input.decision);
    if (!parsed.success) return failure("Check the decision form.", toFieldErrors(parsed.error));

    const reviewer = await requirePermissionOrThrow("brand.review");
    const admin = createAdminSupabase();

    const { data } = await admin
      .from("brand_profiles")
      .select("id, status, organisation_name, slug")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (!data) return failure("That registration no longer exists.");
    const brand = data as Pick<BrandProfile, "id" | "status" | "organisation_name" | "slug">;

    const target = parsed.data.decision === "approve" ? "approved" : "rejected";
    assertTransition("application", brand.status, target);

    const patch: Partial<BrandProfile> = {
      status: target,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewer.id,
      decision_reason: parsed.data.internalReason ?? null,
    };

    // Give an approved brand a public slug so it can be referenced by name.
    if (target === "approved" && !brand.slug && brand.organisation_name) {
      patch.slug = await uniqueBrandSlug(brand.organisation_name);
    }

    const { error } = await admin.from("brand_profiles").update(patch).eq("id", brand.id);
    if (error) return failure(error.message);

    await admin
      .from("profiles")
      .update({ status: target === "approved" ? "approved" : "rejected" })
      .eq("id", input.userId);

    await recordAudit({
      actor: reviewer,
      action: target === "approved" ? AUDIT_ACTIONS.BRAND_APPROVED : AUDIT_ACTIONS.BRAND_REJECTED,
      entityTable: "brand_profiles",
      entityId: brand.id,
      entityLabel: brand.organisation_name ?? "Brand",
      before: { status: brand.status },
      after: { status: target },
      reason: parsed.data.internalReason ?? null,
    });

    if (target === "approved") {
      await emit({ type: "brand.approved", userId: input.userId });
    } else {
      await emit({
        type: "brand.rejected",
        userId: input.userId,
        ...(parsed.data.decision === "reject" && parsed.data.applicantMessage
          ? { message: parsed.data.applicantMessage }
          : {}),
      });
    }

    revalidatePath("/admin/brands");
    return success(
      target === "approved"
        ? `${brand.organisation_name ?? "The brand"} is approved.`
        : `${brand.organisation_name ?? "The brand"} was not approved.`,
    );
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    console.error("[admin] brand review failed", err);
    return failure("Could not record that decision.");
  }
}

// ------------------------------------------------------------- campaigns ----

const campaignStatusSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum([
    "open",
    "selection_period",
    "under_review",
    "confirmed",
    "announced",
    "completed",
    "cancelled",
  ]),
  note: z.string().trim().max(400).optional(),
});

export async function updateCampaignStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = campaignStatusSchema.safeParse(input);
    if (!parsed.success) return failure("Unknown campaign action.");

    const reviewer = await requirePermissionOrThrow("campaign.manage");
    const admin = createAdminSupabase();

    const { data } = await admin
      .from("support_campaigns")
      .select("id, status, name")
      .eq("id", parsed.data.campaignId)
      .maybeSingle();
    if (!data) return failure("That campaign no longer exists.");
    const campaign = data as { id: string; status: string; name: string };

    assertTransition("campaign", campaign.status, parsed.data.status);

    const patch: Partial<SupportCampaign> = { status: parsed.data.status };
    if (parsed.data.status === "announced") patch.announced_at = new Date().toISOString();
    if (parsed.data.status === "completed") patch.completed_at = new Date().toISOString();

    const { error } = await admin.from("support_campaigns").update(patch).eq("id", campaign.id);
    if (error) return failure(error.message);

    await recordAudit({
      actor: reviewer,
      action: AUDIT_ACTIONS.CAMPAIGN_STATUS_CHANGED,
      entityTable: "support_campaigns",
      entityId: campaign.id,
      entityLabel: campaign.name,
      before: { status: campaign.status },
      after: { status: parsed.data.status },
      reason: parsed.data.note ?? null,
    });

    await emit({
      type: "campaign.status_changed",
      campaignId: campaign.id,
      note: parsed.data.note ?? statusNote(parsed.data.status),
    });

    revalidatePath("/admin/campaigns");
    return success("Campaign updated.");
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    return failure("Could not update the campaign.");
  }
}

function statusNote(status: string): string {
  switch (status) {
    case "selection_period":
      return "You can now browse verified businesses and submit your selections.";
    case "under_review":
      return "Your selections are with the Ajo Mercy team for confirmation.";
    case "confirmed":
      return "The recipients for this campaign have been confirmed.";
    case "announced":
      return "The businesses have been notified and the campaign is announced.";
    case "completed":
      return "This campaign is complete. Thank you.";
    case "cancelled":
      return "This campaign has been cancelled.";
    default:
      return "Your campaign status has changed.";
  }
}

// ------------------------------------------- selections and confirmations ---

const selectionReviewSchema = z.object({
  selectionId: z.string().uuid(),
  action: z.enum(["shortlist", "decline"]),
});

export async function reviewSelectionAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = selectionReviewSchema.safeParse(input);
    if (!parsed.success) return failure("Unknown action.");

    const reviewer = await requirePermissionOrThrow("campaign.review_selections");
    const admin = createAdminSupabase();

    const { data } = await admin
      .from("support_selections")
      .select("id, status, alajo_profile_id")
      .eq("id", parsed.data.selectionId)
      .maybeSingle();
    if (!data) return failure("That selection no longer exists.");
    const selection = data as { id: string; status: string; alajo_profile_id: string };

    const target = parsed.data.action === "shortlist" ? "shortlisted" : "declined";
    assertTransition("selection", selection.status, target);

    const { error } = await admin
      .from("support_selections")
      .update({ status: target })
      .eq("id", selection.id);
    if (error) return failure(error.message);

    await recordAudit({
      actor: reviewer,
      action: target === "shortlisted" ? AUDIT_ACTIONS.SELECTION_SHORTLISTED : AUDIT_ACTIONS.SELECTION_DECLINED,
      entityTable: "support_selections",
      entityId: selection.id,
      before: { status: selection.status },
      after: { status: target },
    });

    revalidatePath("/admin/selections");
    return success(target === "shortlisted" ? "Shortlisted." : "Declined.");
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    return failure("Could not update that selection.");
  }
}

/** Creates the pending support record. Nothing is announced at this point. */
export async function createConfirmationAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = confirmationSchema.safeParse(input);
    if (!parsed.success) return failure("Check the support details.", toFieldErrors(parsed.error));

    const reviewer = await requirePermissionOrThrow("confirmation.create");
    const admin = createAdminSupabase();

    const { data: profileRow } = await admin
      .from("alajo_profiles")
      .select("id, business_name")
      .eq("id", parsed.data.alajoProfileId)
      .maybeSingle();
    if (!profileRow) return failure("That business no longer exists.");
    const business = profileRow as Pick<AlajoProfile, "id" | "business_name">;

    const { data, error } = await admin
      .from("support_confirmations")
      .insert({
        alajo_profile_id: parsed.data.alajoProfileId,
        campaign_id: parsed.data.campaignId ?? null,
        selection_id: parsed.data.selectionId ?? null,
        amount_ngn: parsed.data.amountNgn ?? null,
        support_kind: parsed.data.supportKind ?? null,
        supporter_label: parsed.data.supporterLabel,
        internal_note: parsed.data.internalNote ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !data) return failure(error?.message ?? "Could not create the support record.");

    await recordAudit({
      actor: reviewer,
      action: AUDIT_ACTIONS.CONFIRMATION_CREATED,
      entityTable: "support_confirmations",
      entityId: (data as { id: string }).id,
      entityLabel: business.business_name,
      after: { status: "pending", amount: parsed.data.amountNgn ?? null },
    });

    revalidatePath("/admin/confirmations");
    return success(`Support record created for ${business.business_name}. Nothing has been sent yet.`);
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    return failure("Could not create the support record.");
  }
}

const confirmationStatusSchema = z.object({
  confirmationId: z.string().uuid(),
  action: z.enum(["confirm", "announce", "complete", "cancel"]),
  reason: z.string().trim().max(400).optional(),
});

/**
 * The deliberate gate. Moving a record to `confirmed` is what triggers the
 * congratulations email, and it is a separate, permissioned, confirmed action —
 * never a side effect of someone making a selection.
 */
export async function updateConfirmationAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = confirmationStatusSchema.safeParse(input);
    if (!parsed.success) return failure("Unknown action.");

    const permission = parsed.data.action === "announce" ? "confirmation.announce" : "confirmation.confirm";
    const reviewer = await requirePermissionOrThrow(permission);
    const admin = createAdminSupabase();

    const { data } = await admin
      .from("support_confirmations")
      .select("id, status, alajo_profile_id")
      .eq("id", parsed.data.confirmationId)
      .maybeSingle();
    if (!data) return failure("That support record no longer exists.");
    const confirmation = data as Pick<SupportConfirmation, "id" | "status" | "alajo_profile_id">;

    const target = {
      confirm: "confirmed",
      announce: "announced",
      complete: "completed",
      cancel: "cancelled",
    }[parsed.data.action] as SupportConfirmation["status"];

    assertTransition("confirmation", confirmation.status, target);

    const patch: Partial<SupportConfirmation> = { status: target };
    const now = new Date().toISOString();
    if (target === "confirmed") {
      patch.confirmed_at = now;
      patch.confirmed_by = reviewer.id;
    }
    if (target === "announced") patch.announced_at = now;
    if (target === "completed") patch.completed_at = now;

    const { error } = await admin
      .from("support_confirmations")
      .update(patch)
      .eq("id", confirmation.id);
    if (error) return failure(error.message);

    const { data: businessRow } = await admin
      .from("alajo_profiles")
      .select("business_name")
      .eq("id", confirmation.alajo_profile_id)
      .maybeSingle();
    const label = (businessRow as { business_name: string } | null)?.business_name ?? "A business";

    const auditAction = {
      confirmed: AUDIT_ACTIONS.CONFIRMATION_CONFIRMED,
      announced: AUDIT_ACTIONS.CONFIRMATION_ANNOUNCED,
      completed: AUDIT_ACTIONS.CONFIRMATION_COMPLETED,
      cancelled: AUDIT_ACTIONS.CONFIRMATION_CANCELLED,
      pending: AUDIT_ACTIONS.CONFIRMATION_CREATED,
    }[target];

    await recordAudit({
      actor: reviewer,
      action: auditAction,
      entityTable: "support_confirmations",
      entityId: confirmation.id,
      entityLabel: label,
      before: { status: confirmation.status },
      after: { status: target },
      reason: parsed.data.reason ?? null,
    });

    // Only confirmation tells the business it has been supported.
    if (target === "confirmed") {
      await emit({ type: "support.confirmed", confirmationId: confirmation.id });
    }

    revalidatePath("/admin/confirmations");
    revalidatePath("/impact");
    return success(
      target === "confirmed"
        ? `Confirmed. ${label} has been emailed.`
        : `Marked as ${target}.`,
    );
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    console.error("[admin] confirmation failed", err);
    return failure("Could not update that support record.");
  }
}

// --------------------------------------------------------------- notes ------

export async function addAdminNoteAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = adminNoteSchema.safeParse(input);
    if (!parsed.success) return failure("Write a note first.", toFieldErrors(parsed.error));

    const author = await requirePermissionOrThrow("alajo.review");
    const admin = createAdminSupabase();

    const { error } = await admin.from("admin_notes").insert({
      author_id: author.id,
      entity_table: parsed.data.entityTable,
      entity_id: parsed.data.entityId,
      body: parsed.data.body,
    });
    if (error) return failure(error.message);

    await recordAudit({
      actor: author,
      action: AUDIT_ACTIONS.ADMIN_NOTE_ADDED,
      entityTable: parsed.data.entityTable,
      entityId: parsed.data.entityId,
    });

    revalidatePath(`/admin/alajos/${parsed.data.entityId}`);
    return success("Note added.");
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    return failure("Could not add that note.");
  }
}

// --------------------------------------------------------------- email ------

export async function retryEmailAction(emailEventId: string): Promise<ActionResult> {
  try {
    const actor = await requirePermissionOrThrow("email.retry");
    const result = await retryEmail(emailEventId);

    await recordAudit({
      actor,
      action: AUDIT_ACTIONS.EMAIL_RETRIED,
      entityTable: "email_events",
      entityId: emailEventId,
      after: { status: result.status },
    });

    revalidatePath("/admin/emails");
    return result.status === "sent"
      ? success("Sent.")
      : failure("That still did not send. Check the error on the row.");
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    return failure("Could not retry that email.");
  }
}

// ---------------------------------------------------------------- staff -----

export async function updateStaffAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = staffSchema.safeParse(input);
    if (!parsed.success) return failure("Check the form.", toFieldErrors(parsed.error));

    // Only the super admin can mint staff. The database trigger enforces this
    // too, so a bug here cannot become a privilege escalation.
    const actor = await requirePermissionOrThrow("staff.manage");
    const admin = createAdminSupabase();

    const { data } = await admin
      .from("profiles")
      .select("id, role, email, full_name, permissions")
      .eq("id", parsed.data.userId)
      .maybeSingle();
    if (!data) return failure("No such account.");
    const target = data as {
      id: string;
      role: string;
      email: string;
      full_name: string;
      permissions: Record<string, boolean>;
    };

    if (target.role === "super_admin") return failure("The super admin account cannot be changed here.");

    const { error } = await admin
      .from("profiles")
      .update({ role: parsed.data.role, permissions: parsed.data.permissions, status: "approved" })
      .eq("id", target.id);
    if (error) return failure(error.message);

    await recordAudit({
      actor,
      action: AUDIT_ACTIONS.STAFF_ROLE_CHANGED,
      entityTable: "profiles",
      entityId: target.id,
      entityLabel: target.full_name,
      before: { role: target.role, permissions: target.permissions },
      after: { role: parsed.data.role, permissions: parsed.data.permissions },
    });

    revalidatePath("/admin/staff");
    return success(`${target.full_name} is now ${parsed.data.role}.`);
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    return failure("Could not update that account.");
  }
}

// -------------------------------------------------------- announcements -----

export async function saveAnnouncementAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = announcementSchema.safeParse(input);
    if (!parsed.success) return failure("Check the form.", toFieldErrors(parsed.error));

    const actor = await requirePermissionOrThrow("announcement.manage");
    const admin = createAdminSupabase();

    const { data, error } = await admin
      .from("announcements")
      .insert({
        title: parsed.data.title,
        body: parsed.data.body,
        audience: parsed.data.audience,
        published_at: parsed.data.publish ? new Date().toISOString() : null,
        created_by: actor.id,
      })
      .select("id")
      .single();

    if (error || !data) return failure(error?.message ?? "Could not save the announcement.");

    if (parsed.data.publish) {
      await recordAudit({
        actor,
        action: AUDIT_ACTIONS.ANNOUNCEMENT_PUBLISHED,
        entityTable: "announcements",
        entityId: (data as { id: string }).id,
        entityLabel: parsed.data.title,
      });
    }

    revalidatePath("/admin/announcements");
    return success(parsed.data.publish ? "Published." : "Saved as a draft.");
  } catch (err) {
    const handled = guard(err);
    if (handled) return handled;
    return failure("Could not save that announcement.");
  }
}

// -------------------------------------------------------------- helpers -----

function revalidateAdmin(applicationId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/alajos");
  revalidatePath(`/admin/alajos/${applicationId}`);
  revalidatePath("/dashboard/alajo");
}

async function uniqueBrandSlug(name: string): Promise<string> {
  const admin = createAdminSupabase();
  const root =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "brand";

  let candidate = root;
  let suffix = 1;
  for (;;) {
    const { data } = await admin.from("brand_profiles").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}
