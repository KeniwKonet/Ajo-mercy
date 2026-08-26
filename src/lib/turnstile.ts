import "server-only";

import { serverEnv, turnstileEnabled } from "@/lib/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export class TurnstileError extends Error {
  readonly status = 400;
  constructor() {
    super("Could not verify that you are human. Please try again.");
    this.name = "TurnstileError";
  }
}

/**
 * Verifies a Turnstile token server-side. When Turnstile is not configured
 * (local development) verification is skipped rather than silently passing a
 * bad token, and the skip is logged so it cannot go unnoticed in production.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<void> {
  if (!turnstileEnabled()) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[turnstile] not configured in production; bot protection is off");
    }
    return;
  }
  if (!token) throw new TurnstileError();

  const body = new URLSearchParams({ secret: serverEnv().TURNSTILE_SECRET_KEY!, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!json.success) {
      console.warn("[turnstile] rejected", json["error-codes"]);
      throw new TurnstileError();
    }
  } catch (err) {
    if (err instanceof TurnstileError) throw err;
    console.error("[turnstile] verification request failed", err);
    throw new TurnstileError();
  }
}
