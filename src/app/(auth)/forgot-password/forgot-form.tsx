"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/(auth)/actions";
import { Alert, Button } from "@/components/ui/primitives";
import { Field, FormErrorSummary, Input } from "@/components/ui/form";
import { Turnstile } from "@/components/ui/turnstile";
import type { ActionResult } from "@/lib/validation/shared";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    requestPasswordResetAction,
    { ok: true },
  );

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div>
        <h1 className="font-display text-3xl">Reset your password</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Enter your email and we will send you a link.
        </p>
      </div>

      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}
      {state.ok && state.message && <Alert tone="positive">{state.message}</Alert>}

      <Field label="Email" required error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Field>

      <Turnstile />

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Send reset link
      </Button>

      <p className="text-sm text-ink-soft">
        <Link href="/login" className="link-rule">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
