"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { Alert, Button } from "@/components/ui/primitives";
import { Field, FormErrorSummary, Input } from "@/components/ui/form";
import type { ActionResult } from "@/lib/validation/shared";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(resetPasswordAction, {
    ok: true,
  });

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div>
        <h1 className="font-display text-3xl">Choose a new password</h1>
        <p className="mt-2 text-sm text-ink-soft">This link works once.</p>
      </div>

      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}
      {state.ok && state.message && (
        <Alert tone="positive" title="Done">
          {state.message}{" "}
          <Link href="/login" className="link-rule font-medium text-ink">
            Sign in
          </Link>
        </Alert>
      )}

      <Field
        label="New password"
        required
        description="At least 10 characters, with a number or symbol."
        error={state.fieldErrors?.password}
      >
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>

      <Field label="Confirm new password" required error={state.fieldErrors?.confirmPassword}>
        <Input name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Update password
      </Button>
    </form>
  );
}
