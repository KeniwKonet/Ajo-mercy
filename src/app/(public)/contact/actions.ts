"use server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { enforceRateLimit, RateLimitError, RATE_LIMITS } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";
import { verifyTurnstile, TurnstileError } from "@/lib/turnstile";
import { contactSchema } from "@/lib/validation/schemas";
import { failure, success, toFieldErrors, type ActionResult } from "@/lib/validation/shared";

/**
 * Contact messages are stored as admin notes against a synthetic entity rather
 * than emailed straight out, so nothing user-supplied is ever rendered into an
 * outbound email template.
 */
const CONTACT_ENTITY = "contact_messages";

export async function submitContactAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const ctx = await getRequestContext();

  try {
    await enforceRateLimit(RATE_LIMITS.contact, ctx.ipHash);
    await verifyTurnstile(formData.get("turnstileToken")?.toString(), ctx.ip);
  } catch (err) {
    if (err instanceof RateLimitError || err instanceof TurnstileError) return failure(err.message);
    throw err;
  }

  const parsed = contactSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return failure("Please check the highlighted fields.", toFieldErrors(parsed.error));
  }

  const { name, email, phone, topic, message } = parsed.data;

  try {
    const admin = createAdminSupabase();
    const { error } = await admin.from("admin_notes").insert({
      entity_table: CONTACT_ENTITY,
      // A stable, meaningless uuid; contact messages have no parent record.
      entity_id: "00000000-0000-0000-0000-000000000000",
      body: [
        `Topic: ${topic}`,
        `From: ${name} <${email}>`,
        phone ? `Phone: ${phone}` : null,
        "",
        message,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });

    if (error) {
      console.error("[contact] insert failed", error.message);
      return failure("Could not send that. Please try again, or email us directly.");
    }
  } catch (err) {
    console.error("[contact] failed", err);
    return failure("Could not send that. Please try again, or email us directly.");
  }

  return success(
    topic === "report_concern"
      ? "Thank you. Reports like this are read first, and we will follow up."
      : "Message received. We will get back to you.",
  );
}
