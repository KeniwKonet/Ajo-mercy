"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  getSelectionEligibility,
  recordSelectionAction,
  type Eligibility,
} from "@/app/actions/selection";
import { Alert, Button, ButtonLink, Skeleton } from "@/components/ui/primitives";
import { Checkbox, Field, Textarea } from "@/components/ui/form";
import { Turnstile } from "@/components/ui/turnstile";
import { ConfirmDialog } from "@/components/ui/dialog";
import { formatNaira } from "@/lib/format";
import type { ActionResult } from "@/lib/validation/shared";

/**
 * Client island on an otherwise cached page. Eligibility is resolved after
 * hydration so the profile itself can stay static, and every decision it shows
 * is re-made on the server when the selection is actually submitted.
 */
export function SupportPanel({
  alajoProfileId,
  businessName,
  requestedAmount,
}: {
  alajoProfileId: string;
  businessName: string;
  requestedAmount: number | null;
}) {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(recordSelectionAction, {
    ok: true,
  });

  useEffect(() => {
    let active = true;
    void getSelectionEligibility(alajoProfileId).then((result) => {
      if (active) setEligibility(result);
    });
    return () => {
      active = false;
    };
  }, [alajoProfileId]);

  const succeeded = state.ok && Boolean(state.message);

  return (
    <div className="widget w-full sm:w-[22rem]">
      <p className="font-display text-lg">Support this Alajo</p>
      {requestedAmount ? (
        <p className="mt-1 text-sm text-ink-soft">
          {businessName} is asking for{" "}
          <span className="font-medium text-ink tabular">{formatNaira(requestedAmount)}</span>.
        </p>
      ) : (
        <p className="mt-1 text-sm text-ink-soft">{businessName} is open to support.</p>
      )}

      <div className="mt-5">
        {succeeded ? (
          <Alert tone="positive" title="Selection recorded">
            {state.message}
          </Alert>
        ) : eligibility === null ? (
          <Skeleton className="h-11 w-full" />
        ) : eligibility.state === "eligible" ? (
          <>
            {!state.ok && <Alert tone="negative" className="mb-3">{state.message}</Alert>}

            {!open ? (
              <>
                <Button className="w-full" onClick={() => setOpen(true)}>
                  Select this business
                </Button>
                {eligibility.remaining !== null && (
                  <p className="mt-2 text-center text-xs text-ink-faint">
                    {eligibility.remaining} {eligibility.remaining === 1 ? "selection" : "selections"} left
                  </p>
                )}
              </>
            ) : (
              <form ref={formRef} action={formAction} className="space-y-4" noValidate>
                <input type="hidden" name="alajoProfileId" value={alajoProfileId} />

                <Field
                  label="Anything you want the team to know?"
                  optional
                  description="Only the Ajo Mercy team reads this."
                >
                  <Textarea name="note" rows={3} maxLength={500} />
                </Field>

                <Checkbox
                  name="confirmUnderstanding"
                  required
                  label="I understand this records a selection, not a transfer of money."
                  description="The team reviews and confirms before any support is arranged."
                />

                <Turnstile />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    loading={pending}
                    onClick={() => setConfirmOpen(true)}
                  >
                    Confirm selection
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>

                <ConfirmDialog
                  open={confirmOpen}
                  onClose={() => setConfirmOpen(false)}
                  title={`Select ${businessName}?`}
                  description="This records your selection and uses one of your selections. The business is told it is under consideration, not that it has been supported."
                  confirmLabel="Select this business"
                  pending={pending}
                  onConfirm={() => {
                    setConfirmOpen(false);
                    startTransition(() => formRef.current?.requestSubmit());
                  }}
                />
              </form>
            )}
          </>
        ) : (
          <IneligibleNotice eligibility={eligibility} />
        )}
      </div>

      <p className="mt-4 border-t border-rule pt-3 text-xs leading-relaxed text-ink-faint">
        Selecting a business is not a payment. Ajo Mercy never holds or transfers funds.
      </p>
    </div>
  );
}

function IneligibleNotice({ eligibility }: { eligibility: Eligibility }) {
  switch (eligibility.state) {
    case "anonymous":
      return (
        <div className="space-y-3">
          <ButtonLink href="/register?role=supporter" className="w-full">
            Register to support
          </ButtonLink>
          <p className="text-center text-xs text-ink-faint">
            Already registered?{" "}
            <Link href="/login" className="link-rule text-ink">
              Sign in
            </Link>
          </p>
        </div>
      );
    case "unverified":
      return <Alert tone="attention">Confirm your email address before you can select a business.</Alert>;
    case "pending_approval":
      return (
        <Alert tone="progress" title="Your account is being reviewed">
          We check every supporter by hand. You will get an email when it is approved.
        </Alert>
      );
    case "already_selected":
      return <Alert tone="positive">You have already selected this business.</Alert>;
    case "no_credits":
      return (
        <Alert tone="attention" title="No selections left">
          You have used all of your selections. This cap exists so attention spreads across
          businesses rather than piling onto the loudest.
        </Alert>
      );
    case "wrong_role":
      return (
        <Alert tone="neutral">
          Selections are made by approved supporters and brands.{" "}
          <Link href="/support" className="link-rule text-ink">
            How supporting works
          </Link>
        </Alert>
      );
    case "rejected":
      return <Alert tone="negative">This account is not approved to make selections.</Alert>;
    default:
      return null;
  }
}
