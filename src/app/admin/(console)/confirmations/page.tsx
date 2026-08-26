import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listConfirmations } from "@/lib/data/admin";
import { can } from "@/lib/rbac";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, EmptyState, StatusChip } from "@/components/ui/primitives";
import { ConfirmationControls } from "./confirmation-controls";
import { CONFIRMATION_STATUS_LABELS } from "@/lib/state-machine";
import { formatDateTime, formatNaira } from "@/lib/format";
import type { ConfirmationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TONES: Record<ConfirmationStatus, "attention" | "positive" | "neutral" | "negative"> = {
  pending: "attention",
  confirmed: "positive",
  announced: "positive",
  completed: "neutral",
  cancelled: "negative",
};

export default async function AdminConfirmationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const reviewer = await requirePermission("confirmation.create");
  const { status } = await searchParams;

  const statuses: ConfirmationStatus[] =
    status === "all"
      ? ["pending", "confirmed", "announced", "completed", "cancelled"]
      : status === "completed"
        ? ["completed"]
        : ["pending", "confirmed", "announced"];

  const confirmations = await listConfirmations(statuses);
  const pendingCount = confirmations.filter((c) => c.status === "pending").length;

  return (
    <DashboardPage
      title="Support"
      description="Every support record, and the point at which a business is finally told."
      actions={
        <div className="flex gap-3 text-sm">
          <Link href="/admin/confirmations" className="link-rule text-ink-soft hover:text-ink">
            Active
          </Link>
          <Link href="/admin/confirmations?status=completed" className="link-rule text-ink-soft hover:text-ink">
            Completed
          </Link>
          <Link href="/admin/confirmations?status=all" className="link-rule text-ink-soft hover:text-ink">
            All
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {pendingCount > 0 && (
          <Alert tone="attention" title={`${pendingCount} waiting on a decision`}>
            Nobody on this list has been told they are being supported. Confirming sends the
            congratulations email immediately, so check the details first.
          </Alert>
        )}

        {confirmations.length === 0 ? (
          <EmptyState
            title="No support records"
            description="Records are created from the selections page once a selection has been shortlisted."
          />
        ) : (
          <ul className="grid-rules border-t border-rule">
            {confirmations.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-5 py-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/alajos/${item.business_slug}`}
                      className="link-rule font-display text-lg text-ink"
                    >
                      {item.business_name}
                    </Link>
                    <StatusChip tone={TONES[item.status]}>
                      {CONFIRMATION_STATUS_LABELS[item.status]}
                    </StatusChip>
                  </div>

                  <p className="mt-1 text-sm text-ink-soft">
                    Supported by{" "}
                    <span className="font-medium text-ink">
                      {item.supporter_label ?? "an Ajo Mercy supporter"}
                    </span>
                    {item.support_kind ? ` · ${item.support_kind}` : ""}
                    {item.amount_ngn ? ` · ${formatNaira(item.amount_ngn)}` : ""}
                    {item.campaign_name ? ` · ${item.campaign_name}` : ""}
                  </p>

                  {item.internal_note && (
                    <p className="mt-2 max-w-prose border-l-2 border-rule-strong pl-3 text-sm leading-relaxed text-ink-soft">
                      {item.internal_note}
                    </p>
                  )}

                  <p className="mt-2 font-mono text-2xs text-ink-faint">
                    Created {formatDateTime(item.created_at)}
                    {item.confirmed_at ? ` · confirmed ${formatDateTime(item.confirmed_at)}` : ""}
                    {item.announced_at ? ` · announced ${formatDateTime(item.announced_at)}` : ""}
                  </p>
                </div>

                <ConfirmationControls
                  confirmationId={item.id}
                  status={item.status}
                  businessName={item.business_name}
                  canAnnounce={can(reviewer, "confirmation.announce")}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardPage>
  );
}
