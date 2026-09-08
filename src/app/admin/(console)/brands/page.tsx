import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { listBrandQueue } from "@/lib/data/admin";
import { DashboardPage } from "@/components/dashboard/shell";
import { EmptyState, StatusChip } from "@/components/ui/primitives";
import { ApproveRejectControls } from "@/app/admin/review-actions";
import { APPLICATION_STATUS_LABELS, applicationTone } from "@/lib/state-machine";
import { formatNairaCompact, formatRelative } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Brands", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("brand.review");
  const { status } = await searchParams;

  const statuses =
    status === "approved"
      ? (["approved"] as const)
      : status === "rejected"
        ? (["rejected"] as const)
        : (["submitted", "under_review"] as const);

  const brands = await listBrandQueue([...statuses]);
  const reviewing = statuses[0] === "submitted";

  return (
    <DashboardPage
      title="Brands"
      description="Organisations that want to support businesses. Check they are who they say they are before approving."
    >
      {brands.length === 0 ? (
        <EmptyState title="Nothing waiting" description="No brand registrations with that status." />
      ) : (
        <ul className="grid-rules border-t border-rule">
          {brands.map((brand) => (
            <li key={brand.id} className="flex flex-wrap items-start justify-between gap-5 py-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="font-display text-lg text-ink">{brand.organisation_name}</p>
                  <StatusChip tone={applicationTone(brand.status)}>
                    {APPLICATION_STATUS_LABELS[brand.status]}
                  </StatusChip>
                </div>

                <p className="mt-0.5 text-xs text-ink-faint">
                  {brand.industry}
                  {brand.registration_number ? ` · RC ${brand.registration_number}` : ""}
                  {brand.website_url ? (
                    <>
                      {" · "}
                      <a
                        href={brand.website_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="link-rule text-ink"
                      >
                        {brand.website_url.replace(/^https?:\/\//, "")}
                      </a>
                    </>
                  ) : null}
                </p>

                <p className="mt-2 text-sm text-ink-soft">
                  <span className="font-medium text-ink">{brand.contact_person_name}</span>
                  {brand.contact_person_role ? `, ${brand.contact_person_role}` : ""}
                  {" · "}
                  {brand.contact_email}
                  {brand.contact_phone ? ` · ${brand.contact_phone}` : ""}
                </p>

                {brand.support_purpose && (
                  <p className="mt-2.5 max-w-prose border-l-2 border-muted-on-black/25 pl-3 text-sm leading-relaxed text-ink-soft">
                    {brand.support_purpose}
                  </p>
                )}

                <p className="mt-2.5 font-mono text-2xs uppercase tracking-[0.1em] text-ink-faint">
                  {brand.businesses_target ?? "?"} businesses
                  {brand.budget_max_ngn ? ` · up to ${formatNairaCompact(brand.budget_max_ngn)}` : ""}
                  {brand.preferred_categories.length > 0
                    ? ` · ${brand.preferred_categories.map((c) => CATEGORY_LABELS[c]).join(", ")}`
                    : ""}
                </p>

                <p className="mt-2 text-2xs text-ink-faint">
                  {brand.submitted_at ? `Submitted ${formatRelative(brand.submitted_at)}` : "Not submitted"}
                  {" · account "}
                  {brand.email}
                </p>
              </div>

              {reviewing && (
                <ApproveRejectControls
                  kind="brand"
                  userId={brand.user_id}
                  label={brand.organisation_name ?? "this organisation"}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
