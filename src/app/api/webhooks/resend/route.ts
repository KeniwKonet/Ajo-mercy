import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { EmailEvent, EmailStatus } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Resend delivery webhook. Moves an email_event from "sent" to what actually
 * happened, so the admin delivery view reflects reality rather than what we
 * handed to the provider.
 *
 * Resend signs with the Svix scheme: the signature covers
 * `${id}.${timestamp}.${body}` keyed by the base64 part of the secret.
 */
const EVENT_STATUS: Record<string, EmailStatus> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "sending",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

const TOLERANCE_SECONDS = 5 * 60;

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const body = await request.text();

  if (!secret) {
    // Refuse rather than accept unauthenticated writes to delivery state.
    console.warn("[resend-webhook] RESEND_WEBHOOK_SECRET is not set; rejecting");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  if (!verifySignature(request, body, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { type?: string; data?: { email_id?: string; created_at?: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const status = payload.type ? EVENT_STATUS[payload.type] : undefined;
  const providerMessageId = payload.data?.email_id;

  if (!status || !providerMessageId) {
    // An event we do not track. Acknowledge so Resend stops retrying it.
    return NextResponse.json({ ok: true, ignored: payload.type ?? "unknown" });
  }

  const at = payload.data?.created_at ?? new Date().toISOString();
  const patch: Partial<EmailEvent> = { status };
  if (status === "delivered") patch.delivered_at = at;
  if (status === "bounced" || status === "complained") {
    patch.failed_at = at;
    patch.error_message = `Provider reported ${payload.type}`;
  }

  try {
    const admin = createAdminSupabase();
    const { error } = await admin
      .from("email_events")
      .update(patch)
      .eq("provider_message_id", providerMessageId);

    if (error) {
      console.error("[resend-webhook] update failed", error.message);
      // A 500 makes Resend retry, which is what we want for a transient fault.
      return NextResponse.json({ error: "Could not record" }, { status: 500 });
    }
  } catch (err) {
    console.error("[resend-webhook] unexpected", err);
    return NextResponse.json({ error: "Could not record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function verifySignature(request: NextRequest, body: string, secret: string): boolean {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatureHeader = request.headers.get("svix-signature");

  if (!id || !timestamp || !signatureHeader) return false;

  // Reject replays of an old, validly signed request.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");

  // The header carries space-separated `v1,<signature>` entries.
  return signatureHeader
    .split(" ")
    .map((part) => part.split(",")[1])
    .some((candidate) => candidate !== undefined && safeEqual(candidate, expected));
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
