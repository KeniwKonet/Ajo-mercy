import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listAuditLog } from "@/lib/data/admin";
import { AUDIT_ACTION_LABELS } from "@/lib/audit";
import { DashboardPage } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/** Entity tables that have a page worth linking to from a log row. */
const LINKABLE: Record<string, (id: string) => string> = {
  alajo_applications: (id) => `/admin/alajos/${id}`,
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; entity?: string }>;
}) {
  await requirePermission("audit.view");
  const { page: pageParam, action, entity } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { items, total } = await listAuditLog({
    page,
    pageSize: PAGE_SIZE,
    ...(action ? { action } : {}),
    ...(entity ? { entityTable: entity } : {}),
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardPage
      title="Audit log"
      description="Every administrative action, who took it and when. This log is append-only."
      actions={
        (action || entity) && (
          <Link href="/admin/audit" className="link-rule text-sm text-ink-soft hover:text-ink">
            Clear filter
          </Link>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          description="Administrative actions are recorded here as they happen."
        />
      ) : (
        <div className="space-y-6">
          <ol className="grid-rules border-t border-rule">
            {items.map((item) => {
              const link = item.entityId ? LINKABLE[item.entityTable]?.(item.entityId) : undefined;
              return (
                <li key={item.id} className="grid gap-1 py-3.5 sm:grid-cols-[1fr_auto] sm:items-baseline">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">
                      <span className="font-medium">{item.actor ?? "System"}</span>{" "}
                      <Link
                        href={`/admin/audit?action=${encodeURIComponent(item.action)}`}
                        className="link-rule text-ink-soft"
                      >
                        {AUDIT_ACTION_LABELS[item.action] ?? item.action}
                      </Link>
                      {item.entityLabel ? (
                        link ? (
                          <>
                            {" "}
                            <Link href={link} className="link-rule font-medium text-ink">
                              {item.entityLabel}
                            </Link>
                          </>
                        ) : (
                          <span className="font-medium"> {item.entityLabel}</span>
                        )
                      ) : null}
                    </p>
                    <p className="mt-0.5 font-mono text-2xs text-ink-faint">{item.entityTable}</p>
                  </div>
                  <p className="font-mono text-2xs text-ink-faint sm:text-right">
                    {formatDateTime(item.createdAt)}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="flex items-center justify-between border-t border-rule pt-4 text-sm">
            <span className="text-ink-faint tabular">
              Page {page} of {pageCount} · {total} entries
            </span>
            <div className="flex gap-4">
              {page > 1 && (
                <Link href={buildHref(page - 1, action, entity)} className="link-rule text-ink">
                  ← Newer
                </Link>
              )}
              {page < pageCount && (
                <Link href={buildHref(page + 1, action, entity)} className="link-rule text-ink">
                  Older →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardPage>
  );
}

function buildHref(page: number, action?: string, entity?: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (action) params.set("action", action);
  if (entity) params.set("entity", entity);
  return `/admin/audit${params.toString() ? `?${params}` : ""}`;
}
