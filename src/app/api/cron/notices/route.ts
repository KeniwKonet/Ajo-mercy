import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduledNotices } from "@/lib/automation";
import { serverEnv } from "@/lib/env";

/**
 * The scheduled-notice endpoint.
 *
 * This route can send mail to real people, so it is treated as a privileged
 * operation rather than a health check. It authenticates against a shared
 * secret and refuses outright when that secret is not configured: an
 * unprotected version of this URL would let anyone on the internet trigger
 * reminders to every applicant, repeatedly.
 *
 * Vercel Cron calls it with `Authorization: Bearer <CRON_SECRET>`, which is
 * also how it can be run by hand during an incident.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/* The jobs walk the review queue and send in sequence, so give them room. */
export const maxDuration = 60;

/** Constant-time compare, so a wrong secret cannot be found byte by byte. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorise(request: Request): NextResponse | null {
  const expected = serverEnv().CRON_SECRET;

  // Unset means "not deployed yet", not "allow everyone".
  if (!expected) {
    return NextResponse.json(
      { error: "Scheduled notices are not configured on this deployment." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token || !secretMatches(token, expected)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  const denied = authorise(request);
  if (denied) return denied;

  const started = Date.now();
  const results = await runScheduledNotices();
  const failed = results.filter((r) => r.error);

  // A job that could not run is reported as a failure so the scheduler's own
  // log shows it, rather than a 200 that hides a broken reminder for weeks.
  return NextResponse.json(
    {
      ok: failed.length === 0,
      ranForMs: Date.now() - started,
      results,
    },
    { status: failed.length === 0 ? 200 : 500 },
  );
}

/** Vercel Cron issues GET, so both verbs run the same work behind the same check. */
export async function GET(request: Request) {
  return POST(request);
}
