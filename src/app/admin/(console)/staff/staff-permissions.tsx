"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStaffAction } from "@/app/admin/actions";
import { Alert, Button } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/dialog";
import { PERMISSIONS, permissionsFor, type Permission } from "@/lib/rbac";

/**
 * Each permission is a tri-state: inherit from the role, explicitly granted, or
 * explicitly withheld. Only explicit choices are stored, so changing a role's
 * defaults later still reaches anyone on inherit.
 */
export function StaffPermissions({
  userId,
  name,
  role,
  permissions,
}: {
  userId: string;
  name: string;
  role: "admin" | "reviewer";
  permissions: Record<string, boolean>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextRole, setNextRole] = useState<"admin" | "reviewer">(role);
  const [overrides, setOverrides] = useState<Record<string, boolean>>(permissions);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const defaults = permissionsFor(nextRole);

  function cycle(permission: Permission) {
    setOverrides((current) => {
      const next = { ...current };
      const inheritedValue = defaults.includes(permission);
      if (!(permission in next)) {
        next[permission] = !inheritedValue;
      } else if (next[permission] === !inheritedValue) {
        next[permission] = inheritedValue;
      } else {
        delete next[permission];
      }
      return next;
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Change access
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Access for ${name}`}
        description="Tap a permission to grant or withhold it. Anything left on inherit follows the role."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const response = await updateStaffAction({
                    userId,
                    role: nextRole,
                    permissions: overrides,
                  });
                  if (response.ok) {
                    setOpen(false);
                    router.refresh();
                  } else {
                    setError(response.message ?? "Could not save.");
                  }
                })
              }
            >
              Save access
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {error && <Alert tone="negative">{error}</Alert>}

          <fieldset>
            <legend className="text-sm font-medium text-ink">Role</legend>
            <div className="mt-2 flex gap-2">
              {(["reviewer", "admin"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={nextRole === option}
                  onClick={() => setNextRole(option)}
                  className={`border px-3.5 py-2 text-sm transition-colors ${
                    nextRole === option
                      ? "border-forest bg-forest text-paper"
                      : "border-rule-strong text-ink-soft hover:border-ink hover:text-ink"
                  }`}
                >
                  {option === "admin" ? "Admin" : "Reviewer"}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="text-sm font-medium text-ink">Permissions</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {PERMISSIONS.map((permission) => {
                const inherited = defaults.includes(permission);
                const explicit = permission in overrides;
                const effective = explicit ? overrides[permission]! : inherited;

                return (
                  <li key={permission}>
                    <button
                      type="button"
                      onClick={() => cycle(permission)}
                      className={`flex w-full items-center justify-between gap-2 border px-2.5 py-1.5 text-left transition-colors ${
                        effective ? "border-rule-strong bg-card" : "border-rule bg-paper-deep"
                      }`}
                    >
                      <span
                        className={`font-mono text-2xs ${effective ? "text-ink" : "text-ink-faint line-through"}`}
                      >
                        {permission}
                      </span>
                      <span className="shrink-0 text-2xs text-ink-faint">
                        {explicit ? (effective ? "granted" : "withheld") : "inherit"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
}
