"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewBrandAction, reviewSupporterAction } from "@/app/admin/actions";
import { Alert, Button } from "@/components/ui/primitives";
import { Textarea } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/dialog";

/**
 * Approve/reject control shared by the supporter and brand queues. Rejection
 * always requires an internal reason, so the audit log is never a bare "no".
 */
export function ApproveRejectControls({
  kind,
  userId,
  label,
}: {
  kind: "supporter" | "brand";
  userId: string;
  label: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const decision =
        mode === "approve"
          ? { decision: "approve" as const }
          : { decision: "reject" as const, internalReason: reason, applicantMessage: applicantMessage || undefined };

      const action = kind === "supporter" ? reviewSupporterAction : reviewBrandAction;
      const response = await action({ userId, decision });

      if (response.ok) {
        setMode(null);
        setReason("");
        setApplicantMessage("");
        router.refresh();
      } else {
        setError(response.message ?? "Could not save that decision.");
        setMode(null);
      }
    });

  return (
    <div className="shrink-0 space-y-2">
      {error && <Alert tone="negative">{error}</Alert>}

      <div className="flex gap-2">
        <Button size="sm" onClick={() => setMode("approve")}>
          Approve
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setMode("reject")}>
          Reject
        </Button>
      </div>

      <ConfirmDialog
        open={mode === "approve"}
        onClose={() => setMode(null)}
        title={`Approve ${label}?`}
        description={
          kind === "supporter"
            ? "They will be emailed and can start selecting businesses straight away."
            : "The organisation will be emailed and can create campaigns straight away."
        }
        confirmLabel="Approve"
        pending={pending}
        onConfirm={run}
      />

      <ConfirmDialog
        open={mode === "reject"}
        onClose={() => setMode(null)}
        title={`Reject ${label}?`}
        description="They will be emailed that the registration was not approved."
        confirmLabel="Reject"
        tone="danger"
        requirePhrase="REJECT"
        pending={pending}
        onConfirm={run}
      >
        <div className="space-y-3">
          <div>
            <label htmlFor={`reason-${userId}`} className="text-sm font-medium text-ink">
              Internal reason <span className="text-terracotta">*</span>
            </label>
            <p className="mt-0.5 mb-1.5 text-xs text-ink-faint">
              Kept on the audit log. Never shown to them.
            </p>
            <Textarea
              id={`reason-${userId}`}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`message-${userId}`} className="text-sm font-medium text-ink">
              Message to them
            </label>
            <p className="mt-0.5 mb-1.5 text-xs text-ink-faint">Optional. Appears in their email.</p>
            <Textarea
              id={`message-${userId}`}
              rows={2}
              value={applicantMessage}
              onChange={(e) => setApplicantMessage(e.target.value)}
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
