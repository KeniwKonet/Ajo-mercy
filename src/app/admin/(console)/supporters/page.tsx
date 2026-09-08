import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { listSupporterQueue } from "@/lib/data/admin";
import { DashboardPage } from "@/components/dashboard/shell";
import { EmptyState, StatusChip } from "@/components/ui/primitives";
import { ApproveRejectControls } from "@/app/admin/review-actions";
import { APPLICATION_STATUS_LABELS, applicationTone } from "@/lib/state-machine";
import { formatRelative } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Supporters", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSupportersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("supporter.review");
  const { status } = await searchParams;

  const statuses =
    status === "approved"
      ? (["approved"] as const)
      : status === "rejected"
        ? (["rejected"] as const)
        : (["submitted", "under_review"] as const);

  const supporters = await listSupporterQueue([...statuses]);
  const reviewing = statuses[0] === "submitted";

  return (
    <DashboardPage
      title="Supporters"
      description="People who want to back a business. Approving one lets them make selections."
    >
      {supporters.length === 0 ? (
        <EmptyState
          title={reviewing ? "No registrations waiting" : "Nothing here"}
          description={
            reviewing
              ? "Every supporter registration has been dealt with."
              : "No supporters with that status."
          }
        />
      ) : (
        <ul className="grid-rules border-t border-rule">
          {supporters.map((supporter) => (
            <li key={supporter.id} className="flex flex-wrap items-start justify-between gap-5 py-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="font-medium text-ink">{supporter.full_name}</p>
                  <StatusChip tone={applicationTone(supporter.status)}>
                    {APPLICATION_STATUS_LABELS[supporter.status]}
                  </StatusChip>
                </div>

                <p className="mt-0.5 text-xs text-ink-faint">
                  {supporter.email}
                  {supporter.phone ? ` · ${supporter.phone}` : ""}
                  {supporter.city || supporter.state
                    ? ` · ${[supporter.city, supporter.state].filter(Boolean).join(", ")}`
                    : ""}
                  {supporter.occupation ? ` · ${supporter.occupation}` : ""}
                </p>

                {supporter.motivation && (
                  <p className="mt-2.5 max-w-prose border-l-2 border-muted-on-black/25 pl-3 text-sm leading-relaxed text-ink-soft">
                    {supporter.motivation}
                  </p>
                )}

                {supporter.interests.length > 0 && (
                  <p className="mt-2 text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">
                    {supporter.interests.map((i) => CATEGORY_LABELS[i]).join(" · ")}
                  </p>
                )}

                <p className="mt-2 text-2xs text-ink-faint">
                  {supporter.submitted_at
                    ? `Submitted ${formatRelative(supporter.submitted_at)}`
                    : "Not submitted"}
                  {supporter.how_heard ? ` · heard via ${supporter.how_heard}` : ""}
                </p>
              </div>

              {reviewing && (
                <ApproveRejectControls
                  kind="supporter"
                  userId={supporter.user_id}
                  label={supporter.full_name}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
