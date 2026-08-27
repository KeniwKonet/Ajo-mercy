"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/primitives";
import { Checkbox, Field, FormErrorSummary, Input } from "@/components/ui/form";
import { Turnstile } from "@/components/ui/turnstile";
import type { ActionResult } from "@/lib/validation/shared";
import { DraftNotice } from "@/components/ui/draft-notice";
import { useFormDraft } from "@/lib/use-form-draft";
import * as v from "@/lib/validation/live";
import { email as emailSchema, password as passwordSchema, fullName as nameSchema } from "@/lib/validation/shared";

const ROLES = [
  {
    value: "alajo",
    title: "I run a business",
    body: "Apply to be verified and listed so supporters and brands can find you.",
  },
  {
    value: "supporter",
    title: "I want to support a business",
    body: "Register, get approved, then choose businesses to back.",
  },
  {
    value: "brand",
    title: "I represent a brand",
    body: "Register your organisation and run a support campaign.",
  },
] as const;

export function RegisterForm({ defaultRole }: { defaultRole: "alajo" | "supporter" | "brand" }) {
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>(defaultRole);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(signUpAction, { ok: true });
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useFormDraft(formRef, "register");

  useEffect(() => {
    // Submitted successfully, so the local copy is no longer needed.
    if (state.ok && state.message) draft.clear();
  }, [state, draft]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6" noValidate>
      <div>
        <h1 className="font-display text-3xl">Create your account</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Already have one?{" "}
          <Link href="/login" className="link-rule font-medium text-ink">
            Sign in
          </Link>
        </p>
      </div>

      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-ink">What brings you here?</legend>
        {ROLES.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 border p-3.5 transition-colors ${
              role === option.value
                ? "border-forest bg-forest-wash"
                : "border-rule-strong bg-card hover:border-ink"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={option.value}
              checked={role === option.value}
              onChange={() => setRole(option.value)}
              className="mt-1 size-4 shrink-0 accent-[var(--color-forest)]"
            />
            <span>
              <span className="block text-sm font-medium text-ink">{option.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{option.body}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Field label="Full name" required error={state.fieldErrors?.fullName} validate={v.all(v.required("Your name"), v.fromSchema(nameSchema))}>
        <Input name="fullName" autoComplete="name" required placeholder="Adedayo Ogunlesi" />
      </Field>

      <Field label="Email" required error={state.fieldErrors?.email} validate={v.all(v.required("An email"), v.fromSchema(emailSchema))}>
        <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>

      <Field
        label="Password"
        required
        description="At least 10 characters, with a number or symbol."
        error={state.fieldErrors?.password}
      >
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>

      <Checkbox
        name="acceptedTerms"
        value="true"
        required
        label={
          <>
            I agree to the{" "}
            <Link href="/terms" className="link-rule font-medium text-ink">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="link-rule font-medium text-ink">
              privacy notice
            </Link>
            .
          </>
        }
        description="Registering does not guarantee selection or support."
      />

      <Turnstile />

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Create account
      </Button>
      <DraftNotice savedAt={draft.savedAt} restored={draft.restored} onDiscard={draft.clear} />
    </form>
  );
}
