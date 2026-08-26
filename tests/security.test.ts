import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Static checks over the migrations and source tree. These do not need a live
 * database: they assert that the security posture we designed is actually
 * written down, which is the failure mode that matters (a table added later
 * without RLS, or the service-role key drifting into a client bundle).
 */

const root = process.cwd();
const migrationsDir = join(root, "supabase", "migrations");

function migrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
    .join("\n");
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe("database security", () => {
  const sql = migrationSql();

  test("every table created is also given row level security", () => {
    const created = [...sql.matchAll(/create table (?:if not exists )?(\w+)/g)].map((m) => m[1]!);
    // schema_migrations is created by the push script, not the migrations.
    const exempt = new Set(["schema_migrations"]);

    const rlsBlock = sql.slice(sql.indexOf("enable row level security") - 2000);
    const enabled = new Set(
      [...rlsBlock.matchAll(/'(\w+)'/g)].map((m) => m[1]!),
    );

    const unprotected = created.filter((table) => !exempt.has(table) && !enabled.has(table));
    assert.deepEqual(
      unprotected,
      [],
      `These tables were created without RLS being enabled:\n  ${unprotected.join("\n  ")}`,
    );
  });

  test("RLS is forced, so even the table owner is subject to policies", () => {
    assert.ok(sql.includes("force row level security"));
  });

  test("role resolution helpers are SECURITY DEFINER and pinned to a search path", () => {
    for (const fn of ["is_staff", "is_admin", "is_super_admin", "auth_role"]) {
      const pattern = new RegExp(
        `create or replace function public\\.${fn}\\(\\)[\\s\\S]{0,200}?security definer set search_path = public`,
      );
      assert.ok(pattern.test(sql), `${fn} is not a search-path-pinned SECURITY DEFINER function`);
    }
  });

  test("privileged routines are not callable by anon or authenticated", () => {
    for (const fn of ["approve_alajo_application", "record_selection"]) {
      const pattern = new RegExp(`revoke execute on function public\\.${fn}[\\s\\S]{0,200}?from public, anon, authenticated`);
      assert.ok(pattern.test(sql), `${fn} is still executable by untrusted roles`);
    }
  });

  test("selections are never publicly readable", () => {
    // Publishing raw counts would turn support into a popularity contest.
    const policy = sql.slice(sql.indexOf("create policy selection_select"));
    const clause = policy.slice(0, policy.indexOf(";"));
    assert.ok(!/using \(true\)/.test(clause), "selections have an unrestricted read policy");
    assert.ok(clause.includes("selector_id = auth.uid()"));
    assert.ok(clause.includes("is_staff()"));
  });

  test("only approved and featured profiles are public", () => {
    const policy = sql.slice(sql.indexOf("create policy alajo_profiles_public_select"));
    const clause = policy.slice(0, policy.indexOf(";"));
    assert.ok(clause.includes("status in ('approved','featured')"));
  });

  test("identity documents are not exposed through the public media policy", () => {
    const policy = sql.slice(sql.indexOf("create policy alajo_media_select"));
    const clause = policy.slice(0, policy.indexOf(";"));
    // The public branch must be limited to imagery, never documents.
    assert.ok(clause.includes("kind in ('profile_photo','business_photo','video')"));
  });

  test("the documents bucket is private and the public bucket is not used for documents", () => {
    assert.ok(sql.includes("('alajo-documents', 'alajo-documents', false"));
    assert.ok(sql.includes("('alajo-public', 'alajo-public', true"));
  });

  test("storage uploads are constrained to the uploader's own folder", () => {
    const inserts = [...sql.matchAll(/create policy storage_\w+_insert[\s\S]*?;/g)].map((m) => m[0]);
    assert.ok(inserts.length >= 2, "expected insert policies for both buckets");
    for (const policy of inserts) {
      assert.ok(
        policy.includes("(storage.foldername(name))[1] = auth.uid()::text"),
        `an upload policy does not pin the folder to the uploader:\n${policy}`,
      );
    }
  });

  test("only one super admin seat can exist", () => {
    assert.ok(sql.includes("profiles_single_super_admin"));
    assert.ok(sql.includes("where role = 'super_admin'"));
  });

  test("staff role changes are guarded at the database level", () => {
    assert.ok(sql.includes("guard_role_change"));
    assert.ok(sql.includes("Only a super admin may change staff roles"));
  });

  test("applicants cannot set their own decided status", () => {
    assert.ok(sql.includes("pin_applicant_status"));
    assert.ok(sql.includes("Applicants may not set status"));
  });

  test("users cannot change their own role or status", () => {
    const guard = sql.slice(sql.indexOf("pin_self_service_profile_fields"));
    const body = guard.slice(0, guard.indexOf("$$;"));
    for (const field of ["role", "status", "permissions", "suspended_at"]) {
      const pinned = new RegExp(`new\\.${field}\\s*:=\\s*old\\.${field}\\s*;`);
      assert.ok(pinned.test(body), `${field} is not pinned for self-service updates`);
    }
  });

  test("rate limiting has no client-facing policy at all", () => {
    assert.ok(
      sql.includes("rate_limits has RLS enabled and no policy"),
      "the rate_limits lockdown is no longer documented in the migration",
    );
    assert.ok(!/create policy \w+ on rate_limits/.test(sql), "a policy was added to rate_limits");
  });
});

describe("source tree", () => {
  const files = walk(join(root, "src"));

  test("the service role key is never read outside server-only modules", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      if (!source.includes("SUPABASE_SERVICE_ROLE_KEY")) continue;
      const isEnvModule = file.endsWith(join("lib", "env.ts"));
      const isServerOnly = source.includes('import "server-only"');
      if (!isEnvModule && !isServerOnly) offenders.push(file.replace(root, ""));
    }
    assert.deepEqual(offenders, [], `service role key referenced outside a server-only module:\n${offenders.join("\n")}`);
  });

  test("no client component imports the admin Supabase client", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const isClient = source.trimStart().startsWith('"use client"');
      if (isClient && source.includes("supabase/admin")) offenders.push(file.replace(root, ""));
    }
    assert.deepEqual(offenders, [], `client components importing the service-role client:\n${offenders.join("\n")}`);
  });

  test("every server action file re-checks authorisation", () => {
    const actionFiles = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.trimStart().startsWith('"use server"');
    });

    assert.ok(actionFiles.length >= 4, "expected several server action modules");

    for (const file of actionFiles) {
      const source = readFileSync(file, "utf8");
      const guards = [
        "requireRoleOrThrow",
        "requirePermissionOrThrow",
        "requireProfileOrThrow",
        "enforceRateLimit",
      ];
      assert.ok(
        guards.some((guard) => source.includes(guard)),
        `${file.replace(root, "")} has no authorisation or rate-limit guard`,
      );
    }
  });

  test("experimental design routes are gated in production", () => {
    const middleware = readFileSync(join(root, "src", "middleware.ts"), "utf8");
    assert.ok(middleware.includes("/designs"));
    assert.ok(middleware.includes("ENABLE_DESIGN_ROUTES"));
  });

  test("security headers are declared", () => {
    const config = readFileSync(join(root, "next.config.ts"), "utf8");
    for (const header of [
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
      "Strict-Transport-Security",
    ]) {
      assert.ok(config.includes(header), `${header} is not set`);
    }
    assert.ok(config.includes("frame-ancestors 'none'"));
    assert.ok(config.includes("object-src 'none'"));
  });

  test("unsafe-eval is allowed in development only, never unconditionally", () => {
    // Next's dev React Refresh needs eval; production must not have it. The
    // relaxation has to stay behind the isDev check.
    const config = readFileSync(join(root, "next.config.ts"), "utf8");
    const evalLines = config
      .split("\n")
      .filter((line) => line.includes("unsafe-eval") && !line.trimStart().startsWith("//"));

    assert.equal(evalLines.length, 1, "expected exactly one unsafe-eval reference in the CSP");
    assert.ok(
      evalLines[0]!.includes("isDev"),
      `unsafe-eval is not gated on isDev:\n${evalLines[0]}`,
    );
  });
});
