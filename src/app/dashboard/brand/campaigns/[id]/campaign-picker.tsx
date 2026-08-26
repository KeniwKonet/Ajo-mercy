"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { brandSelectAction } from "@/app/dashboard/brand/actions";
import { Alert, Button, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Checkbox, Textarea } from "@/components/ui/form";
import { Turnstile } from "@/components/ui/turnstile";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CATEGORY_LABELS, type BusinessCategory } from "@/lib/types";
import { formatNairaCompact, truncate } from "@/lib/format";
import type { ActionResult } from "@/lib/validation/shared";

type Candidate = {
  id: string;
  slug: string;
  business_name: string;
  founder_name: string;
  business_category: BusinessCategory;
  state: string;
  city: string | null;
  current_challenge: string | null;
  story: string;
  requested_amount_ngn: number | null;
};

/**
 * Eligible businesses for a campaign. Reads through the browser client so RLS
 * applies, which means only approved and featured profiles come back regardless
 * of what filters are passed.
 */
export function CampaignPicker({
  campaignId,
  preferredCategories,
  preferredStates,
  alreadySelected,
}: {
  campaignId: string;
  preferredCategories: BusinessCategory[];
  preferredStates: string[];
  alreadySelected: string[];
}) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [target, setTarget] = useState<Candidate | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();
      let builder = supabase
        .from("alajo_profiles")
        .select(
          "id, slug, business_name, founder_name, business_category, state, city, current_challenge, story, requested_amount_ngn",
        )
        .in("status", ["approved", "featured"])
        .limit(60);

      if (preferredCategories.length > 0) builder = builder.in("business_category", preferredCategories);
      if (preferredStates.length > 0) builder = builder.in("state", preferredStates);

      const { data } = await builder;
      if (!active) return;
      const rows = (data ?? []) as unknown as Candidate[];
      setCandidates(rows.filter((row) => !alreadySelected.includes(row.id)));
    }

    void load();
    return () => {
      active = false;
    };
  }, [preferredCategories, preferredStates, alreadySelected]);

  if (candidates === null) {
    return (
      <div className="grid gap-4 pt-6 sm:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="pt-6">
        <EmptyState
          title="No businesses match this campaign yet"
          description="Either every match is already selected, or no verified business currently fits the sectors and states you set. Widening the campaign brief helps."
        />
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="flex flex-col bg-paper p-5">
            <Link href={`/alajos/${candidate.slug}`} className="link-rule font-display text-lg text-ink">
              {candidate.business_name}
            </Link>
            <p className="mt-1 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
              {CATEGORY_LABELS[candidate.business_category]}
              <span className="mx-1.5 text-rule-strong">/</span>
              {[candidate.city, candidate.state].filter(Boolean).join(", ")}
            </p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
              {truncate(candidate.current_challenge ?? candidate.story, 150)}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-rule pt-3">
              <span className="text-xs text-ink-faint tabular">
                {candidate.requested_amount_ngn
                  ? formatNairaCompact(candidate.requested_amount_ngn)
                  : "Open to support"}
              </span>
              <Button size="sm" variant="secondary" onClick={() => setTarget(candidate)}>
                Select
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {target && (
        <SelectDialog
          campaignId={campaignId}
          candidate={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function SelectDialog({
  campaignId,
  candidate,
  onClose,
  onDone,
}: {
  campaignId: string;
  candidate: Candidate;
  onClose: () => void;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(brandSelectAction, {
    ok: true,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) onDone();
  }, [state, onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Select ${candidate.business_name}`}
        className="relative w-full max-w-lg border border-rule bg-card shadow-panel"
      >
        <div className="border-b border-rule px-6 py-4">
          <h3 className="font-display text-xl">Select {candidate.business_name}?</h3>
          <p className="mt-1 text-sm text-ink-soft">
            {candidate.founder_name} · {[candidate.city, candidate.state].filter(Boolean).join(", ")}
          </p>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4 px-6 py-5" noValidate>
          <input type="hidden" name="alajoProfileId" value={candidate.id} />
          <input type="hidden" name="campaignId" value={campaignId} />

          {!state.ok && <Alert tone="negative">{state.message}</Alert>}

          <div>
            <label htmlFor="brand-note" className="text-sm font-medium text-ink">
              Note for the Ajo Mercy team
            </label>
            <p className="mt-0.5 mb-1.5 text-xs text-ink-faint">
              Optional. Only the team sees this, not the business.
            </p>
            <Textarea id="brand-note" name="note" rows={3} maxLength={500} />
          </div>

          <Checkbox
            name="confirmUnderstanding"
            required
            label="I understand this is a selection, not a transfer of money."
            description="The Ajo Mercy team confirms recipients before any business is told it is being supported."
          />

          <Turnstile />

          <div className="flex justify-end gap-2 border-t border-rule pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" loading={pending} onClick={() => setConfirmOpen(true)}>
              Select this business
            </Button>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title={`Add ${candidate.business_name} to this campaign?`}
            description="This uses one of the places in your campaign. You can ask the team to change it before recipients are confirmed."
            confirmLabel="Add to campaign"
            pending={pending}
            onConfirm={() => {
              setConfirmOpen(false);
              startTransition(() => formRef.current?.requestSubmit());
            }}
          />
        </form>
      </div>
    </div>
  );
}
