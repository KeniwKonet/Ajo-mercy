import Image from "next/image";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDashboardCounts, getRecentActivity, listConfirmations } from "@/lib/data/admin";
import { listReviewQueue } from "@/lib/data/applications";
import { listFeaturedAlajos, listRecentAlajos, publicMediaUrl } from "@/lib/data/alajos";
import { AUDIT_ACTION_LABELS } from "@/lib/audit";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatNaira, formatNumber, formatRelative, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * DASHBOARD 02 — IMPACT DESK
 *
 * Layout philosophy: the operational work sits inside an editorial frame. A
 * large featured business runs across the top so the team sees who they are
 * working for before they see the queue. Imagery and display type are allowed
 * here in a way they are not in the command centre, and the counts are phrased
 * as sentences rather than tiles.
 */
export default async function ImpactDeskDirection() {
  const profile = await requireStaff();
  const [counts, queue, featured, recent, confirmations, activity] = await Promise.all([
    getDashboardCounts(),
    listReviewQueue({ status: ["submitted", "under_review"], pageSize: 5 }),
    listFeaturedAlajos(1),
    listRecentAlajos(4),
    listConfirmations(["confirmed", "announced", "completed"]),
    getRecentActivity(6),
  ]);

  const hero = featured[0] ?? recent[0];
  const heroUrl = publicMediaUrl(hero?.cover?.storage_path);
  const waiting = counts.pending_alajo_reviews + counts.pending_supporter_reviews + counts.pending_brand_reviews;

  return (
    <div className="min-h-dvh bg-paper pb-24">
      <header className="border-b border-rule px-6 py-5 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl">
            Good day, {profile.full_name.split(" ")[0]}.
          </h1>
          <p className="text-sm text-ink-soft">
            {waiting === 0 ? (
              "Nothing is waiting on you."
            ) : (
              <>
                <span className="font-medium text-terracotta tabular">{waiting}</span> waiting on a
                decision.
              </>
            )}
          </p>
        </div>
      </header>

      {/* ------------------------------------------------------- lead story */}
      {hero && (
        <section className="border-b border-rule">
          <div className="grid lg:grid-cols-[1.2fr_1fr]">
            <div className="relative aspect-[16/10] bg-paper-deep lg:aspect-auto lg:min-h-[24rem]">
              {heroUrl ? (
                <Image
                  src={heroUrl}
                  alt={hero.business_name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-forest-wash font-display text-6xl text-forest/25">
                  {hero.business_name.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center px-6 py-8 sm:px-10">
              <p className="font-mono text-2xs uppercase tracking-[0.16em] text-terracotta">
                {hero.status === "featured" ? "Currently featured" : "Most recently verified"}
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                {hero.business_name}
              </h2>
              <p className="mt-1.5 text-sm text-ink-faint">
                {hero.founder_name} · {CATEGORY_LABELS[hero.business_category]} ·{" "}
                {[hero.city, hero.state].filter(Boolean).join(", ")}
              </p>
              <p className="mt-5 max-w-md leading-relaxed text-ink-soft">
                {truncate(hero.current_challenge ?? hero.story, 220)}
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href={`/alajos/${hero.slug}`} className="link-rule text-sm font-medium text-ink">
                  View public profile
                </Link>
                <Link href="/admin/alajos?status=approved" className="link-rule text-sm text-ink-soft hover:text-ink">
                  All approved businesses
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-10 px-6 py-10 sm:px-10 xl:grid-cols-[1fr_22rem] xl:gap-14">
        <div className="space-y-10">
          {/* ------------------------------------------------ ops as prose */}
          <section>
            <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              Where things stand
            </h2>
            <p className="mt-3 max-w-2xl font-display text-2xl leading-[1.4]">
              {counts.pending_alajo_reviews > 0 ? (
                <>
                  <Link href="/admin/alajos" className="text-terracotta hover:underline">
                    {counts.pending_alajo_reviews} business{counts.pending_alajo_reviews === 1 ? "" : "es"}
                  </Link>{" "}
                  waiting to be read.
                </>
              ) : (
                <>The application queue is clear.</>
              )}{" "}
              {counts.pending_confirmations > 0 ? (
                <>
                  <Link href="/admin/confirmations" className="text-terracotta hover:underline">
                    {counts.pending_confirmations} support record
                    {counts.pending_confirmations === 1 ? "" : "s"}
                  </Link>{" "}
                  waiting to be confirmed — nobody has been told yet.
                </>
              ) : (
                <>No support is waiting on confirmation.</>
              )}{" "}
              {counts.email_failures > 0 && (
                <>
                  <Link href="/admin/emails?status=failed" className="text-danger hover:underline">
                    {counts.email_failures} email{counts.email_failures === 1 ? "" : "s"}
                  </Link>{" "}
                  never arrived.
                </>
              )}
            </p>
          </section>

          {/* -------------------------------------------------- the queue */}
          <section>
            <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
              <h2 className="font-display text-xl">Waiting to be read</h2>
              <Link href="/admin/alajos" className="link-rule text-sm text-ink-soft hover:text-ink">
                All
              </Link>
            </div>
            {queue.items.length === 0 ? (
              <p className="pt-4 text-sm text-ink-soft">Nothing in the queue.</p>
            ) : (
              <ul className="grid-rules">
                {queue.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/alajos/${item.id}`}
                      className="flex flex-wrap items-baseline justify-between gap-3 py-3.5 hover:bg-paper-warm"
                    >
                      <span>
                        <span className="font-display text-lg">{item.business_name ?? "Untitled"}</span>
                        <span className="ml-3 text-xs text-ink-faint">
                          {item.founder_name ?? item.applicant_email}
                        </span>
                      </span>
                      <span className="text-xs text-ink-faint">
                        {item.submitted_at ? formatRelative(item.submitted_at) : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------------------------------------------- support stories */}
          <section>
            <h2 className="border-b border-rule pb-3 font-display text-xl">Support that landed</h2>
            {confirmations.length === 0 ? (
              <p className="pt-4 max-w-md text-sm leading-relaxed text-ink-soft">
                No support has been confirmed yet. When it is, the businesses and amounts appear here
                so the team can see the outcome of the work, not just the queue.
              </p>
            ) : (
              <ul className="grid-rules">
                {confirmations.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-3 py-3.5">
                    <div>
                      <p className="font-display text-lg">{item.business_name}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {item.supporter_label ?? "An Ajo Mercy supporter"}
                        {item.support_kind ? ` · ${item.support_kind}` : ""}
                      </p>
                    </div>
                    <p className="font-display text-lg text-forest tabular">
                      {item.amount_ngn ? formatNaira(item.amount_ngn) : "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* --------------------------------------------------------- rail */}
        <aside className="space-y-10">
          <section>
            <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              The platform so far
            </h2>
            <dl className="mt-3">
              {[
                ["Live profiles", formatNumber(counts.live_profiles)],
                ["Businesses supported", formatNumber(counts.businesses_supported)],
                ["Support confirmed", formatNaira(counts.support_confirmed_total)],
                ["Approved supporters", formatNumber(counts.total_supporters)],
                ["Brands taking part", formatNumber(counts.total_brands)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between border-b border-rule py-2.5">
                  <dt className="text-sm text-ink-soft">{label}</dt>
                  <dd className="font-display text-lg tabular">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              Recently verified
            </h2>
            <ul className="mt-3">
              {recent.slice(0, 4).map((item) => {
                const url = publicMediaUrl(item.cover?.storage_path);
                return (
                  <li key={item.id} className="border-b border-rule">
                    <Link href={`/alajos/${item.slug}`} className="group flex items-center gap-3 py-3">
                      <div className="relative size-11 shrink-0 bg-paper-deep">
                        {url && (
                          <Image src={url} alt={item.business_name} fill sizes="44px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium group-hover:text-terracotta">
                          {item.business_name}
                        </p>
                        <p className="text-2xs text-ink-faint">{item.state}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">Activity</h2>
            <ol className="mt-3 space-y-2.5">
              {activity.map((item) => (
                <li key={item.id} className="text-xs leading-relaxed text-ink-soft">
                  <span className="font-medium text-ink">{item.actor ?? "System"}</span>{" "}
                  {(AUDIT_ACTION_LABELS[item.action] ?? item.action).toLowerCase()}
                  {item.entityLabel ? ` ${item.entityLabel}` : ""}
                  <span className="block text-2xs text-ink-faint">{formatRelative(item.createdAt)}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
