"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCampaignStatusAction } from "@/app/admin/actions";
import { Alert, Button } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_TRANSITIONS } from "@/lib/state-machine";
import type { CampaignStatus } from "@/lib/types";

/** Only transitions the state machine allows are offered, in reading order. */
const ORDER: CampaignStatus[] = [
  "selection_period",
  "under_review",
  "confirmed",
  "announced",
  "completed",
  "cancelled",
];

const DESCRIPTIONS: Partial<Record<CampaignStatus, string>> = {
  selection_period: "The brand can start browsing and selecting businesses. They will be emailed.",
  under_review: "Selections close and come to your team for confirmation.",
  confirmed: "Marks the campaign recipients as settled. Individual businesses are still told separately, from the support page.",
  announced: "Use once the campaign has been shared publicly.",
  completed: "Closes the campaign.",
  cancelled: "Closes the campaign without support being arranged.",
};

export function CampaignControls({
  campaignId,
  status,
  name,
}: {
  campaignId: string;
  status: CampaignStatus;
  name: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<CampaignStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const available = ORDER.filter((next) => CAMPAIGN_TRANSITIONS[status].includes(next));
  if (available.length === 0) return null;

  return (
    <div className="shrink-0 space-y-2">
      {error && <Alert tone="negative">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        {available.map((next) => (
          <Button
            key={next}
            size="sm"
            variant={next === "cancelled" ? "danger" : next === "selection_period" ? "primary" : "secondary"}
            onClick={() => setTarget(next)}
          >
            {next === "selection_period" ? "Open selections" : CAMPAIGN_STATUS_LABELS[next]}
          </Button>
        ))}
      </div>

      {target && (
        <ConfirmDialog
          open
          onClose={() => setTarget(null)}
          title={`Move ${name} to ${CAMPAIGN_STATUS_LABELS[target].toLowerCase()}?`}
          description={DESCRIPTIONS[target] ?? "The brand will be emailed about this change."}
          confirmLabel="Update campaign"
          tone={target === "cancelled" ? "danger" : "default"}
          {...(target === "cancelled" ? { requirePhrase: "CANCEL" } : {})}
          pending={pending}
          onConfirm={() =>
            startTransition(async () => {
              const response = await updateCampaignStatusAction({ campaignId, status: target });
              setTarget(null);
              if (response.ok) router.refresh();
              else setError(response.message ?? "Could not update the campaign.");
            })
          }
        />
      )}
    </div>
  );
}
