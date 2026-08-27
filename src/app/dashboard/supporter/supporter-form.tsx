"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitSupporterProfileAction } from "./actions";
import { Alert, Button } from "@/components/ui/primitives";
import { ChipGroup, Field, FormErrorSummary, Input, Select, Textarea, WordCount } from "@/components/ui/form";
import { Turnstile } from "@/components/ui/turnstile";
import { BUSINESS_CATEGORIES, CATEGORY_LABELS, NIGERIAN_STATES } from "@/lib/types";
import type { BusinessCategory, SupporterProfile } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/shared";
import { DraftNotice } from "@/components/ui/draft-notice";
import { useFormDraft } from "@/lib/use-form-draft";

export function SupporterForm({ existing }: { existing: SupporterProfile | null }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    submitSupporterProfileAction,
    { ok: true },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useFormDraft(formRef, "supporter");

  useEffect(() => {
    // Submitted successfully, so the local copy is no longer needed.
    if (state.ok && state.message) draft.clear();
  }, [state, draft]);
  const [interests, setInterests] = useState<BusinessCategory[]>(existing?.interests ?? []);
  const [motivation, setMotivation] = useState(existing?.motivation ?? "");

  if (state.ok && state.message) {
    return (
      <Alert tone="positive" title="Registration submitted">
        {state.message}
      </Alert>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="max-w-2xl space-y-6" noValidate>
      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}

      <Alert tone="neutral">
        We review every supporter before they can select a business. It is the same standard we hold
        the businesses to, and it is why the businesses trust the process.
      </Alert>

      <Field label="Phone number" required error={state.fieldErrors?.phone}>
        <Input name="phone" type="tel" inputMode="tel" defaultValue={existing?.phone ?? ""} placeholder="0803 000 0000" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="State" required error={state.fieldErrors?.state}>
          <SelectField
            name="state"
            defaultValue={existing?.state ?? ""}
            placeholder="Choose a state"
            options={NIGERIAN_STATES.map((s) => ({ value: s, label: s }))}
          />
        </Field>

        <Field label="Town or city" required error={state.fieldErrors?.city}>
          <Input name="city" defaultValue={existing?.city ?? ""} />
        </Field>
      </div>

      <Field label="What do you do?" required error={state.fieldErrors?.occupation}>
        <Input name="occupation" defaultValue={existing?.occupation ?? ""} placeholder="Teacher, trader, engineer…" />
      </Field>

      <Field
        label="Why do you want to support a business?"
        required
        description="A few honest sentences. This is read by a person."
        error={state.fieldErrors?.motivation}
      >
        <Textarea name="motivation" rows={5} value={motivation} onChange={(e) => setMotivation(e.target.value)} />
      </Field>
      <WordCount value={motivation} min={15} />

      <Field
        label="What kinds of business do you care about?"
        required
        description="Pick as many as apply. We use this to show you businesses you are more likely to connect with."
        error={state.fieldErrors?.interests}
      >
        <>
          <ChipGroup
            label="Business categories"
            options={BUSINESS_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
            selected={interests}
            onToggle={(value) =>
              setInterests((current) =>
                current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
              )
            }
          />
          {interests.map((value) => (
            <input key={value} type="hidden" name="interests" value={value} />
          ))}
        </>
      </Field>

      <Field label="How did you hear about Ajo Mercy?" optional error={state.fieldErrors?.howHeard}>
        <Input name="howHeard" defaultValue={existing?.how_heard ?? ""} />
      </Field>

      <Turnstile />

      <div className="border-t border-rule pt-5">
        <Button type="submit" size="lg" loading={pending}>
          Submit registration
        </Button>
        <p className="mt-3 text-xs text-ink-faint">
          Approval lets you select businesses. It does not commit you to anything.
        </p>
      </div>
      <DraftNotice savedAt={draft.savedAt} restored={draft.restored} onDiscard={draft.clear} />
    </form>
  );
}
