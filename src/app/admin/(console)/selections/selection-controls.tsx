"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createConfirmationAction, reviewSelectionAction } from "@/app/admin/actions";
import { Alert, Button } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";

/**
 * Shortlist or decline a selection, and promote a shortlisted one into a
 * pending support record. Creating the record still tells nobody: the
 * congratulations email only goes out when someone confirms it.
 */
export function SelectionControls({
  selectionId,
  status,
  alajoProfileId,
  campaignId,
  businessName,
  selectorName,
  canConfirm,
}: {
  selectionId: string;
  status: string;
  alajoProfileId: string;
  campaignId: string | null;
  businessName: string;
  selectorName: string;
  canConfirm: boolean;
}) {
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<"shortlist" | "decline" | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("cash");
  const [supporterLabel, setSupporterLabel] = useState(selectorName);
  const [note, setNote] = useState("");

  return (
    <div className="shrink-0 space-y-2">
      {error && <Alert tone="negative">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        {status === "recorded" && (
          <>
            <Button size="sm" onClick={() => setConfirmAction("shortlist")}>
              Shortlist
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmAction("decline")}>
              Decline
            </Button>
          </>
        )}
        {status === "shortlisted" && canConfirm && (
          <Button size="sm" onClick={() => setSupportOpen(true)}>
            Record support
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction === "shortlist"}
        onClose={() => setConfirmAction(null)}
        title={`Shortlist ${businessName}?`}
        description="This moves the selection forward internally. The business is not told anything new."
        confirmLabel="Shortlist"
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const response = await reviewSelectionAction({ selectionId, action: "shortlist" });
            setConfirmAction(null);
            if (response.ok) router.refresh();
            else setError(response.message ?? "Could not shortlist.");
          })
        }
      />

      <ConfirmDialog
        open={confirmAction === "decline"}
        onClose={() => setConfirmAction(null)}
        title={`Decline this selection?`}
        description={`${selectorName} selected ${businessName}. Declining closes the selection. The business is not told.`}
        confirmLabel="Decline"
        tone="danger"
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const response = await reviewSelectionAction({ selectionId, action: "decline" });
            setConfirmAction(null);
            if (response.ok) router.refresh();
            else setError(response.message ?? "Could not decline.");
          })
        }
      />

      <Modal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        title={`Record support for ${businessName}`}
        description="This creates a pending support record. Nothing is sent to the business until you confirm it on the support page."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSupportOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={supporterLabel.trim().length < 2}
              onClick={() =>
                startTransition(async () => {
                  const response = await createConfirmationAction({
                    alajoProfileId,
                    campaignId: campaignId ?? undefined,
                    selectionId,
                    amountNgn: amount ? Number(amount) : undefined,
                    supportKind: kind,
                    supporterLabel: supporterLabel.trim(),
                    internalNote: note || undefined,
                  });
                  setSupportOpen(false);
                  if (response.ok) router.refresh();
                  else setError(response.message ?? "Could not create the support record.");
                })
              }
            >
              Create support record
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="How should the supporter be described publicly?"
            required
            description="The business sees this in their email. Use a name only if the supporter agreed to be named."
          >
            <Input value={supporterLabel} onChange={(e) => setSupporterLabel(e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type of support" required>
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="equipment">Equipment</option>
                <option value="inventory">Inventory</option>
                <option value="mentorship">Mentorship</option>
                <option value="mixed">A mix</option>
              </Select>
            </Field>

            <Field label="Amount (₦)" optional description="Leave empty if it is not a cash amount.">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Internal note" optional description="Team only. Never shown to the business.">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
