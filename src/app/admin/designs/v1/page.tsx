import Link from "next/link";
import { getDashboardCounts, getRecentActivity } from "@/lib/data/admin";
import { listReviewQueue } from "@/lib/data/applications";
import { requireStaff } from "@/lib/auth";
import { AUDIT_ACTION_LABELS } from "@/lib/audit";
import { formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * DASHBOARD 01 — COMMAND CENTRE
 *
 * Layout philosophy: a console. Monospace throughout, no imagery, no charts,
 * no colour except where something is overdue. The oldest waiting item is the
 * largest thing on screen. Everything is a row you can act on, and the queue
 * takes the full width rather than sharing it with anything decorative.
 */
export default async function CommandCentreDirection() {
  const profile = await requireStaff();
  const [counts, queue, activity] = await Promise.all([
    getDashboardCounts(),
    listReviewQueue({ status: ["submitted", "under_review"], pageSize: 12 }),
    getRecentActivity(8),
  ]);

  const oldest = queue.items[0];
  const totalWaiting =
    counts.pending_alajo_reviews + counts.pending_supporter_reviews + counts.pending_brand_reviews;

  return (
    <div className="min-h-dvh bg-ink font-mono text-paper">
      {/* -------------------------------------------------------- status bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/15 px-5 py-2.5 text-2xs uppercase tracking-[0.14em]">
        <span className="text-paper/50">
          Ajo Mercy · ops · {profile.full_name.split(" ")[0]}
        </span>
        <span className={totalWaiting > 0 ? "text-ochre" : "text-paper/40"}>
          {totalWaiting > 0 ? `${totalWaiting} awaiting decision` : "all clear"}
        </span>
      </header>

      {/* ------------------------------------------------------ counter row */}
      <div className="grid grid-cols-2 gap-px border-b border-paper/15 bg-paper/15 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "alajo", value: counts.pending_alajo_reviews, href: "/admin/alajos" },
          { label: "resubmit", value: counts.alajo_awaiting_resubmission, href: "/admin/alajos?status=more_information_required" },
          { label: "supporter", value: counts.pending_supporter_reviews, href: "/admin/supporters" },
          { label: "brand", value: counts.pending_brand_reviews, href: "/admin/brands" },
          { label: "confirm", value: counts.pending_confirmations, href: "/admin/confirmations" },
          { label: "email fail", value: counts.email_failures, href: "/admin/emails?status=failed" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="bg-ink px-4 py-4 transition-colors hover:bg-paper/5"
          >
            <p
              className={`text-3xl tabular ${
                item.value === 0
                  ? "text-paper/25"
                  : item.label === "email fail"
                    ? "text-[#ff6b5e]"
                    : "text-ochre"
              }`}
            >
              {String(item.value).padStart(2, "0")}
            </p>
            <p className="mt-1 text-2xs uppercase tracking-[0.14em] text-paper/45">{item.label}</p>
          </Link>
        ))}
      </div>

      {/* --------------------------------------------------- next up, large */}
      {oldest && (
        <section className="border-b border-paper/15 px-5 py-7">
          <p className="text-2xs uppercase tracking-[0.16em] text-paper/40">
            Longest waiting · take this one
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
                {oldest.business_name ?? "Untitled application"}
              </h2>
              <p className="mt-2 text-xs text-paper/50">
                {oldest.founder_name ?? oldest.applicant_email}
                {oldest.state ? ` · ${oldest.state}` : ""} · {oldest.completeness}% complete ·{" "}
                {oldest.submitted_at ? `submitted ${formatRelative(oldest.submitted_at)}` : "not submitted"}
              </p>
            </div>
            <Link
              href={`/admin/alajos/${oldest.id}`}
              className="bg-ochre px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              Open review →
            </Link>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- the queue */}
      <section className="px-5 py-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xs uppercase tracking-[0.16em] text-paper/40">Queue</h2>
          <Link href="/admin/alajos" className="text-2xs uppercase tracking-[0.14em] text-paper/50 hover:text-paper">
            open full list
          </Link>
        </div>

        {queue.items.length === 0 ? (
          <p className="mt-6 text-sm text-paper/40">Queue empty.</p>
        ) : (
          <table className="mt-4 w-full text-xs">
            <thead>
              <tr className="border-b border-paper/15 text-2xs uppercase tracking-[0.12em] text-paper/40">
                <th scope="col" className="py-2 text-left font-normal">#</th>
                <th scope="col" className="py-2 text-left font-normal">business</th>
                <th scope="col" className="py-2 text-left font-normal">founder</th>
                <th scope="col" className="py-2 text-left font-normal">state</th>
                <th scope="col" className="py-2 text-right font-normal">cmpl</th>
                <th scope="col" className="py-2 text-right font-normal">waiting</th>
                <th scope="col" className="py-2 text-right font-normal">status</th>
              </tr>
            </thead>
            <tbody>
              {queue.items.map((item, index) => (
                <tr key={item.id} className="border-b border-paper/10 hover:bg-paper/5">
                  <td className="py-2 text-paper/30 tabular">{String(index + 1).padStart(2, "0")}</td>
                  <td className="py-2">
                    <Link href={`/admin/alajos/${item.id}`} className="text-paper hover:text-ochre">
                      {item.business_name ?? "untitled"}
                    </Link>
                  </td>
                  <td className="py-2 text-paper/50">{item.founder_name ?? "—"}</td>
                  <td className="py-2 text-paper/50">{item.state ?? "—"}</td>
                  <td
                    className={`py-2 text-right tabular ${
                      item.completeness < 100 ? "text-ochre" : "text-paper/50"
                    }`}
                  >
                    {item.completeness}%
                  </td>
                  <td className="py-2 text-right text-paper/50">
                    {item.submitted_at ? formatRelative(item.submitted_at) : "—"}
                  </td>
                  <td className="py-2 text-right text-2xs uppercase tracking-[0.1em] text-paper/40">
                    {item.status === "under_review" ? "in review" : "new"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ------------------------------------------------------------- log */}
      <section className="border-t border-paper/15 px-5 py-6 pb-24">
        <h2 className="text-2xs uppercase tracking-[0.16em] text-paper/40">Log</h2>
        <ol className="mt-3 space-y-1 text-xs">
          {activity.length === 0 ? (
            <li className="text-paper/40">No entries.</li>
          ) : (
            activity.map((item) => (
              <li key={item.id} className="flex gap-3 text-paper/60">
                <span className="shrink-0 text-paper/30">
                  {new Date(item.createdAt).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-paper/80">{item.actor ?? "system"}</span>
                <span>{(AUDIT_ACTION_LABELS[item.action] ?? item.action).toLowerCase()}</span>
                {item.entityLabel && <span className="text-ochre">{item.entityLabel}</span>}
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}
