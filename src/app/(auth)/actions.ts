"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { provisionUser } from "@/lib/auth";
import { emit } from "@/lib/events";
import { sendEmail } from "@/lib/email/send";
import { enforceRateLimit, RateLimitError, RATE_LIMITS } from "@/lib/rate-limit";
import { getRequestContext } from "@/lib/request-context";
import { verifyTurnstile, TurnstileError } from "@/lib/turnstile";
import { siteUrl } from "@/lib/env";
import {
  requestResetSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/schemas";
import { failure, success, toFieldErrors, type ActionResult } from "@/lib/validation/shared";
import { homeFor } from "@/lib/rbac";
import type { Profile } from "@/lib/types";

/**
 * Auth actions. Each one rate limits first, verifies Turnstile second, and
 * validates third, so a flood of malformed requests is cheap to reject.
 */

function readForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/** Never reveals whether an address is registered. */
const GENERIC_AUTH_ERROR = "That email and password combination did not work.";

export async function signUpAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const ctx = await getRequestContext();

  try {
    await enforceRateLimit(RATE_LIMITS.signup, ctx.ipHash);
    await verifyTurnstile(formData.get("turnstileToken")?.toString(), ctx.ip);
  } catch (err) {
    if (err instanceof RateLimitError || err instanceof TurnstileError) return failure(err.message);
    throw err;
  }

  const raw = readForm(formData);
  const parsed = signUpSchema.safeParse({
    ...raw,
    acceptedTerms: raw.acceptedTerms === "on" || raw.acceptedTerms === "true",
  });

  if (!parsed.success) {
    return failure("Please check the form.", toFieldErrors(parsed.error));
  }

  const { email, password, fullName, role } = parsed.data;
  const redirectPath =
    role === "alajo" ? "/dashboard/alajo" : role === "brand" ? "/dashboard/brand" : "/dashboard/supporter";

  try {
    const { userId, confirmationLink } = await provisionUser({
      email,
      password,
      fullName,
      role,
      redirectPath,
    });

    await emit({ type: "auth.signup", userId, email, name: fullName, role, verifyUrl: confirmationLink });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the account.";
    // Supabase reports an existing address here. Say so plainly rather than
    // failing mysteriously: the address is already visible to whoever typed it.
    if (/already (been )?registered|already exists/i.test(message)) {
      return failure("There is already an account with that email. Try signing in instead.");
    }
    console.error("[auth] signup failed", message);
    return failure("Something went wrong creating your account. Please try again.");
  }

  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

export async function signInAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const ctx = await getRequestContext();

  try {
    await enforceRateLimit(RATE_LIMITS.login, ctx.ipHash);
    await verifyTurnstile(formData.get("turnstileToken")?.toString(), ctx.ip);
  } catch (err) {
    if (err instanceof RateLimitError || err instanceof TurnstileError) return failure(err.message);
    throw err;
  }

  const parsed = signInSchema.safeParse(readForm(formData));
  if (!parsed.success) return failure("Please check the form.", toFieldErrors(parsed.error));

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes("email not confirmed")) {
      return failure("Confirm your email address first. Check your inbox for the link we sent.");
    }
    return failure(GENERIC_AUTH_ERROR);
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  const profile = profileRow as Profile | null;

  if (profile?.status === "suspended") {
    await supabase.auth.signOut();
    return failure("This account is suspended. Contact us if you think that is a mistake.");
  }

  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", data.user.id);

  const next = formData.get("next")?.toString();
  redirect(next && next.startsWith("/") ? next : homeFor(profile));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getRequestContext();

  try {
    await enforceRateLimit(RATE_LIMITS.passwordReset, ctx.ipHash);
    await verifyTurnstile(formData.get("turnstileToken")?.toString(), ctx.ip);
  } catch (err) {
    if (err instanceof RateLimitError || err instanceof TurnstileError) return failure(err.message);
    throw err;
  }

  const parsed = requestResetSchema.safeParse(readForm(formData));
  if (!parsed.success) return failure("Enter a valid email address.", toFieldErrors(parsed.error));

  const admin = createAdminSupabase();
  const { data: profileRow } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", parsed.data.email)
    .maybeSingle();

  const profile = profileRow as { id: string; full_name: string; email: string } | null;

  // Send only if the account exists, but always return the same message so this
  // endpoint cannot be used to enumerate registered addresses.
  if (profile) {
    try {
      const { data: link } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: parsed.data.email,
        options: { redirectTo: `${siteUrl}/reset-password` },
      });

      if (link?.properties) {
        const url = new URL(`${siteUrl}/auth/confirm`);
        url.searchParams.set("token_hash", link.properties.hashed_token);
        url.searchParams.set("type", "recovery");
        url.searchParams.set("next", "/reset-password");

        await sendEmail({
          type: "auth.password_reset",
          to: profile.email,
          recipientUserId: profile.id,
          data: { name: profile.full_name.split(" ")[0] ?? profile.full_name, resetUrl: url.toString() },
        });
      }
    } catch (err) {
      console.error("[auth] reset link failed", err);
    }
  }

  return success("If there is an account with that address, a reset link is on its way.");
}

export async function resetPasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(readForm(formData));
  if (!parsed.success) return failure("Please check the form.", toFieldErrors(parsed.error));

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return failure("That reset link has expired. Request a new one.");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return failure(error.message);

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as { email: string; full_name: string } | null;

  if (profile) {
    await sendEmail({
      type: "auth.password_changed",
      to: profile.email,
      recipientUserId: user.id,
      data: {
        name: profile.full_name.split(" ")[0] ?? profile.full_name,
        when: new Date().toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" }),
      },
    });
  }

  return success("Your password is updated. You can sign in now.");
}
