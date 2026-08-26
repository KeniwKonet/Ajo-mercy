"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireRoleOrThrow, AuthorizationError } from "@/lib/auth";
import { emit } from "@/lib/events";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics";
import { enforceRateLimit, RateLimitError, RATE_LIMITS } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";
import { verifyTurnstile, TurnstileError } from "@/lib/turnstile";
import {
  calculateCompleteness,
  ensureApplication,
  missingRequirements,
} from "@/lib/data/applications";
import { assertTransition, InvalidTransitionError } from "@/lib/state-machine";
import {
  alajoBusinessSchema,
  alajoPersonalSchema,
  alajoStorySchema,
  mediaUploadSchema,
  submitApplicationSchema,
  validateFile,
} from "@/lib/validation/schemas";
import { failure, success, toFieldErrors, type ActionResult } from "@/lib/validation/shared";
import type { AlajoApplication, AlajoMedia } from "@/lib/types";
import { z } from "zod";

/**
 * Alajo application actions.
 *
 * Every one of these re-checks the caller's role. The RLS policies would also
 * refuse a cross-account write, but failing here gives a usable error message
 * instead of an opaque database rejection.
 */

async function requireAlajo() {
  return requireRoleOrThrow("alajo");
}

function handleGuardError<T = undefined>(err: unknown): ActionResult<T> | null {
  if (err instanceof AuthorizationError) return failure(err.message);
  if (err instanceof RateLimitError || err instanceof TurnstileError) return failure(err.message);
  if (err instanceof InvalidTransitionError) return failure(err.message);
  return null;
}

const STEP_SCHEMAS = {
  personal: alajoPersonalSchema,
  business: alajoBusinessSchema,
  story: alajoStorySchema,
} as const;

type Step = keyof typeof STEP_SCHEMAS;

/** Maps camelCase form keys onto the snake_case columns. */
const COLUMN_MAP: Record<string, keyof AlajoApplication> = {
  founderName: "founder_name",
  dateOfBirth: "date_of_birth",
  gender: "gender",
  personalPhone: "personal_phone",
  personalAddress: "personal_address",
  businessName: "business_name",
  businessCategory: "business_category",
  businessDescription: "business_description",
  yearStarted: "year_started",
  employeeCount: "employee_count",
  state: "state",
  city: "city",
  businessAddress: "business_address",
  businessPhone: "business_phone",
  websiteUrl: "website_url",
  instagramHandle: "instagram_handle",
  tiktokHandle: "tiktok_handle",
  xHandle: "x_handle",
  facebookUrl: "facebook_url",
  story: "story",
  currentChallenge: "current_challenge",
  supportWouldEnable: "support_would_enable",
  requestedAmountNgn: "requested_amount_ngn",
};

type ApplicationPatch = Partial<AlajoApplication>;

function toColumns(values: Record<string, unknown>): ApplicationPatch {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const column = COLUMN_MAP[key];
    if (column) patch[column] = value === "" ? null : value;
  }
  // The keys came from COLUMN_MAP, so they are all real columns; the values
  // were validated by the step schema before reaching here.
  return patch as ApplicationPatch;
}

/**
 * Saves one step. Validates that step's schema strictly so a half-finished
 * application still gets real feedback, rather than deferring every error to
 * the final submit.
 */
export async function saveStepAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireAlajo();
    const step = formData.get("step")?.toString() as Step | undefined;
    if (!step || !(step in STEP_SCHEMAS)) return failure("Unknown form step.");

    const application = await ensureApplication(profile.id);
    if (application.status !== "draft" && application.status !== "more_information_required") {
      return failure("This application is being reviewed and cannot be edited right now.");
    }

    const raw = Object.fromEntries(formData.entries());
    const parsed = STEP_SCHEMAS[step].safeParse(raw);
    if (!parsed.success) return failure("Please check the highlighted fields.", toFieldErrors(parsed.error));

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("alajo_applications")
      .update(toColumns(parsed.data))
      .eq("id", application.id);

    if (error) return failure(error.message);

    await refreshCompleteness(application.id);

    if (application.status === "draft" && !application.business_name) {
      await track(ANALYTICS_EVENTS.APPLICATION_STARTED, {
        userId: profile.id,
        role: "alajo",
        props: { application_id: application.id, step },
      });
    }

    revalidatePath("/dashboard/alajo");
    revalidatePath("/dashboard/alajo/application");
    return success("Saved.");
  } catch (err) {
    const handled = handleGuardError(err);
    if (handled) return handled;
    console.error("[alajo] saveStep failed", err);
    return failure("Could not save. Please try again.");
  }
}

/** Draft autosave. Accepts partial input and never blocks on validation. */
export async function saveDraftAction(values: Record<string, string>): Promise<ActionResult> {
  try {
    const profile = await requireAlajo();
    const application = await ensureApplication(profile.id);
    if (application.status !== "draft" && application.status !== "more_information_required") {
      return failure("This application cannot be edited right now.");
    }

    const columns = toColumns(values);
    // Numeric columns must not receive an empty string from a partial form.
    for (const key of ["year_started", "employee_count", "requested_amount_ngn"] as const) {
      if (key in columns) {
        const value = Number(columns[key]);
        columns[key] = Number.isFinite(value) ? value : null;
      }
    }
    if (Object.keys(columns).length === 0) return success();

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("alajo_applications")
      .update(columns)
      .eq("id", application.id);
    if (error) return failure(error.message);

    await refreshCompleteness(application.id);
    return success();
  } catch (err) {
    const handled = handleGuardError(err);
    if (handled) return handled;
    return failure("Could not save your draft.");
  }
}

const registerMediaSchema = mediaUploadSchema.extend({
  storagePath: z.string().min(3).max(400),
  mimeType: z.string().min(3).max(120),
  sizeBytes: z.coerce.number().int().positive(),
});

/**
 * Registers a file the browser uploaded straight to Storage. The upload itself
 * is constrained by a storage policy that requires the object to sit under the
 * uploader's own user id; here we re-check type and size, confirm the path
 * really belongs to this user, and confirm the object exists before trusting it.
 */
export async function registerMediaAction(input: unknown): Promise<ActionResult<AlajoMedia>> {
  try {
    const profile = await requireAlajo();
    const ctx = await getRequestContext();
    await enforceRateLimit(RATE_LIMITS.mediaUpload, ctx.ipHash ?? profile.id);

    const parsed = registerMediaSchema.safeParse(input);
    if (!parsed.success) return failure("That upload was not valid.", toFieldErrors(parsed.error));

    const { kind, documentType, caption, storagePath, mimeType, sizeBytes } = parsed.data;

    const fileCheck = validateFile(kind, mimeType, sizeBytes);
    if (!fileCheck.ok) return failure(fileCheck.message);

    if (!storagePath.startsWith(`${profile.id}/`)) {
      return failure("That upload path is not yours.");
    }

    const application = await ensureApplication(profile.id);
    if (application.status !== "draft" && application.status !== "more_information_required") {
      return failure("This application cannot be edited right now.");
    }

    const bucket = kind === "document" ? "alajo-documents" : "alajo-public";
    const admin = createAdminSupabase();

    // Confirm the object exists and matches the declared size, so a client
    // cannot register a row pointing at a file it never uploaded.
    const folder = storagePath.slice(0, storagePath.lastIndexOf("/"));
    const filename = storagePath.slice(storagePath.lastIndexOf("/") + 1);
    const { data: listed } = await admin.storage.from(bucket).list(folder, { search: filename, limit: 1 });
    const stored = listed?.[0];
    if (!stored) return failure("We could not find that upload. Please try again.");

    const storedSize = (stored.metadata as { size?: number } | null)?.size;
    if (typeof storedSize === "number" && storedSize !== sizeBytes) {
      return failure("That upload did not finish cleanly. Please try again.");
    }

    const supabase = await createServerSupabase();
    const { data: existing } = await supabase
      .from("alajo_media")
      .select("id")
      .eq("application_id", application.id)
      .eq("kind", kind);

    const { data, error } = await supabase
      .from("alajo_media")
      .insert({
        application_id: application.id,
        kind,
        document_type: documentType ?? null,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        caption: caption ?? null,
        sort_order: existing?.length ?? 0,
      })
      .select("*")
      .single();

    if (error || !data) return failure(error?.message ?? "Could not save that file.");

    await refreshCompleteness(application.id);
    revalidatePath("/dashboard/alajo/application");
    return success("Uploaded.", data as AlajoMedia);
  } catch (err) {
    const handled = handleGuardError<AlajoMedia>(err);
    if (handled) return handled;
    console.error("[alajo] registerMedia failed", err);
    return failure("Could not save that file.");
  }
}

export async function deleteMediaAction(mediaId: string): Promise<ActionResult> {
  try {
    const profile = await requireAlajo();
    const supabase = await createServerSupabase();

    const { data: media } = await supabase
      .from("alajo_media")
      .select("id, kind, storage_path, application_id")
      .eq("id", mediaId)
      .maybeSingle();

    if (!media) return failure("That file is already gone.");
    const row = media as Pick<AlajoMedia, "id" | "kind" | "storage_path" | "application_id">;

    // RLS restricts the delete to the owner's editable application; deleting
    // the row first means an orphaned object is the worst case, not a dangling
    // reference to a file that no longer exists.
    const { error } = await supabase.from("alajo_media").delete().eq("id", mediaId);
    if (error) return failure(error.message);

    const admin = createAdminSupabase();
    const bucket = row.kind === "document" ? "alajo-documents" : "alajo-public";
    await admin.storage.from(bucket).remove([row.storage_path]);

    await refreshCompleteness(row.application_id);
    revalidatePath("/dashboard/alajo/application");
    return success("Removed.");
  } catch (err) {
    const handled = handleGuardError(err);
    if (handled) return handled;
    return failure("Could not remove that file.");
  }
}

/**
 * Submits, or resubmits after an information request. The transition is checked
 * in TypeScript for the message and again by the database trigger for safety.
 */
export async function submitApplicationAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const profile = await requireAlajo();
    const ctx = await getRequestContext();

    await enforceRateLimit(RATE_LIMITS.applicationSubmit, ctx.ipHash ?? profile.id);
    await verifyTurnstile(formData.get("turnstileToken")?.toString(), ctx.ip);

    const raw = Object.fromEntries(formData.entries());
    const parsed = submitApplicationSchema.safeParse({
      ...raw,
      confirmAccurate: raw.confirmAccurate === "on" || raw.confirmAccurate === "true",
      confirmNoGuarantee: raw.confirmNoGuarantee === "on" || raw.confirmNoGuarantee === "true",
    });
    if (!parsed.success) return failure("Please confirm both statements.", toFieldErrors(parsed.error));

    const supabase = await createServerSupabase();
    const { data: appRow } = await supabase
      .from("alajo_applications")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!appRow) return failure("Start an application first.");
    const application = appRow as AlajoApplication;

    const { data: mediaRows } = await supabase
      .from("alajo_media")
      .select("kind")
      .eq("application_id", application.id);
    const media = (mediaRows ?? []) as Pick<AlajoMedia, "kind">[];

    const missing = missingRequirements(application, media);
    if (missing.length > 0) {
      return failure(
        `Still needed before you can submit: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? ` and ${missing.length - 4} more` : ""}.`,
      );
    }

    const wasResubmission = application.status === "more_information_required";
    assertTransition("application", application.status, "submitted");

    const { error } = await supabase
      .from("alajo_applications")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", application.id);

    if (error) return failure(error.message);

    if (wasResubmission) {
      // Clear the outstanding requests: the applicant has answered them.
      const admin = createAdminSupabase();
      await admin
        .from("verification_requests")
        .update({ resolved_at: new Date().toISOString() })
        .eq("application_id", application.id)
        .is("resolved_at", null);
    }

    await emit({
      type: "alajo.application_submitted",
      applicationId: application.id,
      resubmission: wasResubmission,
    });

    revalidatePath("/dashboard/alajo");
    revalidatePath("/dashboard/alajo/application");
    return success(
      wasResubmission
        ? "Resubmitted. We will look at it again shortly."
        : "Submitted. We will email you when there is an update.",
    );
  } catch (err) {
    const handled = handleGuardError(err);
    if (handled) return handled;
    console.error("[alajo] submit failed", err);
    return failure("Could not submit. Please try again.");
  }
}

export async function withdrawApplicationAction(): Promise<ActionResult> {
  try {
    const profile = await requireAlajo();
    const supabase = await createServerSupabase();
    const { data: appRow } = await supabase
      .from("alajo_applications")
      .select("id, status")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!appRow) return failure("There is no application to withdraw.");
    const application = appRow as Pick<AlajoApplication, "id" | "status">;

    assertTransition("application", application.status, "withdrawn");
    const { error } = await supabase
      .from("alajo_applications")
      .update({ status: "withdrawn" })
      .eq("id", application.id);
    if (error) return failure(error.message);

    revalidatePath("/dashboard/alajo");
    return success("Your application has been withdrawn.");
  } catch (err) {
    const handled = handleGuardError(err);
    if (handled) return handled;
    return failure("Could not withdraw the application.");
  }
}

/** Keeps the stored completeness in step with the current fields and media. */
async function refreshCompleteness(applicationId: string): Promise<void> {
  const admin = createAdminSupabase();
  const [{ data: app }, { data: media }] = await Promise.all([
    admin.from("alajo_applications").select("*").eq("id", applicationId).maybeSingle(),
    admin.from("alajo_media").select("kind").eq("application_id", applicationId),
  ]);
  if (!app) return;
  const completeness = calculateCompleteness(
    app as AlajoApplication,
    (media ?? []) as Pick<AlajoMedia, "kind">[],
  );
  await admin.from("alajo_applications").update({ completeness }).eq("id", applicationId);
}
