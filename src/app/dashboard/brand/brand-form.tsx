"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitBrandProfileAction } from "./actions";
import { Alert, Button } from "@/components/ui/primitives";
import { ChipGroup, Field, FormErrorSummary, Input, Textarea, WordCount } from "@/components/ui/form";
import { Turnstile } from "@/components/ui/turnstile";
import { BUSINESS_CATEGORIES, CATEGORY_LABELS, NIGERIAN_STATES } from "@/lib/types";
import type { BrandProfile, BusinessCategory } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/shared";
import { DraftNotice } from "@/components/ui/draft-notice";
import { useFormDraft } from "@/lib/use-form-draft";

export function BrandForm({ existing }: { existing: BrandProfile | null }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    submitBrandProfileAction,
    { ok: true },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useFormDraft(formRef, "brand");

  useEffect(() => {
    // Submitted successfully, so the local copy is no longer needed.
    if (state.ok && state.message) draft.clear();
  }, [state, draft]);
  const [categories, setCategories] = useState<BusinessCategory[]>(existing?.preferred_categories ?? []);
  const [states, setStates] = useState<string[]>(existing?.preferred_states ?? []);
  const [about, setAbout] = useState(existing?.about ?? "");
  const [purpose, setPurpose] = useState(existing?.support_purpose ?? "");

  if (state.ok && state.message) {
    return (
      <Alert tone="positive" title="Registration submitted">
        {state.message}
      </Alert>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="max-w-2xl space-y-8" noValidate>
      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}

      <section className="space-y-6">
        <h2 className="border-b border-rule pb-2 font-display text-lg">The organisation</h2>

        <Field label="Organisation name" required error={state.fieldErrors?.organisationName}>
          <Input name="organisationName" defaultValue={existing?.organisation_name ?? ""} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="RC number"
            optional
            description="Your CAC registration number, if you have one."
            error={state.fieldErrors?.registrationNumber}
          >
            <Input name="registrationNumber" defaultValue={existing?.registration_number ?? ""} />
          </Field>

          <Field label="Sector" required error={state.fieldErrors?.industry}>
            <Input name="industry" defaultValue={existing?.industry ?? ""} placeholder="Banking, FMCG, telecoms…" />
          </Field>
        </div>

        <Field
          label="What does the organisation do?"
          required
          error={state.fieldErrors?.about}
        >
          <Textarea name="about" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
        </Field>
        <WordCount value={about} min={20} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Website" optional error={state.fieldErrors?.websiteUrl}>
            <Input name="websiteUrl" type="url" placeholder="https://" defaultValue={existing?.website_url ?? ""} />
          </Field>
          <Field label="LinkedIn" optional error={state.fieldErrors?.linkedinUrl}>
            <Input name="linkedinUrl" type="url" placeholder="https://" defaultValue={existing?.linkedin_url ?? ""} />
          </Field>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="border-b border-rule pb-2 font-display text-lg">Who we speak to</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Contact name" required error={state.fieldErrors?.contactPersonName}>
            <Input name="contactPersonName" defaultValue={existing?.contact_person_name ?? ""} />
          </Field>
          <Field label="Their role" required error={state.fieldErrors?.contactPersonRole}>
            <Input name="contactPersonRole" defaultValue={existing?.contact_person_role ?? ""} />
          </Field>
          <Field label="Contact email" required error={state.fieldErrors?.contactEmail}>
            <Input name="contactEmail" type="email" defaultValue={existing?.contact_email ?? ""} />
          </Field>
          <Field label="Contact phone" required error={state.fieldErrors?.contactPhone}>
            <Input name="contactPhone" type="tel" defaultValue={existing?.contact_phone ?? ""} />
          </Field>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="border-b border-rule pb-2 font-display text-lg">What you want to support</h2>

        <Field
          label="Why do you want to support these businesses?"
          required
          description="This is read by our team and helps us match you with the right businesses."
          error={state.fieldErrors?.supportPurpose}
        >
          <Textarea name="supportPurpose" rows={4} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </Field>
        <WordCount value={purpose} min={20} />

        <Field label="Sectors you are interested in" required error={state.fieldErrors?.preferredCategories}>
          <>
            <ChipGroup
              label="Preferred sectors"
              options={BUSINESS_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
              selected={categories}
              onToggle={(value) =>
                setCategories((current) =>
                  current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
                )
              }
            />
            {categories.map((value) => (
              <input key={value} type="hidden" name="preferredCategories" value={value} />
            ))}
          </>
        </Field>

        <Field
          label="States you want to reach"
          optional
          description="Leave empty for anywhere in Nigeria."
          error={state.fieldErrors?.preferredStates}
        >
          <>
            <ChipGroup
              label="Preferred states"
              options={NIGERIAN_STATES.map((s) => ({ value: s, label: s }))}
              selected={states}
              onToggle={(value) =>
                setStates((current) =>
                  current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
                )
              }
              max={10}
            />
            {states.map((value) => (
              <input key={value} type="hidden" name="preferredStates" value={value} />
            ))}
          </>
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Budget from (₦)" optional error={state.fieldErrors?.budgetMinNgn}>
            <Input name="budgetMinNgn" type="number" inputMode="numeric" min={0} step={10000} defaultValue={existing?.budget_min_ngn ?? ""} />
          </Field>
          <Field label="Budget to (₦)" optional error={state.fieldErrors?.budgetMaxNgn}>
            <Input name="budgetMaxNgn" type="number" inputMode="numeric" min={0} step={10000} defaultValue={existing?.budget_max_ngn ?? ""} />
          </Field>
          <Field label="Businesses" required error={state.fieldErrors?.businessesTarget}>
            <Input name="businessesTarget" type="number" inputMode="numeric" min={1} defaultValue={existing?.businesses_target ?? 1} />
          </Field>
        </div>
      </section>

      <Turnstile />

      <div className="border-t border-rule pt-5">
        <Button type="submit" size="lg" loading={pending}>
          Submit for review
        </Button>
        <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-faint">
          Ajo Mercy does not process or hold support funds. Once businesses are confirmed, support is
          arranged directly between you and them, with our team coordinating.
        </p>
      </div>
      <DraftNotice savedAt={draft.savedAt} restored={draft.restored} onDiscard={draft.clear} />
    </form>
  );
}
