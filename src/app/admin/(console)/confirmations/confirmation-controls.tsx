"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateConfirmationAction } from "@/app/admin/actions";
import { Alert, Button } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CONFIRMATION_TRANSITIONS } from "@/lib/state-machine";
import type { ConfirmationStatus } from "@/lib/types";

type Action = "confirm" | "announce" | "complete" | "cancel";

const TARGET: Record<Action, ConfirmationStatus> = {
  confirm: "confirmed",
  announce: "announced",
  complete: "completed",
  cancel: "cancelled",
};

const COPY: Record<Action, { label: string; title: string; description: string; danger: boolean; phrase?: string }> = {
  confirm: {
    label: "Confirm support",
    title: "Confirm this support?",
    // This is the one action in the product that tells someone they have been
    // chosen, so the dialog says exactly that.
    description:
      "This sends the congratulations email straight away and tells the business it is being supported. It cannot be unsent.",
    danger: false,
    phrase: "CONFIRM",
  },
  announce: {
    label: "Mark announced",
    title: "Mark this as announced?",
    description: "Use this once the support has been shared publicly or on social media.",
    danger: false,
  },
  complete: {
    label: "Mark complete",
    title: "Mark this support complete?",
    description: "Use this once the support has actually reached the business.",
    danger: false,
  },
  cancel: {
    label: "Cancel",
    title: "Cancel this support record?",
    description:
      "The record is closed. If the business has already been emailed, someone will need to contact them directly.",
    danger: true,
    phrase: "CANCEL",
  },
};

export function ConfirmationControls({
  confirmationId,
  status,
  businessName,
  canAnnounce,
}: {
  confirmationId: string;
  status: ConfirmationStatus;
  businessName: string;
  canAnnounce: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allowed = CONFIRMATION_TRANSITIONS[status];
  const available = (Object.keys(TARGET) as Action[]).filter((action) => {
    if (!allowed.includes(TARGET[action])) return false;
    if (action === "announce" && !canAnnounce) return false;
    return true;
  });

  if (available.length === 0) return null;

  return (
    <div className="shrink-0 space-y-2">
      {error && <Alert tone="negative">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        {available.map((action) => (
          <Button
            key={action}
            size="sm"
            variant={action === "cancel" ? "danger" : action === "confirm" ? "primary" : "secondary"}
            onClick={() => setTarget(action)}
          >
            {COPY[action].label}
          </Button>
        ))}
      </div>

      {target && (
        <ConfirmDialog
          open
          onClose={() => setTarget(null)}
          title={COPY[target].title}
          description={`${businessName}. ${COPY[target].description}`}
          confirmLabel={COPY[target].label}
          tone={COPY[target].danger ? "danger" : "default"}
          {...(COPY[target].phrase ? { requirePhrase: COPY[target].phrase } : {})}
          pending={pending}
          onConfirm={() =>
            startTransition(async () => {
              const response = await updateConfirmationAction({
                confirmationId,
                action: target,
              });
              setTarget(null);
              if (response.ok) router.refresh();
              else setError(response.message ?? "Could not update that record.");
            })
          }
        />
      )}
    </div>
  );
}
