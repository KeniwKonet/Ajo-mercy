import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { can, homeFor, isStaff, isSuperAdmin, permissionsFor, PERMISSIONS } from "@/lib/rbac";
import type { Profile, UserRole, UserStatus } from "@/lib/types";

function profile(
  role: UserRole,
  status: UserStatus = "approved",
  permissions: Record<string, boolean> = {},
): Pick<Profile, "role" | "status" | "permissions"> {
  return { role, status, permissions };
}

describe("rbac", () => {
  test("a suspended staff account has no permissions at all", () => {
    const suspended = profile("admin", "suspended");
    for (const permission of PERMISSIONS) {
      assert.equal(can(suspended, permission), false, `suspended admin still had ${permission}`);
    }
    assert.equal(isStaff(suspended), false);
  });

  test("a pending account has no permissions", () => {
    const pending = profile("admin", "pending");
    assert.equal(can(pending, "alajo.approve"), false);
    assert.equal(isStaff(pending), false);
  });

  test("null is never allowed anything", () => {
    assert.equal(can(null, "alajo.approve"), false);
    assert.equal(isStaff(null), false);
    assert.equal(isSuperAdmin(null), false);
  });

  test("the super admin holds every permission", () => {
    const woli = profile("super_admin");
    for (const permission of PERMISSIONS) {
      assert.equal(can(woli, permission), true, `super admin was missing ${permission}`);
    }
    assert.equal(isSuperAdmin(woli), true);
  });

  test("only the super admin can manage staff by default", () => {
    assert.equal(can(profile("super_admin"), "staff.manage"), true);
    assert.equal(can(profile("admin"), "staff.manage"), false);
    assert.equal(can(profile("reviewer"), "staff.manage"), false);
  });

  test("a reviewer can read applications but not decide them", () => {
    const reviewer = profile("reviewer");
    assert.equal(can(reviewer, "alajo.review"), true);
    assert.equal(can(reviewer, "alajo.request_info"), true);
    assert.equal(can(reviewer, "alajo.approve"), false);
    assert.equal(can(reviewer, "alajo.reject"), false);
    assert.equal(can(reviewer, "confirmation.confirm"), false);
  });

  test("an explicit grant widens a reviewer without changing their role", () => {
    const trusted = profile("reviewer", "approved", { "alajo.approve": true });
    assert.equal(can(trusted, "alajo.approve"), true);
    // Still not everything an admin has.
    assert.equal(can(trusted, "alajo.reject"), false);
    assert.equal(can(trusted, "staff.manage"), false);
  });

  test("an explicit withhold narrows an admin", () => {
    const limited = profile("admin", "approved", { "alajo.reject": false });
    assert.equal(can(limited, "alajo.reject"), false);
    assert.equal(can(limited, "alajo.approve"), true);
  });

  test("a withhold on the super admin is respected, so the model has no back door", () => {
    // Not something the UI offers, but the check must be honest about it
    // rather than special-casing the role.
    const restricted = profile("super_admin", "approved", { "alajo.reject": false });
    assert.equal(can(restricted, "alajo.reject"), false);
  });

  test("applicants, supporters and brands hold no staff permissions", () => {
    for (const role of ["alajo", "supporter", "brand"] as const) {
      assert.deepEqual(permissionsFor(role), []);
      for (const permission of PERMISSIONS) {
        assert.equal(can(profile(role), permission), false, `${role} had ${permission}`);
      }
      assert.equal(isStaff(profile(role)), false);
    }
  });

  test("announcing support is held above confirming it", () => {
    // An admin can confirm a recipient, which emails that one business. Going
    // public is a separate permission the super admin holds by default, so a
    // campaign cannot be announced by whoever happened to confirm it.
    const admin = profile("admin");
    assert.equal(can(admin, "confirmation.confirm"), true);
    assert.equal(can(admin, "confirmation.announce"), false);

    assert.equal(can(profile("super_admin"), "confirmation.announce"), true);

    // It can still be delegated explicitly when that is the intention.
    assert.equal(can(profile("admin", "approved", { "confirmation.announce": true }), "confirmation.announce"), true);
  });

  test("each role lands on its own dashboard", () => {
    assert.equal(homeFor({ role: "super_admin" }), "/admin");
    assert.equal(homeFor({ role: "admin" }), "/admin");
    assert.equal(homeFor({ role: "reviewer" }), "/admin");
    assert.equal(homeFor({ role: "alajo" }), "/dashboard/alajo");
    assert.equal(homeFor({ role: "supporter" }), "/dashboard/supporter");
    assert.equal(homeFor({ role: "brand" }), "/dashboard/brand");
    assert.equal(homeFor(null), "/");
  });
});
