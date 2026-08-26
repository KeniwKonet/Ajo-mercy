import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Email confirmation and recovery landing point.
 *
 * Links in our own Resend templates come here rather than to Supabase's hosted
 * pages, so the session cookie is set on our domain and the user lands on a page
 * we designed. The token is verified server-side; nothing is trusted from the
 * query string beyond being passed to `verifyOtp`.
 */
const ALLOWED_TYPES: EmailOtpType[] = ["signup", "recovery", "email_change", "invite", "magiclink"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/";

  // Only same-site relative paths, so this cannot be used as an open redirect.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.warn("[auth] confirm failed", error.message);
    return NextResponse.redirect(new URL("/login?error=expired_link", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
