import "server-only";

import { Resend } from "resend";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { emailEnabled, serverEnv, siteUrl } from "@/lib/env";
import { renderEmail, type EmailEventType, type EmailTemplateData } from "@/emails/templates";

let resendClient: Resend | null = null;
function resend(): Resend {
  if (!resendClient) resendClient = new Resend(serverEnv().RESEND_API_KEY!);
  return resendClient;
}

export interface SendEmailInput<K extends EmailEventType> {
  type: K;
  to: string;
  data: EmailTemplateData[K];
  recipientUserId?: string | null;
  relatedTable?: string | null;
  relatedId?: string | null;
  /**
   * Set for anything that could be triggered twice by a retry (approval,
   * confirmation). A repeat with the same key is dropped rather than resent.
   */
  idempotencyKey?: string | null;
}

export interface SendResult {
  emailEventId: string | null;
  status: "sent" | "failed" | "skipped_duplicate" | "logged_only";
}

/**
 * The one way mail leaves this platform. It logs first, sends second, and
 * records the outcome, so the admin delivery view is always the truth about
 * what a user did or did not receive.
 */
export async function sendEmail<K extends EmailEventType>(input: SendEmailInput<K>): Promise<SendResult> {
  const admin = createAdminSupabase();
  const rendered = renderEmail(input.type, input.data, siteUrl);

  if (input.idempotencyKey) {
    const { data: existing } = await admin
      .from("email_events")
      .select("id")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) return { emailEventId: (existing as { id: string }).id, status: "skipped_duplicate" };
  }

  const { data: eventRow, error: insertError } = await admin
    .from("email_events")
    .insert({
      event_type: input.type,
      recipient_email: input.to,
      recipient_user_id: input.recipientUserId ?? null,
      subject: rendered.subject,
      related_table: input.relatedTable ?? null,
      related_id: input.relatedId ?? null,
      status: "queued",
      payload: input.data as Record<string, unknown>,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("id")
    .single();

  if (insertError || !eventRow) {
    console.error("[email] could not log event", input.type, insertError?.message);
    return { emailEventId: null, status: "failed" };
  }

  const eventId = (eventRow as { id: string }).id;

  if (!emailEnabled()) {
    // Development without a Resend key: keep the audit trail honest rather
    // than pretending the message was delivered.
    console.info(`[email] (not configured) ${input.type} -> ${input.to}: ${rendered.subject}`);
    await admin
      .from("email_events")
      .update({ status: "failed", error_message: "RESEND_API_KEY not configured", failed_at: new Date().toISOString() })
      .eq("id", eventId);
    return { emailEventId: eventId, status: "logged_only" };
  }

  return dispatch(eventId, input.to, rendered.subject, rendered.html, rendered.text);
}

async function dispatch(
  eventId: string,
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<SendResult> {
  const admin = createAdminSupabase();
  const env = serverEnv();

  await admin
    .from("email_events")
    .update({ status: "sending" })
    .eq("id", eventId);

  try {
    const { data, error } = await resend().emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
      ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
    });

    if (error) throw new Error(error.message);

    await admin
      .from("email_events")
      .update({
        status: "sent",
        provider_message_id: data?.id ?? null,
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", eventId);

    return { emailEventId: eventId, status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] send failed", { eventId, to, subject, message });
    await admin
      .from("email_events")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
        failed_at: new Date().toISOString(),
      })
      .eq("id", eventId);
    return { emailEventId: eventId, status: "failed" };
  }
}

/** Re-sends a previously logged email. Used by the admin delivery view. */
export async function retryEmail(emailEventId: string): Promise<SendResult> {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("email_events")
    .select("id, event_type, recipient_email, payload, attempts")
    .eq("id", emailEventId)
    .single();

  if (error || !data) return { emailEventId, status: "failed" };

  const row = data as {
    id: string;
    event_type: EmailEventType;
    recipient_email: string;
    payload: Record<string, unknown>;
    attempts: number;
  };

  const rendered = renderEmail(row.event_type, row.payload as never, siteUrl);
  await admin
    .from("email_events")
    .update({ attempts: row.attempts + 1, error_message: null, failed_at: null })
    .eq("id", emailEventId);

  return dispatch(emailEventId, row.recipient_email, rendered.subject, rendered.html, rendered.text);
}
