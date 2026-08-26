"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/primitives";
import { Field, FormErrorSummary, Input } from "@/components/ui/form";
import { Turnstile } from "@/components/ui/turnstile";
import type { ActionResult } from "@/lib/validation/shared";

const LINK_ERRORS: Record<string, string> = {
  invalid_link: "That link was not valid. Request a new one below.",
  expired_link: "That link has expired. Request a new one below.",
};

export function LoginForm({ next, linkError }: { next?: string; linkError?: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(signInAction, { ok: true });
  const notice = linkError ? LINK_ERRORS[linkError] : undefined;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div>
        <h1 className="font-display text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-ink-soft">
          New here?{" "}
          <Link href="/register" className="link-rule font-medium text-ink">
            Create an account
          </Link>
        </p>
      </div>

      {notice && <FormErrorSummary message={notice} />}
      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}

      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email" required error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Field>

      <Field label="Password" required error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      <Turnstile />

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Sign in
      </Button>

      <p className="text-sm text-ink-soft">
        <Link href="/forgot-password" className="link-rule">
          Forgotten your password?
        </Link>
      </p>
    </form>
  );
}
