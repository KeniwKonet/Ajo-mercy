"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCampaignAction } from "@/app/dashboard/brand/actions";
import { Alert, Button } from "@/components/ui/primitives";
import { ChipGroup, Field, FormErrorSummary, Input, Textarea, WordCount } from "@/components/ui/form";
import { BUSINESS_CATEGORIES, CATEGORY_LABELS, NIGERIAN_STATES } from "@/lib/types";
import type { BusinessCategory } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/shared";
import { DraftNotice } from "@/components/ui/draft-notice";
import { useFormDraft } from "@/lib/use-form-draft";
import * as v from "@/lib/validation/live";

export function CampaignForm({
  defaults,
}: {
  defaults: {
    categories: BusinessCategory[];
    states: string[];
    businessesTarget: number;
    budget: number | null;
  };
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createCampaignAction, {
    ok: true,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const draft = useFormDraft(formRef, "campaign");

  useEffect(() => {
    // Submitted successfully, so the local copy is no longer needed.
    if (state.ok && state.message) draft.clear();
  }, [state, draft]);
  const [categories, setCategories] = useState<BusinessCategory[]>(defaults.categories);
  const [states, setStates] = useState<string[]>(defaults.states);
  const [summary, setSummary] = useState("");

  if (state.ok && state.message) {
    return (
      <Alert tone="positive" title="Campaign created">
        {state.message}
      </Alert>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="max-w-2xl space-y-6" noValidate>
      {!state.ok && <FormErrorSummary message={state.message} fieldErrors={state.fieldErrors} />}

      <Field
        label="Campaign name"
        required
        description="Something recognisable. It appears on the businesses' notifications."
        error={state.fieldErrors?.name}
      >
        <Input name="name" placeholder="Q4 Small Business Drive" />
      </Field>

      <Field label="What is this campaign for?" required error={state.fieldErrors?.summary} validate={v.words(10, "A summary")} validateOn="input">
        <Textarea name="summary" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <WordCount value={summary} min={10} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="How many businesses?"
          required
          description="Selections stop once this many are chosen."
          error={state.fieldErrors?.businessesTarget}
        >
          <Input
            name="businessesTarget"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={defaults.businessesTarget}
          />
        </Field>

        <Field label="Total budget (₦)" optional error={state.fieldErrors?.budgetNgn} validate={v.range(0, 1000000000, "The budget")}>
          <Input
            name="budgetNgn"
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            defaultValue={defaults.budget ?? ""}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Selections open" optional error={state.fieldErrors?.selectionOpensAt}>
          <Input name="selectionOpensAt" type="date" />
        </Field>
        <Field label="Selections close" optional error={state.fieldErrors?.selectionClosesAt}>
          <Input name="selectionClosesAt" type="date" />
        </Field>
      </div>

      <Field label="Sectors" optional description="Leave empty to consider all sectors.">
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

      <Field label="States" optional description="Leave empty for anywhere in Nigeria.">
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

      <div className="border-t border-rule pt-5">
        <Button type="submit" size="lg" loading={pending}>
          Create campaign
        </Button>
        <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-faint">
          The Ajo Mercy team reviews the campaign and opens the selection period. You will be emailed
          when you can start choosing businesses.
        </p>
      </div>
      <DraftNotice savedAt={draft.savedAt} restored={draft.restored} onDiscard={draft.clear} />
    </form>
  );
}
