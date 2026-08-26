#!/usr/bin/env node
/**
 * Creates the Super Admin account. Run once, after the migrations.
 *
 *   node --env-file=.env.local scripts/bootstrap-admin.mjs
 *
 * Needs SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, SUPER_ADMIN_PASSWORD and the
 * service role key. If the account already exists it is promoted rather than
 * recreated, so re-running is safe.
 *
 * The database has a unique index allowing only one super_admin row, so this
 * cannot quietly mint a second one.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPER_ADMIN_EMAIL;
const name = process.env.SUPER_ADMIN_NAME ?? "Woli Arole";
const password = process.env.SUPER_ADMIN_PASSWORD;

const missing = [
  ["NEXT_PUBLIC_SUPABASE_URL", url],
  ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ["SUPER_ADMIN_EMAIL", email],
  ["SUPER_ADMIN_PASSWORD", password],
]
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(`Missing environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}`);
  process.exit(1);
}

if (password.length < 12) {
  console.error("SUPER_ADMIN_PASSWORD must be at least 12 characters. This account can do anything.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(address) {
  // listUsers is paginated; the super admin is created early so a couple of
  // pages is plenty, and this only runs by hand.
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data.users.find((user) => user.email?.toLowerCase() === address.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  let user = await findUserByEmail(email);

  if (user) {
    console.log(`Account already exists for ${email}. Promoting it.`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Could not create the account.");
    user = data.user;
    console.log(`Created ${email}.`);
  }

  // The handle_new_user trigger inserts the profile row; make sure it landed
  // before updating it, in case this runs immediately after creation.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const { error } = await admin.from("profiles").insert({
      id: user.id,
      email,
      full_name: name,
      role: "super_admin",
      status: "approved",
      email_verified_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from("profiles")
      .update({
        role: "super_admin",
        status: "approved",
        full_name: name,
        email_verified_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
  }

  console.log(`\n${name} is now Super Admin.`);
  console.log(`Sign in at /login with ${email} and open /admin.`);
  console.log("\nChange the password after the first sign-in, and clear SUPER_ADMIN_PASSWORD from .env.local.");
}

main().catch((err) => {
  console.error(`\nFailed: ${err instanceof Error ? err.message : err}`);
  if (String(err).includes("profiles_single_super_admin")) {
    console.error("A different account already holds the super admin seat. Demote it first.");
  }
  process.exit(1);
});
