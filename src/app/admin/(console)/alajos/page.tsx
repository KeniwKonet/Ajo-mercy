import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listReviewQueue } from "@/lib/data/applications";
import { DashboardPage } from "@/components/dashboard/shell";
import { DataTable, EmptyState, StatusChip, Td, Th, cn } from "@/components/ui/primitives";
import { APPLICATION_STATUS_LABELS, applicationTone } from "@/lib/state-machine";
import { formatRelative } from "@/lib/format";
import { CATEGORY_LABELS, type ApplicationStatus, type BusinessCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Applications", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS: Array<{ key: string; label: string; statuses: ApplicationStatus[] }> = [
  { key: "queue", label: "Needs review", statuses: ["submitted", "under_review"] },
  { key: "more_information_required", label: "Awaiting reply", statuses: ["more_information_required"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
  { key: "draft", label: "Drafts", statuses: ["draft"] },
  { key: "all", label: "All", statuses: [] },
];

export default async function AdminAlajosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requirePermission("alajo.review");
  const { status, q, page: pageParam } = await searchParams;

  const tab = TABS.find((t) => t.key === status) ?? TABS[0]!;
  const page = Math.max(1, Number(pageParam) || 1);

  const { items, total } = await listReviewQueue({
    ...(tab.statuses.length > 0 ? { status: tab.statuses } : {}),
    ...(q ? { search: q } : {}),
    page,
    pageSize: 25,
  });

  return (
    <DashboardPage
      title="Applications"
      description="Oldest submission first, so nobody waits longer than the person ahead of them."
    >
      <div className="space-y-6">
        {/* Tabs are links, so a filtered queue can be shared with a colleague. */}
        <nav aria-label="Filter by status" className="overflow-x-auto">
          <ul className="flex min-w-max gap-1 border-b border-rule">
            {TABS.map((item) => {
              const active = item.key === tab.key;
              return (
                <li key={item.key}>
                  <Link
                    href={item.key === "queue" ? "/admin/alajos" : `/admin/alajos?status=${item.key}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block border-b-2 px-3.5 py-2.5 text-sm transition-colors",
                      active
                        ? "border-forest font-medium text-ink"
                        : "border-transparent text-ink-soft hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form className="flex gap-2" role="search">
          {tab.key !== "queue" && <input type="hidden" name="status" value={tab.key} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Business or founder name"
            aria-label="Search applications"
            className="h-9 w-full max-w-xs border border-rule-strong bg-card px-3 text-sm focus-visible:border-forest focus-visible:outline-none"
          />
          <button
            type="submit"
            className="h-9 shrink-0 border border-rule-strong px-3 text-sm hover:border-ink"
          >
            Search
          </button>
        </form>

        {items.length === 0 ? (
          <EmptyState
            title="Nothing here"
            description={
              q
                ? "No applications match that search."
                : "This queue is clear. Applications appear as they are submitted."
            }
          />
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <Th>Business</Th>
                  <Th>Founder</Th>
                  <Th>Category</Th>
                  <Th>Location</Th>
                  <Th className="text-right">Complete</Th>
                  <Th>Submitted</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-paper-warm">
                    <Td>
                      <Link href={`/admin/alajos/${item.id}`} className="font-medium text-ink hover:underline">
                        {item.business_name ?? "Untitled"}
                      </Link>
                    </Td>
                    <Td className="text-ink-soft">{item.founder_name ?? item.applicant_email}</Td>
                    <Td className="text-ink-soft">
                      {item.business_category
                        ? CATEGORY_LABELS[item.business_category as BusinessCategory]
                        : "—"}
                    </Td>
                    <Td className="text-ink-soft">{item.state ?? "—"}</Td>
                    <Td className="text-right tabular">
                      <span className={item.completeness < 100 ? "text-terracotta" : "text-ink-soft"}>
                        {item.completeness}%
                      </span>
                    </Td>
                    <Td className="text-ink-faint">
                      {item.submitted_at ? formatRelative(item.submitted_at) : "—"}
                    </Td>
                    <Td>
                      <StatusChip tone={applicationTone(item.status)}>
                        {APPLICATION_STATUS_LABELS[item.status]}
                      </StatusChip>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <div className="flex items-center justify-between border-t border-rule pt-4 text-sm">
              <span className="text-ink-faint tabular">
                {items.length} of {total}
              </span>
              <div className="flex gap-4">
                {page > 1 && (
                  <Link
                    href={buildHref(tab.key, q, page - 1)}
                    className="link-rule text-ink"
                  >
                    ← Previous
                  </Link>
                )}
                {page * 25 < total && (
                  <Link href={buildHref(tab.key, q, page + 1)} className="link-rule text-ink">
                    Next →
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardPage>
  );
}

function buildHref(status: string, q: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (status !== "queue") params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  return `/admin/alajos${params.toString() ? `?${params}` : ""}`;
}
