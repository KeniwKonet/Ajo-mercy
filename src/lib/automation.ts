import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { notify, staffRecipients, recipientFor } from "@/lib/events";
import { siteUrl } from "@/lib/env";

/**
 * Scheduled notices.
 *
 * Everything here runs on a timer rather than in response to someone doing
 * something, which changes what "safe" means. An action-triggered email is
 * sent once because the action happened once; a scheduled one will run again
 * tomorrow against the same rows and would send the same message again. So
 * every job below writes a dated idempotency key, and `sendEmail` drops a
 * repeat with a key it has already seen. That is the whole guard against
 * turning a helpful reminder into a daily nuisance.
 *
 * These jobs report what they measured and nothing else. No count here is
 * estimated, padded or rounded to sound more urgent, because the people
 * receiving them make decisions on the numbers.
 */

/** How long an unanswered information request waits before the first nudge. */
const INFO_REMINDER_AFTER_DAYS = 7;
/** How long an application may sit in the queue before staff are told. */
const QUEUE_AGEING_AFTER_DAYS = 5;

export interface JobResult {
  job: string;
  /** Rows that matched the job's condition. */
  matched: number;
  /** Messages actually dispatched, after duplicates were dropped. */
  sent: number;
  /** Set only when the job could not run; the caller reports it as a failure. */
  error?: string;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function daysBetween(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** A key that changes once per day, so a daily job sends at most once a day. */
function dayBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A key that changes once per week, for nudges that must be rarer. */
function weekBucket(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 86_400_000));
  return `${now.getUTCFullYear()}W${week}`;
}

// --------------------------------------------------------------- job one --

/**
 * Nudge applicants whose application is paused waiting on them.
 *
 * An application in `more_information_required` is not rejected and not in the
 * queue: it is stopped until the applicant replies. People reasonably assume
 * no news means it is still being looked at, so without this the application
 * quietly dies and neither side knows why.
 *
 * The list of what was asked for is not stored on the application; it is
 * passed through the event and into the email. So the reminder reads it back
 * out of the email we actually sent, which has two advantages over keeping a
 * second copy: it repeats the applicant's own message verbatim, and its
 * timestamp is precisely when we asked rather than whenever the row last
 * changed for some unrelated reason.
 *
 * At most one nudge per applicant per week.
 */
export async function remindStalledInformationRequests(): Promise<JobResult> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("alajo_applications")
    .select("id, user_id, business_name")
    .eq("status", "more_information_required");

  if (error) return { job: "info_reminder", matched: 0, sent: 0, error: error.message };

  const rows = (data ?? []) as Array<{
    id: string;
    user_id: string;
    business_name: string | null;
  }>;

  const cutoff = daysAgo(INFO_REMINDER_AFTER_DAYS);
  let matched = 0;
  let sent = 0;

  for (const row of rows) {
    // What we asked for, taken from the message the applicant actually got.
    const { data: askRow } = await admin
      .from("email_events")
      .select("payload, queued_at")
      .eq("event_type", "alajo.more_information_required")
      .eq("related_id", row.id)
      .order("queued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!askRow) continue;
    const ask = askRow as { payload: { items?: string[] } | null; queued_at: string };

    // Still inside the grace period: they have not had long enough yet.
    if (ask.queued_at >= cutoff) continue;

    // Reminding someone without saying what is outstanding wastes the send.
    const items = ask.payload?.items ?? [];
    if (items.length === 0) continue;

    matched += 1;

    const recipient = await recipientFor(row.user_id);
    if (!recipient) continue;

    const result = await sendEmail({
      type: "alajo.information_reminder",
      to: recipient.email,
      recipientUserId: recipient.userId,
      relatedTable: "alajo_applications",
      relatedId: row.id,
      idempotencyKey: `auto:info_reminder:${row.id}:${weekBucket()}`,
      data: {
        name: recipient.name,
        businessName: row.business_name ?? "your business",
        items,
        daysWaiting: daysBetween(ask.queued_at),
        dashboardUrl: `${siteUrl}/dashboard/alajo/application`,
      },
    });

    if (result.status === "sent" || result.status === "logged_only") {
      sent += 1;
      await notify(
        recipient.userId,
        "information_requested",
        "Your application is waiting on you",
        `We still need a few things before the review of ${row.business_name ?? "your business"} can continue.`,
        "/dashboard/alajo/application",
      );
    }
  }

  return { job: "info_reminder", matched, sent };
}

// --------------------------------------------------------------- job two --

/**
 * Tell staff when the review queue is ageing.
 *
 * Applications are reviewed oldest first, and a person is waiting at the other
 * end of each one. One message to the team carrying the real counts, rather
 * than one per application, which would train everyone to ignore it.
 */
export async function alertQueueAgeing(): Promise<JobResult> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("alajo_applications")
    .select("id, submitted_at, status")
    .in("status", ["submitted", "under_review"])
    .not("submitted_at", "is", null)
    .lt("submitted_at", daysAgo(QUEUE_AGEING_AFTER_DAYS))
    .order("submitted_at", { ascending: true });

  if (error) return { job: "queue_ageing", matched: 0, sent: 0, error: error.message };

  const rows = (data ?? []) as Array<{ id: string; submitted_at: string; status: string }>;
  // Ordered oldest first, so the head of the list is the longest wait.
  const oldest = rows[0];
  if (!oldest) return { job: "queue_ageing", matched: 0, sent: 0 };

  const oldestDays = daysBetween(oldest.submitted_at);
  const submitted = rows.filter((r) => r.status === "submitted").length;
  const underReview = rows.filter((r) => r.status === "under_review").length;

  const staff = await staffRecipients();
  let sent = 0;

  for (const member of staff) {
    const result = await sendEmail({
      type: "admin.queue_ageing",
      to: member.email,
      recipientUserId: member.userId,
      idempotencyKey: `auto:queue_ageing:${member.userId}:${dayBucket()}`,
      data: {
        adminName: member.name,
        oldestDays,
        waiting: rows.length,
        breakdown: [
          ["Not yet opened", String(submitted)],
          ["Opened, not decided", String(underReview)],
          ["Oldest in queue", `${oldestDays} days`],
        ],
        reviewUrl: `${siteUrl}/admin/alajos`,
      },
    });
    if (result.status === "sent" || result.status === "logged_only") sent += 1;
  }

  return { job: "queue_ageing", matched: rows.length, sent };
}

// ------------------------------------------------------------- job three --

/**
 * Tell staff when outbound mail is failing.
 *
 * This platform tells people things that matter to them: that they were
 * approved, that support was confirmed, that their application is paused. A
 * failed send is therefore not a logging problem, it is a person who was never
 * told. The template already existed; nothing was ever calling it.
 */
export async function alertEmailFailures(): Promise<JobResult> {
  const admin = createAdminSupabase();

  const { count, error } = await admin
    .from("email_events")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("queued_at", daysAgo(1));

  if (error) return { job: "email_failures", matched: 0, sent: 0, error: error.message };

  const failures = count ?? 0;
  if (failures === 0) return { job: "email_failures", matched: 0, sent: 0 };

  const staff = await staffRecipients();
  let sent = 0;

  for (const member of staff) {
    // The alert itself goes through the same pipeline it is reporting on. If
    // mail is down completely this will fail too, which is why the job's
    // result is also returned to the caller and logged.
    const result = await sendEmail({
      type: "admin.email_failures",
      to: member.email,
      recipientUserId: member.userId,
      idempotencyKey: `auto:email_failures:${member.userId}:${dayBucket()}`,
      data: {
        adminName: member.name,
        failureCount: failures,
        adminUrl: `${siteUrl}/admin/emails`,
      },
    });
    if (result.status === "sent" || result.status === "logged_only") sent += 1;

    await notify(
      member.userId,
      "email_failure",
      "Emails are failing to send",
      `${failures} outbound email${failures === 1 ? "" : "s"} failed in the last day.`,
      "/admin/emails",
    );
  }

  return { job: "email_failures", matched: failures, sent };
}

// ------------------------------------------------------------------ all ---

/**
 * Runs every scheduled notice. One job failing must not stop the others, so
 * each is caught separately and reported in the result.
 */
export async function runScheduledNotices(): Promise<JobResult[]> {
  const jobs = [remindStalledInformationRequests, alertQueueAgeing, alertEmailFailures];

  const results: JobResult[] = [];
  for (const job of jobs) {
    try {
      results.push(await job());
    } catch (err) {
      results.push({
        job: job.name,
        matched: 0,
        sent: 0,
        error: err instanceof Error ? err.message : "unknown error",
      });
    }
  }
  return results;
}
