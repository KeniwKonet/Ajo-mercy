import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import {
  getDashboardCounts,
  getRecentActivity,
  listCampaigns,
  listConfirmations,
} from "@/lib/data/admin";
import { listReviewQueue } from "@/lib/data/applications";
import { listRecentAlajos } from "@/lib/data/alajos";
import { AUDIT_ACTION_LABELS } from "@/lib/audit";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/state-machine";
import { formatNairaCompact, formatNumber, formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * DASHBOARD 04 — HYBRID
 *
 * Layout philosophy: three bands. Decisions first, at full width and unmissable.
 * Then the working middle — queue, support and campaigns side by side. Then the
 * quiet band: platform figures and the log. It keeps the command centre's rule
 * that action comes first, but it does not pretend the team never wants to see
 * outcomes or campaigns without navigating away.
 *
 * This is the direction the live /admin dashboard is built on.
 */
export default async function HybridDirection() {
  const profile = await requireStaff();
  const [counts, queue, confirmations, campaigns, recent, activity] = await Promise.all([
    getDashboardCounts(),
    listReviewQueue({ status: ["submitted", "under_review"], pageSize: 6 }),
    listConfirmations(["pending"]),
    listCampaigns(),
    listRecentAlajos(4),
    getRecentActivity(8),
  ]);

  const active = campaigns.filter((c) =>
    ["open", "selection_period", "under_review"].includes(c.status),
  );

  const decisions = [
    { label: "Applications", value: counts.pending_alajo_reviews, href: "/admin/alajos", note: "to read" },
    { label: "Supporters", value: counts.pending_supporter_reviews, href: "/admin/supporters", note: "to approve" },
    { label: "Brands", value: counts.pending_brand_reviews, href: "/admin/brands", note: "to verify" },
    { label: "Selections", value: counts.unreviewed_selections, href: "/admin/selections", note: "to triage" },
    { label: "Support", value: counts.pending_confirmations, href: "/admin/confirmations", note: "to confirm" },
    { label: "Emails", value: counts.email_failures, href: "/admin/emails?status=failed", note: "failed", alarm: true },
  ];

  return (
    <div className="min-h-dvh bg-paper pb-24">
      <header className="border-b border-rule px-6 py-5 sm:px-10">
        <h1 className="font-display text-2xl">Good day, {profile.full_name.split(" ")[0]}.</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Decisions first, then the work, then the numbers.
        </p>
      </header>

      {/* --------------------------------------------------- band 1: decide */}
      <section className="border-b border-rule px-6 py-6 sm:px-10">
        <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
          Needs a decision
        </h2>
        <div className="mt-4 grid gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-6">
          {decisions.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="bg-paper px-4 py-5 transition-colors hover:bg-paper-warm"
            >
              <p
                className={`font-display text-3xl tabular ${
                  item.value === 0
                    ? "text-ink-faint"
                    : item.alarm
                      ? "text-danger"
                      : "text-terracotta"
                }`}
              >
                {item.value === 0 ? "—" : formatNumber(item.value)}
              </p>
              <p className="mt-2 text-sm font-medium text-ink">{item.label}</p>
              <p className="text-xs text-ink-faint">{item.note}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- band 2: work */}
      <section className="grid gap-8 border-b border-rule px-6 py-8 sm:px-10 lg:grid-cols-3 lg:gap-10">
        <div>
          <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2.5">
            <h2 className="font-display text-lg">Queue</h2>
            <Link href="/admin/alajos" className="link-rule text-xs text-ink-soft hover:text-ink">
              All
            </Link>
          </div>
          {queue.items.length === 0 ? (
            <p className="pt-3 text-sm text-ink-soft">Nothing waiting.</p>
          ) : (
            <ul className="grid-rules">
              {queue.items.map((item) => (
                <li key={item.id}>
                  <Link href={`/admin/alajos/${item.id}`} className="block py-2.5 hover:bg-paper-warm">
                    <p className="truncate text-sm font-medium text-ink">
                      {item.business_name ?? "Untitled"}
                    </p>
                    <p className="mt-0.5 text-2xs text-ink-faint">
                      {item.state ?? "—"} · {item.completeness}% ·{" "}
                      {item.submitted_at ? formatRelative(item.submitted_at) : "not submitted"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2.5">
            <h2 className="font-display text-lg">Support to confirm</h2>
            <Link href="/admin/confirmations" className="link-rule text-xs text-ink-soft hover:text-ink">
              All
            </Link>
          </div>
          {confirmations.length === 0 ? (
            <p className="pt-3 text-sm text-ink-soft">Nothing waiting on confirmation.</p>
          ) : (
            <>
              <p className="pt-3 text-xs leading-relaxed text-terracotta">
                None of these businesses has been told anything yet.
              </p>
              <ul className="grid-rules mt-1">
                {confirmations.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.business_name}</p>
                      <p className="text-2xs text-ink-faint">
                        {item.supporter_label ?? "Supporter"}
                        {item.campaign_name ? ` · ${item.campaign_name}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-ink-soft tabular">
                      {item.amount_ngn ? formatNairaCompact(item.amount_ngn) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2.5">
            <h2 className="font-display text-lg">Campaigns</h2>
            <Link href="/admin/campaigns" className="link-rule text-xs text-ink-soft hover:text-ink">
              All
            </Link>
          </div>
          {active.length === 0 ? (
            <p className="pt-3 text-sm text-ink-soft">No campaigns are running.</p>
          ) : (
            <ul className="grid-rules">
              {active.slice(0, 5).map((campaign) => (
                <li key={campaign.id} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink">{campaign.name}</p>
                    <span className="shrink-0 font-mono text-2xs uppercase tracking-[0.1em] text-ink-faint">
                      {CAMPAIGN_STATUS_LABELS[campaign.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-2xs text-ink-faint">
                    {campaign.brand_name ?? "Ajo Mercy"} · {campaign.selection_count}/
                    {campaign.businesses_target} selected
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- band 3: quiet */}
      <section className="grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        <div>
          <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
            The platform
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-8 sm:grid-cols-3">
            {[
              ["Live profiles", formatNumber(counts.live_profiles)],
              ["Supported", formatNumber(counts.businesses_supported)],
              ["Confirmed", formatNairaCompact(counts.support_confirmed_total)],
              ["Supporters", formatNumber(counts.total_supporters)],
              ["Brands", formatNumber(counts.total_brands)],
              ["Suspended", formatNumber(counts.suspended_profiles)],
            ].map(([label, value]) => (
              <div key={label} className="border-t border-rule py-3">
                <dd className="font-display text-2xl tabular">{value}</dd>
                <dt className="mt-0.5 text-xs text-ink-faint">{label}</dt>
              </div>
            ))}
          </dl>

          {recent.length > 0 && (
            <>
              <h3 className="mt-8 font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                Recently verified
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {recent.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/alajos/${item.slug}`}
                      className="block border border-rule-strong px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
                    >
                      {item.business_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">Activity</h2>
            <Link href="/admin/audit" className="link-rule text-xs text-ink-soft hover:text-ink">
              Audit log
            </Link>
          </div>
          <ol className="mt-3 grid-rules border-t border-rule">
            {activity.map((item) => (
              <li key={item.id} className="py-2.5">
                <p className="text-sm text-ink">
                  <span className="font-medium">{item.actor ?? "System"}</span>{" "}
                  <span className="text-ink-soft">
                    {(AUDIT_ACTION_LABELS[item.action] ?? item.action).toLowerCase()}
                  </span>
                  {item.entityLabel ? <span className="font-medium"> {item.entityLabel}</span> : null}
                </p>
                <p className="mt-0.5 font-mono text-2xs text-ink-faint">
                  {formatRelative(item.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
