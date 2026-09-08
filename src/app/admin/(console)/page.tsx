import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import {
  getDashboardCounts,
  getRecentActivity,
  listCampaigns,
  listConfirmations,
} from "@/lib/data/admin";
import { listReviewQueue } from "@/lib/data/applications";
import { AUDIT_ACTION_LABELS } from "@/lib/audit";
import { can } from "@/lib/rbac";
import { Alert, cn, EmptyState, StatusChip } from "@/components/ui/primitives";
import { formatDateTime, formatNairaCompact, formatNumber, formatRelative } from "@/lib/format";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/state-machine";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The command centre. It opens with what needs a decision, not with charts.
 * Everything above the fold is a queue someone can act on.
 */
export default async function AdminDashboardPage() {
  const profile = await requireStaff();

  const [counts, activity, queue, confirmations, campaigns] = await Promise.all([
    getDashboardCounts(),
    getRecentActivity(10),
    listReviewQueue({ status: ["submitted", "under_review"], pageSize: 6 }),
    can(profile, "confirmation.create") ? listConfirmations(["pending"]) : Promise.resolve([]),
    can(profile, "campaign.manage") ? listCampaigns() : Promise.resolve([]),
  ]);

  const actions = [
    {
      label: "Alajo applications",
      count: counts.pending_alajo_reviews,
      href: "/admin/alajos",
      hint: "Waiting to be read",
      show: true,
    },
    {
      label: "Awaiting resubmission",
      count: counts.alajo_awaiting_resubmission,
      href: "/admin/alajos?status=more_information_required",
      hint: "We asked, they have not replied",
      show: true,
      muted: true,
    },
    {
      label: "Supporter registrations",
      count: counts.pending_supporter_reviews,
      href: "/admin/supporters",
      hint: "Waiting for approval",
      show: can(profile, "supporter.review"),
    },
    {
      label: "Brand registrations",
      count: counts.pending_brand_reviews,
      href: "/admin/brands",
      hint: "Organisations to verify",
      show: can(profile, "brand.review"),
    },
    {
      label: "Selections to review",
      count: counts.unreviewed_selections,
      href: "/admin/selections",
      hint: "Not yet shortlisted",
      show: can(profile, "campaign.review_selections"),
    },
    {
      label: "Support to confirm",
      count: counts.pending_confirmations,
      href: "/admin/confirmations",
      hint: "Nobody has been told yet",
      show: can(profile, "confirmation.create"),
    },
  ].filter((item) => item.show);

  const activeCampaigns = campaigns.filter((c) =>
    ["open", "selection_period", "under_review"].includes(c.status),
  );

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">
            {greeting()}, {profile.full_name.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {counts.pending_alajo_reviews + counts.pending_supporter_reviews + counts.pending_brand_reviews === 0
              ? "Nothing is waiting on you right now."
              : "Here is what is waiting on a decision."}
          </p>
        </div>
        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </header>

      {counts.email_failures > 0 && can(profile, "email.view") && (
        <Alert tone="negative" title="Emails are failing" className="mt-6">
          <p>
            {formatNumber(counts.email_failures)} outbound{" "}
            {counts.email_failures === 1 ? "email has" : "emails have"} not reached their recipient.
            People are waiting on messages that never arrived.{" "}
            <Link href="/admin/emails?status=failed" className="link-rule font-medium text-ink">
              Open email delivery
            </Link>
          </p>
        </Alert>
      )}

      {/* ------------------------------------------------------ action queue */}
      <section aria-labelledby="action-required" className="mt-8">
        <h2 id="action-required" className="eyebrow">
          Action required
        </h2>
        {/* Metric cards. Each is a link, because a number nobody can act on is
            just decoration on an operations screen. */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="surface card-interactive group flex flex-col justify-between p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <p
                  className={cn(
                    "tabular font-display text-5xl leading-none",
                    item.count === 0
                      ? "text-ink-faint"
                      : item.muted
                        ? "text-forest"
                        : "text-terracotta",
                  )}
                >
                  {item.count === 0 ? "—" : formatNumber(item.count)}
                </p>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5",
                    item.count === 0 ? "bg-surface-soft text-ink-faint" : "bg-surface-green text-forest",
                  )}
                >
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 8h9M8.5 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <div className="mt-6">
                <p className="text-sm font-bold text-ink">{item.label}</p>
                <p className="mt-1 text-xs text-ink-faint">{item.hint}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-10 xl:grid-cols-[1.4fr_1fr] xl:gap-12">
        <div className="space-y-10">
          {/* ------------------------------------------------- review queue */}
          <section aria-labelledby="next-up">
            <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
              <h2 id="next-up" className="font-display text-xl">
                Next in the queue
              </h2>
              <Link href="/admin/alajos" className="link-rule text-sm text-ink-soft hover:text-ink">
                All applications
              </Link>
            </div>

            {queue.items.length === 0 ? (
              <div className="pt-6">
                <EmptyState
                  title="The queue is empty"
                  description="Every submitted application has been dealt with."
                />
              </div>
            ) : (
              <ul className="grid-rules">
                {queue.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/alajos/${item.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition-colors hover:bg-paper-warm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {item.business_name ?? "Untitled application"}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {item.founder_name ?? item.applicant_email}
                          {item.state ? ` · ${item.state}` : ""}
                          {item.submitted_at ? ` · submitted ${formatRelative(item.submitted_at)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-ink-faint tabular">{item.completeness}%</span>
                        <StatusChip tone={item.status === "under_review" ? "progress" : "attention"}>
                          {item.status === "under_review" ? "In review" : "New"}
                        </StatusChip>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------------------- pending confirmations */}
          {can(profile, "confirmation.create") && confirmations.length > 0 && (
            <section aria-labelledby="pending-support">
              <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
                <h2 id="pending-support" className="font-display text-xl">
                  Support waiting on you
                </h2>
                <Link href="/admin/confirmations" className="link-rule text-sm text-ink-soft hover:text-ink">
                  All support
                </Link>
              </div>
              <Alert tone="attention" className="mt-4">
                Nobody on this list has been told they are being supported. That only happens when you
                confirm.
              </Alert>
              <ul className="grid-rules mt-2">
                {confirmations.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                    <div>
                      <p className="font-medium text-ink">{item.business_name}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {item.supporter_label ?? "Supporter"}
                        {item.amount_ngn ? ` · ${formatNairaCompact(item.amount_ngn)}` : ""}
                        {item.campaign_name ? ` · ${item.campaign_name}` : ""}
                      </p>
                    </div>
                    <Link
                      href="/admin/confirmations"
                      className="link-rule shrink-0 text-sm font-medium text-ink"
                    >
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-10">
          {/* ------------------------------------------------------- activity */}
          <section aria-labelledby="activity">
            <h2 id="activity" className="border-b border-rule pb-3 font-display text-xl">
              Recent activity
            </h2>
            {activity.length === 0 ? (
              <p className="pt-4 text-sm text-ink-soft">Nothing has happened yet.</p>
            ) : (
              <ol className="grid-rules">
                {activity.map((item) => (
                  <li key={item.id} className="py-3">
                    <p className="text-sm text-ink">
                      <span className="font-medium">{item.actor ?? "System"}</span>{" "}
                      <span className="text-ink-soft">
                        {(AUDIT_ACTION_LABELS[item.action] ?? item.action).toLowerCase()}
                      </span>
                      {item.entityLabel ? <span className="font-medium"> {item.entityLabel}</span> : null}
                    </p>
                    <p className="mt-0.5 font-mono text-2xs text-ink-faint">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <Link
              href="/admin/audit"
              className="link-rule mt-4 inline-block text-sm text-ink-soft hover:text-ink"
            >
              Full audit log
            </Link>
          </section>

          {/* ---------------------------------------------------- campaigns */}
          {can(profile, "campaign.manage") && (
            <section aria-labelledby="campaigns">
              <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
                <h2 id="campaigns" className="font-display text-xl">
                  Active campaigns
                </h2>
                <Link href="/admin/campaigns" className="link-rule text-sm text-ink-soft hover:text-ink">
                  All
                </Link>
              </div>
              {activeCampaigns.length === 0 ? (
                <p className="pt-4 text-sm text-ink-soft">No campaigns are running.</p>
              ) : (
                <ul className="grid-rules">
                  {activeCampaigns.slice(0, 5).map((campaign) => (
                    <li key={campaign.id} className="py-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium text-ink">{campaign.name}</p>
                        <StatusChip tone="progress">{CAMPAIGN_STATUS_LABELS[campaign.status]}</StatusChip>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {campaign.brand_name ?? "Ajo Mercy"} ·{" "}
                        {campaign.selection_count}/{campaign.businesses_target} selected
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* -------------------------------------------------------- impact */}
          <section aria-labelledby="platform">
            <h2 id="platform" className="border-b border-rule pb-3 font-display text-xl">
              Platform
            </h2>
            <dl className="grid-rules">
              {[
                ["Live profiles", formatNumber(counts.live_profiles)],
                ["Businesses supported", formatNumber(counts.businesses_supported)],
                ["Support confirmed", formatNairaCompact(counts.support_confirmed_total)],
                ["Approved supporters", formatNumber(counts.total_supporters)],
                ["Approved brands", formatNumber(counts.total_brands)],
                ["Suspended profiles", formatNumber(counts.suspended_profiles)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-sm text-ink-soft">{label}</dt>
                  <dd className="font-medium text-ink tabular">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
