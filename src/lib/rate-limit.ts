import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";

export interface RateLimitRule {
  /** Bucket name, also the audit key. */
  bucket: string;
  limit: number;
  windowSeconds: number;
}

/** Every limited action in one place, so the numbers are reviewable. */
export const RATE_LIMITS = {
  signup: { bucket: "signup", limit: 5, windowSeconds: 3600 },
  login: { bucket: "login", limit: 10, windowSeconds: 900 },
  passwordReset: { bucket: "password_reset", limit: 4, windowSeconds: 3600 },
  applicationSubmit: { bucket: "application_submit", limit: 6, windowSeconds: 3600 },
  selection: { bucket: "selection", limit: 12, windowSeconds: 3600 },
  mediaUpload: { bucket: "media_upload", limit: 40, windowSeconds: 3600 },
  contact: { bucket: "contact", limit: 5, windowSeconds: 3600 },
  adminAction: { bucket: "admin_action", limit: 300, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

export class RateLimitError extends Error {
  readonly status = 429;
  constructor(readonly retryAfterSeconds: number) {
    super("Too many attempts. Please wait a moment and try again.");
    this.name = "RateLimitError";
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window counter held in Postgres. Chosen over an in-memory limiter
 * because serverless instances do not share memory, and over Redis because it
 * removes a dependency for a volume this platform will not exceed.
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  identifier: string | null,
): Promise<RateLimitResult> {
  if (!identifier) {
    // No identifier means we cannot attribute the request; fail closed.
    return { allowed: false, remaining: 0, retryAfterSeconds: rule.windowSeconds };
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin.rpc("bump_rate_limit", {
    p_bucket: rule.bucket,
    p_identifier: identifier,
    p_window_seconds: rule.windowSeconds,
  });

  if (error) {
    // A limiter outage must not take the platform down, but it must be loud.
    console.error("[rate-limit] bump failed", { bucket: rule.bucket, error: error.message });
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }

  const count = typeof data === "number" ? data : rule.limit + 1;
  const now = Math.floor(Date.now() / 1000);
  const retryAfterSeconds = rule.windowSeconds - (now % rule.windowSeconds);

  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds,
  };
}

export async function enforceRateLimit(rule: RateLimitRule, identifier: string | null): Promise<void> {
  const result = await checkRateLimit(rule, identifier);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
}
