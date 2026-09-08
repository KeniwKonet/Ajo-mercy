import { z } from "zod";

/**
 * Environment is validated once, at module load, and split by trust boundary.
 * `serverEnv` is only ever imported from server-only modules; importing it into
 * a client component is a build error because of the `server-only` guard in the
 * modules that consume it.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  RESEND_API_KEY: z.string().min(10).optional(),
  EMAIL_FROM: z.string().default("Ajo Mercy <hello@ajomercy.com>"),
  EMAIL_REPLY_TO: z.string().optional(),
  ADMIN_ALERT_EMAIL: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  HASH_SALT: z.string().min(16),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  /* Shared secret for the scheduled-notice endpoint. Optional so local and
     preview builds run without it, but the route refuses to do anything when
     it is unset, rather than running unauthenticated. */
  CRON_SECRET: z.string().min(16).optional(),
});

function readPublic() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid public environment variables:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}\nSee .env.example.`,
    );
  }
  return parsed.data;
}

export const publicEnv = readPublic();

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid server environment variables:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}\nSee .env.example.`,
    );
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Email sending is optional in development; log to console when unconfigured. */
export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Turnstile is skipped when unconfigured so local development is not blocked. */
export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
