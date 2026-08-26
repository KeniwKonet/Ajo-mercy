"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfileStatusAction } from "@/app/admin/actions";
import { Alert, Button, StatusChip } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ALAJO_PROFILE_STATUS_LABELS, ALAJO_PROFILE_TRANSITIONS } from "@/lib/state-machine";
import type { AlajoProfileStatus } from "@/lib/types";

type Action = "feature" | "unfeature" | "suspend" | "restore" | "archive";

const ACTION_TARGET: Record<Action, AlajoProfileStatus> = {
  feature: "featured",
  unfeature: "approved",
  suspend: "suspended",
  restore: "approved",
  archive: "archived",
};

const COPY: Record<Action, { label: string; title: string; description: string; danger: boolean; phrase?: string }> = {
  feature: {
    label: "Feature",
    title: "Feature this business?",
    description: "It leads the homepage and appears first in the listing.",
    danger: false,
  },
  unfeature: {
    label: "Remove feature",
    title: "Remove the feature?",
    description: "The profile stays live but stops leading the homepage.",
    danger: false,
  },
  suspend: {
    label: "Suspend",
    title: "Suspend this profile?",
    description: "It disappears from the public site immediately. Existing links will 404.",
    danger: true,
    phrase: "SUSPEND",
  },
  restore: {
    label: "Restore",
    title: "Restore this profile?",
    description: "It becomes publicly visible again.",
    danger: false,
  },
  archive: {
    label: "Archive",
    title: "Archive this profile?",
    description: "It is removed from the public site and from campaign eligibility.",
    danger: true,
    phrase: "ARCHIVE",
  },
};

/**
 * Profile lifecycle controls. Only actions the state machine actually permits
 * from the current status are offered, so there is no button that fails.
 */
export function ProfileControls({
  profileId,
  status,
  slug,
  businessName,
  canFeature,
  canSuspend,
}: {
  profileId: string;
  status: AlajoProfileStatus;
  slug: string;
  businessName: string;
  canFeature: boolean;
  canSuspend: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<Action | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const allowed = ALAJO_PROFILE_TRANSITIONS[status];

  const available = (Object.keys(ACTION_TARGET) as Action[]).filter((action) => {
    if (!allowed.includes(ACTION_TARGET[action])) return false;
    // "restore" and "unfeature" both land on approved; only offer the one that
    // matches where the profile actually is.
    if (action === "restore" && status !== "suspended") return false;
    if (action === "unfeature" && status !== "featured") return false;
    const destructive = action === "suspend" || action === "archive";
    return destructive ? canSuspend : canFeature;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">Public profile</p>
        <StatusChip tone={status === "featured" ? "feature" : status === "suspended" ? "negative" : "positive"}>
          {ALAJO_PROFILE_STATUS_LABELS[status]}
        </StatusChip>
      </div>

      {result && (
        <Alert tone={result.ok ? "positive" : "negative"}>{result.message}</Alert>
      )}

      {(status === "approved" || status === "featured") && (
        <Link href={`/alajos/${slug}`} className="link-rule block text-sm text-ink">
          View public profile
        </Link>
      )}

      {available.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {available.map((action) => (
            <Button
              key={action}
              size="sm"
              variant={COPY[action].danger ? "danger" : "secondary"}
              onClick={() => setTarget(action)}
            >
              {COPY[action].label}
            </Button>
          ))}
        </div>
      )}

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
              const response = await updateProfileStatusAction({ profileId, action: target });
              setResult({ ok: response.ok, message: response.message ?? "" });
              setTarget(null);
              if (response.ok) router.refresh();
            })
          }
        />
      )}
    </div>
  );
}
