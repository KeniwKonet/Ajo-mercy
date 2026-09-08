import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listSelectionQueue, listSelectionRisk } from "@/lib/data/admin";
import { can } from "@/lib/rbac";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, EmptyState, StatusChip } from "@/components/ui/primitives";
import { SelectionControls } from "./selection-controls";
import { formatDateTime, formatRelative } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Selections", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSelectionsPage() {
  const reviewer = await requirePermission("campaign.review_selections");
  const [selections, risk] = await Promise.all([
    listSelectionQueue(["recorded", "shortlisted"]),
    listSelectionRisk(),
  ]);

  const canConfirm = can(reviewer, "confirmation.create");

  return (
    <DashboardPage
      title="Selections"
      description="Who has been chosen, by whom, and what happens next."
    >
      <div className="space-y-8">
        <Alert tone="neutral" title="Selection is not confirmation">
          Every business here has been told it is under consideration. None of them has been told it
          is being supported. That only happens after a support record is confirmed.
        </Alert>

        {risk.length > 0 && (
          <Alert tone="attention" title="Possible duplicate accounts">
            <p>
              {risk.length} {risk.length === 1 ? "device or address is" : "devices or addresses are"}{" "}
              linked to more than one selecting account. Worth a look before confirming anything from
              these.
            </p>
            <ul className="mt-2 space-y-1">
              {risk.slice(0, 5).map((row) => (
                <li key={`${row.device_hash}-${row.ip_hash}`} className="font-mono text-2xs text-ink-soft">
                  {row.distinct_selectors} accounts · {row.selection_count} selections · last{" "}
                  {formatRelative(row.last_seen)} · device {row.device_hash?.slice(0, 10) ?? "unknown"}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {selections.length === 0 ? (
          <EmptyState
            title="No selections waiting"
            description="Selections appear here as supporters and brands make them."
          />
        ) : (
          <ul className="grid-rules border-t border-rule">
            {selections.map((selection) => (
              <li key={selection.id} className="flex flex-wrap items-start justify-between gap-5 py-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/alajos/${selection.business_slug}`}
                      className="link-rule font-display text-lg text-ink"
                    >
                      {selection.business_name}
                    </Link>
                    <StatusChip tone={selection.status === "shortlisted" ? "progress" : "attention"}>
                      {selection.status === "shortlisted" ? "Shortlisted" : "New"}
                    </StatusChip>
                    <StatusChip tone="neutral">{selection.selector_kind}</StatusChip>
                  </div>

                  <p className="mt-1 text-sm text-ink-soft">
                    Selected by <span className="font-medium text-ink">{selection.selector_name}</span>
                    <span className="text-ink-faint"> ({selection.selector_email})</span>
                    {selection.campaign_name ? ` · ${selection.campaign_name}` : ""}
                  </p>

                  <p className="mt-1 font-mono text-2xs uppercase tracking-[0.1em] text-ink-faint">
                    {CATEGORY_LABELS[selection.business_category]}
                    <span className="mx-1.5 text-rule-strong">/</span>
                    {formatDateTime(selection.created_at)}
                  </p>

                  {selection.note && (
                    <p className="mt-2.5 max-w-prose border-l-2 border-muted-on-black/25 pl-3 text-sm leading-relaxed text-ink-soft">
                      {selection.note}
                    </p>
                  )}
                </div>

                <SelectionControls
                  selectionId={selection.id}
                  status={selection.status}
                  alajoProfileId={selection.alajo_profile_id}
                  campaignId={selection.campaign_id}
                  businessName={selection.business_name}
                  selectorName={selection.selector_name}
                  canConfirm={canConfirm}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardPage>
  );
}
