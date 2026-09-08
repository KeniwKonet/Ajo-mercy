"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAdminNoteAction,
  reviewAlajoApplicationAction,
  startReviewAction,
} from "@/app/admin/actions";
import { Alert, Button, cn, StatusChip } from "@/components/ui/primitives";
import { Checkbox, Textarea } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FIELD_LABELS } from "@/lib/data/application-fields";
import { APPLICATION_STATUS_LABELS, applicationTone } from "@/lib/state-machine";
import type { ApplicationStatus } from "@/lib/types";

type Decision = "approve" | "request_info" | "reject" | null;

const REQUESTABLE_FIELDS = [
  "profile_photo",
  "business_photo",
  "identity_document",
  "business_document",
  "story",
  "current_challenge",
  "support_would_enable",
  "business_address",
  "business_phone",
  "requested_amount_ngn",
] as const;

/**
 * The decision column. Approve is one confirmed click; reject and suspend
 * require typing a phrase, because those are the ones you cannot take back
 * quietly.
 */
export function ReviewPanel({
  applicationId,
  status,
  businessName,
  permissions,
  missing,
}: {
  applicationId: string;
  status: ApplicationStatus;
  businessName: string;
  permissions: { approve: boolean; reject: boolean; requestInfo: boolean };
  missing: string[];
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const [applicantMessage, setApplicantMessage] = useState("");
  const [internalReason, setInternalReason] = useState("");
  const [feature, setFeature] = useState(false);
  const [requestItems, setRequestItems] = useState<Array<{ fieldKey: string; message: string }>>([]);

  const decided = ["approved", "rejected"].includes(status);
  const editable = !decided && ["submitted", "under_review", "more_information_required"].includes(status);

  // Claim the application on open so two reviewers do not work the same one.
  useEffect(() => {
    if (status === "submitted") void startReviewAction(applicationId);
  }, [applicationId, status]);

  function submit() {
    startTransition(async () => {
      const payload =
        decision === "approve"
          ? { decision: "approve" as const, applicantMessage: applicantMessage || undefined, internalReason: internalReason || undefined, feature }
          : decision === "reject"
            ? { decision: "reject" as const, applicantMessage: applicantMessage || undefined, internalReason }
            : { decision: "request_info" as const, items: requestItems, applicantMessage: applicantMessage || undefined };

      const response = await reviewAlajoApplicationAction({ applicationId, decision: payload });
      setResult({ ok: response.ok, message: response.message ?? "" });
      setConfirmOpen(false);
      if (response.ok) {
        setDecision(null);
        router.refresh();
      }
    });
  }

  const canSubmit =
    decision === "approve"
      ? permissions.approve
      : decision === "reject"
        ? permissions.reject && internalReason.trim().length >= 5
        : decision === "request_info"
          ? permissions.requestInfo && requestItems.length > 0 && requestItems.every((i) => i.message.trim().length >= 5)
          : false;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">Decision</p>
        <StatusChip tone={applicationTone(status)}>{APPLICATION_STATUS_LABELS[status]}</StatusChip>
      </div>

      {result && (
        <Alert tone={result.ok ? "positive" : "negative"} title={result.ok ? "Done" : "Not saved"}>
          {result.message}
        </Alert>
      )}

      {decided && (
        <Alert tone="neutral">
          This application has already been decided. Changing it again is done from the profile
          controls, not here.
        </Alert>
      )}

      {editable && (
        <>
          {missing.length > 0 && (
            <Alert tone="attention" title="Incomplete">
              <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                {missing.slice(0, 5).map((item) => (
                  <li key={item} className="text-xs">
                    {item}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="grid gap-2">
            <DecisionButton
              label="Approve"
              hint="Publishes the profile and emails the applicant"
              active={decision === "approve"}
              disabled={!permissions.approve}
              tone="positive"
              onClick={() => setDecision(decision === "approve" ? null : "approve")}
            />
            <DecisionButton
              label="Request more information"
              hint="Sends a list of what to fix and unlocks their form"
              active={decision === "request_info"}
              disabled={!permissions.requestInfo}
              tone="attention"
              onClick={() => setDecision(decision === "request_info" ? null : "request_info")}
            />
            <DecisionButton
              label="Reject"
              hint="Profile stays private. A reason is recorded internally"
              active={decision === "reject"}
              disabled={!permissions.reject}
              tone="negative"
              onClick={() => setDecision(decision === "reject" ? null : "reject")}
            />
          </div>

          {decision === "request_info" && (
            <RequestInfoBuilder items={requestItems} onChange={setRequestItems} />
          )}

          {decision && (
            <div className="space-y-3 border-t border-rule pt-4">
              <div>
                <label htmlFor="applicant-message" className="text-sm font-medium text-ink">
                  Message to the applicant
                </label>
                <p className="mt-0.5 mb-1.5 text-xs text-ink-faint">
                  Optional. Appears in the email they receive, in their own words section.
                </p>
                <Textarea
                  id="applicant-message"
                  rows={3}
                  maxLength={600}
                  value={applicantMessage}
                  onChange={(e) => setApplicantMessage(e.target.value)}
                />
              </div>

              {decision !== "request_info" && (
                <div>
                  <label htmlFor="internal-reason" className="text-sm font-medium text-ink">
                    Internal reason{decision === "reject" && <span className="ml-1 text-orange">*</span>}
                  </label>
                  <p className="mt-0.5 mb-1.5 text-xs text-ink-faint">
                    Never shown to the applicant. Kept on the audit log.
                  </p>
                  <Textarea
                    id="internal-reason"
                    rows={2}
                    maxLength={600}
                    value={internalReason}
                    onChange={(e) => setInternalReason(e.target.value)}
                  />
                </div>
              )}

              {decision === "approve" && (
                <Checkbox
                  checked={feature}
                  onChange={(e) => setFeature(e.target.checked)}
                  label="Feature this business"
                  description="Featured profiles lead the homepage and the listing."
                />
              )}

              <Button
                className="w-full"
                disabled={!canSubmit}
                loading={pending}
                onClick={() => setConfirmOpen(true)}
                variant={decision === "reject" ? "danger" : "primary"}
              >
                {decision === "approve"
                  ? "Approve and publish"
                  : decision === "reject"
                    ? "Reject application"
                    : `Send ${requestItems.length} request${requestItems.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          )}
        </>
      )}

      <NoteBox applicationId={applicationId} />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={
          decision === "approve"
            ? `Approve ${businessName}?`
            : decision === "reject"
              ? `Reject ${businessName}?`
              : `Send these requests to ${businessName}?`
        }
        description={
          decision === "approve"
            ? "The profile goes live immediately and the applicant is emailed that they are approved."
            : decision === "reject"
              ? "The applicant is emailed that their application was not taken forward. Their profile stays private."
              : "The applicant is emailed the list and their form is unlocked so they can update it."
        }
        confirmLabel={decision === "approve" ? "Approve and publish" : decision === "reject" ? "Reject" : "Send requests"}
        tone={decision === "reject" ? "danger" : "default"}
        requirePhrase={decision === "reject" ? "REJECT" : undefined}
        pending={pending}
        onConfirm={submit}
      />
    </div>
  );
}

function DecisionButton({
  label,
  hint,
  active,
  disabled,
  tone,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  disabled: boolean;
  tone: "positive" | "attention" | "negative";
  onClick: () => void;
}) {
  const accents = {
    positive: "border-success bg-success-wash",
    attention: "border-orange bg-panel-white",
    negative: "border-danger bg-danger-wash",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "border px-3.5 py-2.5 text-left transition-colors",
        active ? accents[tone] : "border-muted-on-black/25 bg-widget-black-2 hover:border-ink",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span className="block text-sm font-medium text-ink">{label}</span>
      <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{hint}</span>
    </button>
  );
}

function RequestInfoBuilder({
  items,
  onChange,
}: {
  items: Array<{ fieldKey: string; message: string }>;
  onChange: (items: Array<{ fieldKey: string; message: string }>) => void;
}) {
  const [fieldKey, setFieldKey] = useState<string>(REQUESTABLE_FIELDS[0]);
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-3 border border-rule bg-widget-black-2 p-3.5">
      <p className="text-sm font-medium text-ink">What needs to change?</p>

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex items-start justify-between gap-2 border-b border-rule pb-1.5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink">{FIELD_LABELS[item.fieldKey] ?? item.fieldKey}</p>
                <p className="text-xs text-ink-soft">{item.message}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="shrink-0 text-xs text-danger hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <select
          value={fieldKey}
          onChange={(e) => setFieldKey(e.target.value)}
          aria-label="Which part of the application"
          className="h-9 w-full border border-muted-on-black/25 bg-widget-black-2 px-2 text-sm"
        >
          {REQUESTABLE_FIELDS.map((key) => (
            <option key={key} value={key}>
              {FIELD_LABELS[key] ?? key}
            </option>
          ))}
        </select>

        <Textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="The ID photo is too blurry to read. Please send a clearer one."
          aria-label="What needs to change"
        />

        <Button
          size="sm"
          variant="secondary"
          disabled={message.trim().length < 5}
          onClick={() => {
            onChange([...items, { fieldKey, message: message.trim() }]);
            setMessage("");
          }}
        >
          Add request
        </Button>
      </div>
    </div>
  );
}

function NoteBox({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-t border-rule pt-4">
      <label htmlFor="admin-note" className="text-sm font-medium text-ink">
        Internal note
      </label>
      <p className="mt-0.5 mb-1.5 text-xs text-ink-faint">
        Visible to the team only. Use it to leave context for the next reviewer.
      </p>
      <Textarea id="admin-note" rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button
        size="sm"
        variant="secondary"
        className="mt-2"
        disabled={body.trim().length < 2}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const response = await addAdminNoteAction({
              entityTable: "alajo_applications",
              entityId: applicationId,
              body: body.trim(),
            });
            if (response.ok) {
              setBody("");
              router.refresh();
            }
          })
        }
      >
        Add note
      </Button>
    </div>
  );
}
