"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireRoleOrThrow, AuthorizationError } from "@/lib/auth";
import { emit } from "@/lib/events";
import { enforceRateLimit, RateLimitError, RATE_LIMITS } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";
import { verifyTurnstile, TurnstileError } from "@/lib/turnstile";
import { assertTransition, InvalidTransitionError } from "@/lib/state-machine";
import { supporterProfileSchema } from "@/lib/validation/schemas";
import { failure, success, toFieldErrors, type ActionResult } from "@/lib/validation/shared";
import type { BusinessCategory, SupporterProfile } from "@/lib/types";

/**
 * Supporter registration. One form, submitted once; there is no draft stage
 * because it is short enough to complete in a sitting.
 */
export async function submitSupporterProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const profile = await requireRoleOrThrow("supporter");
    const ctx = await getRequestContext();

    await enforceRateLimit(RATE_LIMITS.applicationSubmit, ctx.ipHash ?? profile.id);
    await verifyTurnstile(formData.get("turnstileToken")?.toString(), ctx.ip);

    const parsed = supporterProfileSchema.safeParse({
      ...Object.fromEntries(formData.entries()),
      interests: formData.getAll("interests").map(String),
    });

    if (!parsed.success) {
      return failure("Please check the highlighted fields.", toFieldErrors(parsed.error));
    }

    const supabase = await createServerSupabase();
    const { data: existingRow } = await supabase
      .from("supporter_profiles")
      .select("id, status")
      .eq("user_id", profile.id)
      .maybeSingle();

    const existing = existingRow as Pick<SupporterProfile, "id" | "status"> | null;

    if (existing && !["draft", "more_information_required"].includes(existing.status)) {
      return failure("Your registration has already been submitted.");
    }

    const values = {
      phone: parsed.data.phone,
      state: parsed.data.state,
      city: parsed.data.city,
      occupation: parsed.data.occupation,
      motivation: parsed.data.motivation,
      how_heard: parsed.data.howHeard ?? null,
      interests: parsed.data.interests as BusinessCategory[],
      status: "submitted" as const,
      submitted_at: new Date().toISOString(),
    };

    if (existing) {
      assertTransition("application", existing.status, "submitted");
      const { error } = await supabase.from("supporter_profiles").update(values).eq("id", existing.id);
      if (error) return failure(error.message);
    } else {
      const { error } = await supabase
        .from("supporter_profiles")
        .insert({ user_id: profile.id, ...values });
      if (error) return failure(error.message);
    }

    await emit({ type: "supporter.submitted", userId: profile.id });

    revalidatePath("/dashboard/supporter");
    return success("Registration submitted. We will email you once it is reviewed.");
  } catch (err) {
    if (err instanceof AuthorizationError) return failure(err.message);
    if (err instanceof RateLimitError || err instanceof TurnstileError) return failure(err.message);
    if (err instanceof InvalidTransitionError) return failure(err.message);
    console.error("[supporter] submit failed", err);
    return failure("Could not submit your registration. Please try again.");
  }
}

/** Lets a supporter take back a selection that has not been acted on yet. */
export async function withdrawSelectionAction(selectionId: string): Promise<ActionResult> {
  try {
    const profile = await requireRoleOrThrow("supporter");
    const supabase = await createServerSupabase();

    const { data: row } = await supabase
      .from("support_selections")
      .select("id, status, selector_id")
      .eq("id", selectionId)
      .maybeSingle();

    if (!row) return failure("That selection no longer exists.");
    const selection = row as { id: string; status: string; selector_id: string };

    if (selection.selector_id !== profile.id) return failure("That is not your selection.");
    if (selection.status !== "recorded") {
      return failure("The team has already started reviewing this selection.");
    }

    assertTransition("selection", selection.status, "withdrawn");
    const { error } = await supabase
      .from("support_selections")
      .update({ status: "withdrawn" })
      .eq("id", selectionId);

    if (error) return failure(error.message);

    revalidatePath("/dashboard/supporter");
    return success("Selection withdrawn. That selection is available again.");
  } catch (err) {
    if (err instanceof AuthorizationError) return failure(err.message);
    if (err instanceof InvalidTransitionError) return failure(err.message);
    return failure("Could not withdraw that selection.");
  }
}
