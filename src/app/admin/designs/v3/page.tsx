import Image from "next/image";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getReviewDetail, listReviewQueue } from "@/lib/data/applications";
import { publicMediaUrl } from "@/lib/data/media-url";
import { getDashboardCounts } from "@/lib/data/admin";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatNaira, formatRelative, yearsOperating } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * DASHBOARD 03 — REVIEW WORKSPACE
 *
 * Layout philosophy: an inbox. A permanent list on the left, the selected
 * application filling the rest, and no dashboard at all — the assumption is
 * that a reviewer opens this and works down the queue without navigating.
 * Selecting is a link, so the queue position lives in the URL and the browser's
 * back button behaves like an email client's.
 */
export default async function ReviewWorkspaceDirection({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await requireStaff();
  const { id } = await searchParams;

  const [queue, counts] = await Promise.all([
    listReviewQueue({ status: ["submitted", "under_review", "more_information_required"], pageSize: 30 }),
    getDashboardCounts(),
  ]);

  const selectedId = id ?? queue.items[0]?.id;
  const detail = selectedId ? await getReviewDetail(selectedId) : null;

  const photos = detail?.media.filter((m) => m.kind === "business_photo" || m.kind === "profile_photo") ?? [];

  return (
    <div className="h-dvh bg-paper lg:grid lg:grid-cols-[22rem_1fr] lg:overflow-hidden">
      {/* ------------------------------------------------------- the inbox */}
      <aside className="flex flex-col border-b border-rule lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-3">
          <h1 className="font-display text-lg">Review</h1>
          <span className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint tabular">
            {counts.pending_alajo_reviews} waiting
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {queue.items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-soft">Nothing to review.</p>
          ) : (
            <ul>
              {queue.items.map((item) => {
                const active = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <Link
                      href={`/admin/designs/v3?id=${item.id}`}
                      aria-current={active ? "true" : undefined}
                      className={`block border-b border-rule px-4 py-3 transition-colors ${
                        active ? "border-l-2 border-l-forest bg-widget-black-2" : "hover:bg-widget-black-2"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-ink">
                          {item.business_name ?? "Untitled"}
                        </p>
                        <span
                          className={`shrink-0 text-2xs tabular ${
                            item.completeness < 100 ? "text-orange" : "text-ink-faint"
                          }`}
                        >
                          {item.completeness}%
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-faint">
                        {item.founder_name ?? item.applicant_email}
                      </p>
                      <p className="mt-1 font-mono text-2xs uppercase tracking-[0.1em] text-ink-faint">
                        {item.status === "more_information_required"
                          ? "awaiting reply"
                          : item.status === "under_review"
                            ? "in review"
                            : "new"}
                        {item.submitted_at ? ` · ${formatRelative(item.submitted_at)}` : ""}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* -------------------------------------------------- the application */}
      <main className="min-h-0 overflow-y-auto pb-24">
        {!detail ? (
          <div className="flex h-full items-center justify-center px-6 py-20">
            <p className="max-w-sm text-center text-sm text-ink-soft">
              Nothing selected. When applications arrive they appear in the list on the left, oldest
              first.
            </p>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-paper/95 px-6 py-3.5 backdrop-blur-sm">
              <div>
                <h2 className="font-display text-xl">
                  {detail.application.business_name ?? "Untitled application"}
                </h2>
                <p className="text-xs text-ink-faint">
                  {detail.applicant.full_name} · {detail.applicant.email}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="border border-muted-on-black/25 px-3 py-1.5 text-xs hover:border-ink"
                >
                  Request info
                </button>
                <button
                  type="button"
                  className="border border-muted-on-black/25 px-3 py-1.5 text-xs hover:border-ink"
                >
                  Reject
                </button>
                <Link
                  href={`/admin/alajos/${detail.application.id}`}
                  className="bg-widget-black px-3 py-1.5 text-xs font-medium text-ivory-text hover:brightness-95"
                >
                  Open full review
                </Link>
              </div>
            </div>

            <div className="grid gap-8 px-6 py-6 xl:grid-cols-[1fr_18rem]">
              <div className="min-w-0">
                {photos.length > 0 && (
                  <div className="mb-6 flex gap-2 overflow-x-auto">
                    {photos.map((photo) => {
                      const url = publicMediaUrl(photo.storage_path);
                      if (!url) return null;
                      return (
                        <div key={photo.id} className="relative aspect-[4/3] w-44 shrink-0 bg-widget-black-2">
                          <Image
                            src={url}
                            alt={photo.caption ?? "Business photograph"}
                            fill
                            sizes="176px"
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {detail.application.story && (
                  <section>
                    <h3 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                      Story
                    </h3>
                    <div className="prose-editorial mt-2">
                      {detail.application.story.split(/\n{2,}/).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                )}

                {detail.application.current_challenge && (
                  <section className="mt-6 border-l-2 border-terracotta pl-4">
                    <h3 className="font-mono text-2xs uppercase tracking-[0.14em] text-orange">
                      Challenge
                    </h3>
                    <p className="mt-1.5 leading-relaxed text-ink-soft">
                      {detail.application.current_challenge}
                    </p>
                  </section>
                )}

                {detail.application.support_would_enable && (
                  <section className="mt-6">
                    <h3 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                      Support would enable
                    </h3>
                    <p className="mt-1.5 leading-relaxed text-ink-soft">
                      {detail.application.support_would_enable}
                    </p>
                  </section>
                )}
              </div>

              <aside>
                <dl className="border-t border-rule">
                  {[
                    ["Complete", `${detail.completeness}%`],
                    [
                      "Category",
                      detail.application.business_category
                        ? CATEGORY_LABELS[detail.application.business_category]
                        : null,
                    ],
                    ["Location", [detail.application.city, detail.application.state].filter(Boolean).join(", ")],
                    ["Operating", yearsOperating(detail.application.year_started)],
                    ["Employees", detail.application.employee_count],
                    [
                      "Asking for",
                      detail.application.requested_amount_ngn
                        ? formatNaira(detail.application.requested_amount_ngn)
                        : null,
                    ],
                    ["Documents", detail.media.filter((m) => m.kind === "document").length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between gap-3 border-b border-rule py-2">
                      <dt className="text-xs text-ink-faint">{label}</dt>
                      <dd className="text-right text-xs text-ink">
                        {value !== null && value !== undefined && value !== "" ? String(value) : "—"}
                      </dd>
                    </div>
                  ))}
                </dl>

                {detail.missing.length > 0 && (
                  <div className="mt-5 border-l-2 border-terracotta bg-terracotta-wash px-3 py-2.5">
                    <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-orange">
                      Missing
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {detail.missing.slice(0, 6).map((item) => (
                        <li key={item} className="text-xs text-ink-soft">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detail.notes.length > 0 && (
                  <div className="mt-5">
                    <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                      Team notes
                    </p>
                    <ul className="mt-2 space-y-2">
                      {detail.notes.slice(0, 3).map((note) => (
                        <li key={note.id} className="border-l-2 border-muted-on-black/25 pl-2.5 text-xs text-ink-soft">
                          {note.body}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
