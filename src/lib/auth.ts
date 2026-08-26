import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { can, isStaff, type Permission } from "@/lib/rbac";
import type { Profile, UserRole } from "@/lib/types";

/**
 * Resolves the caller's profile from the database on every request. The role is
 * never read from a JWT claim or a cookie, so a forged token cannot elevate.
 * `cache` dedupes it within a single render pass.
 */
export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return data ?? null;
});

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 = 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For pages: redirects. For API routes use `requireProfileOrThrow`. */
export async function requireAuth(redirectTo = "/login"): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect(redirectTo);
  if (profile.status === "suspended") redirect("/account/suspended");
  return profile;
}

export async function requireRole(roles: UserRole | UserRole[], redirectTo = "/login"): Promise<Profile> {
  const profile = await requireAuth(redirectTo);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(profile.role)) redirect("/403");
  return profile;
}

export async function requireStaff(): Promise<Profile> {
  const profile = await requireAuth("/login?next=/admin");
  if (!isStaff(profile)) redirect("/403");
  return profile;
}

export async function requirePermission(permission: Permission): Promise<Profile> {
  const profile = await requireStaff();
  if (!can(profile, permission)) redirect("/403");
  return profile;
}

/** Throwing variants for route handlers and server actions. */
export async function requireProfileOrThrow(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) throw new AuthorizationError("You need to sign in.", 401);
  if (profile.status === "suspended") throw new AuthorizationError("This account is suspended.");
  return profile;
}

export async function requirePermissionOrThrow(permission: Permission): Promise<Profile> {
  const profile = await requireProfileOrThrow();
  if (!can(profile, permission)) {
    throw new AuthorizationError("You do not have permission to do that.");
  }
  return profile;
}

export async function requireRoleOrThrow(roles: UserRole | UserRole[]): Promise<Profile> {
  const profile = await requireProfileOrThrow();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(profile.role)) {
    throw new AuthorizationError("You do not have permission to do that.");
  }
  return profile;
}

/**
 * Server-side account provisioning. Creates the auth user with the requested
 * non-staff role and returns a confirmation link we send ourselves through
 * Resend, so users never receive a default Supabase email.
 */
export async function provisionUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: Extract<UserRole, "alajo" | "supporter" | "brand">;
  redirectPath: string;
}): Promise<{ userId: string; confirmationLink: string }> {
  const admin = createAdminSupabase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
    user_metadata: { full_name: input.fullName, role: input.role },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create the account.");
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: { redirectTo: `${siteUrl}${input.redirectPath}` },
  });

  if (linkError || !linkData.properties) {
    throw new Error(linkError?.message ?? "Could not generate the verification link.");
  }

  // Route through our own callback so the session cookie is set server-side.
  const verifyUrl = new URL(`${siteUrl}/auth/confirm`);
  verifyUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
  verifyUrl.searchParams.set("type", "signup");
  verifyUrl.searchParams.set("next", input.redirectPath);

  return { userId: data.user.id, confirmationLink: verifyUrl.toString() };
}
