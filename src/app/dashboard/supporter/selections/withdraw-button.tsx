"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawSelectionAction } from "../actions";
import { Button } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/dialog";

export function WithdrawSelectionButton({
  selectionId,
  businessName,
}: {
  selectionId: string;
  businessName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="shrink-0">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Withdraw
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Withdraw your selection of ${businessName}?`}
        description="The selection is removed and returned to your allowance. You can select this business again later."
        confirmLabel="Withdraw selection"
        tone="danger"
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await withdrawSelectionAction(selectionId);
            if (result.ok) {
              setOpen(false);
              router.refresh();
            } else {
              setError(result.message ?? "Could not withdraw.");
              setOpen(false);
            }
          })
        }
      />
    </div>
  );
}
