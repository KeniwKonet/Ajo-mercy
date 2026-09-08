import Image from "next/image";
import Link from "next/link";
import { getCategoryCounts, getImpactStats, listRecentAlajos, publicMediaUrl } from "@/lib/data/alajos";
import { CATEGORY_LABELS, type BusinessCategory } from "@/lib/types";
import { formatNaira, formatNumber, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * DIRECTION 03 — PREMIUM IMPACT PLATFORM
 *
 * Layout philosophy: institutional infrastructure. A persistent left rail
 * instead of a top bar, a strict 12-column grid, hairline rules doing the
 * dividing rather than cards, restrained type at UI scale, and every claim
 * paired with the mechanism that backs it. Reads like a fund's site, not a
 * charity template.
 */
export default async function ImpactPlatformDirection() {
  const [profiles, stats, categories] = await Promise.all([
    listRecentAlajos(5),
    getImpactStats(),
    getCategoryCounts(),
  ]);

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[15rem_1fr]">
      {/* --------------------------------------------------------- left rail */}
      <aside className="border-b border-rule px-6 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:border-b-0 lg:border-r">
        <div>
          <span className="font-display text-lg tracking-tight">
            <span className="font-semibold text-lime">Ajo</span>
            <span className="italic text-orange"> Mercy</span>
          </span>

          <nav aria-label="Sections" className="mt-10 hidden lg:block">
            <ul className="space-y-0">
              {[
                ["01", "The mechanism"],
                ["02", "Verified businesses"],
                ["03", "Measured impact"],
                ["04", "For brands"],
              ].map(([n, label]) => (
                <li key={n} className="border-b border-rule py-2.5">
                  <span className="flex items-baseline gap-3 text-sm text-ink-soft">
                    <span className="font-mono text-2xs text-ink-faint tabular">{n}</span>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="hidden lg:block">
          <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">Oversight</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Woli Arole is Super Admin. Every application, and every recipient, passes through the
            review team.
          </p>
          <Link
            href="/become-an-alajo"
            className="mt-6 block bg-widget-black px-4 py-2.5 text-center text-sm font-medium text-ivory-text transition-colors hover:brightness-95"
          >
            Apply
          </Link>
        </div>
      </aside>

      <main>
        {/* --------------------------------------------------------- hero -- */}
        <section className="border-b border-rule px-6 py-16 sm:px-10 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <h1 className="font-display text-4xl leading-[1.05] tracking-[-0.025em] sm:text-5xl lg:text-6xl">
                Find a business worth backing.
              </h1>
              <p className="mt-6 max-w-md leading-relaxed text-ink-soft">
                Ajo Mercy verifies Nigerian business owners, publishes what it can stand behind, and
                coordinates support between them and the people and organisations who want to help.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/alajos"
                  className="bg-widget-black px-5 py-2.5 text-sm font-medium text-ivory-text transition-colors hover:brightness-95"
                >
                  Browse businesses
                </Link>
                <Link
                  href="/how-it-works"
                  className="border border-muted-on-black/25 px-5 py-2.5 text-sm transition-colors hover:border-ink"
                >
                  Read the process
                </Link>
              </div>
            </div>

            {/* Each claim next to the mechanism that makes it true. */}
            <dl className="lg:col-span-5 lg:border-l lg:border-rule lg:pl-8">
              {[
                ["Verified by a person", "Identity documents and photographs reviewed by hand before publication."],
                ["Selection is not support", "Recipients are confirmed in a separate, permissioned step."],
                ["No funds held", "Ajo Mercy operates no wallet, escrow or transfer of any kind."],
                ["Every action recorded", "Approvals, rejections and confirmations are written to an audit log."],
              ].map(([claim, mechanism]) => (
                <div key={claim} className="border-b border-rule py-3.5 first:border-t lg:first:border-t-0">
                  <dt className="text-sm font-medium text-ink">{claim}</dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-ink-faint">{mechanism}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* -------------------------------------------------------- figures */}
        <section className="border-b border-rule px-6 py-10 sm:px-10">
          <p className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
            Platform figures · counted live
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4">
            {[
              ["Businesses verified", formatNumber(stats.alajos_approved), stats.alajos_approved],
              ["Businesses supported", formatNumber(stats.businesses_supported), stats.businesses_supported],
              ["Support facilitated", formatNaira(stats.support_facilitated_ngn), stats.support_facilitated_ngn],
              ["States reached", formatNumber(stats.states_reached), stats.states_reached],
            ].map(([label, value, raw]) => (
              <div key={String(label)} className="border-t border-ink pt-3">
                <dd
                  className={`font-display text-3xl tabular lg:text-4xl ${
                    Number(raw) === 0 ? "text-ink-faint" : "text-lime"
                  }`}
                >
                  {Number(raw) === 0 ? "—" : value}
                </dd>
                <dt className="mt-1.5 text-sm text-ink-soft">{label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* ----------------------------------------------------- businesses */}
        <section className="border-b border-rule px-6 py-14 sm:px-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl">Recently verified</h2>
            <Link href="/alajos" className="link-rule text-sm text-ink-soft hover:text-ink">
              All businesses
            </Link>
          </div>

          {profiles.length === 0 ? (
            <p className="mt-8 max-w-md text-sm text-ink-soft">
              No businesses have completed verification yet. This section fills as the review team
              works through applications.
            </p>
          ) : (
            <ul className="mt-6 border-t border-rule">
              {profiles.map((profile) => {
                const url = publicMediaUrl(profile.cover?.storage_path);
                return (
                  <li key={profile.id} className="border-b border-rule">
                    <Link
                      href={`/alajos/${profile.slug}`}
                      className="group grid items-center gap-5 py-5 lg:grid-cols-12"
                    >
                      <div className="relative aspect-[3/2] w-24 shrink-0 bg-widget-black-2 lg:col-span-2 lg:aspect-square lg:w-full">
                        {url && (
                          <Image
                            src={url}
                            alt={profile.business_name}
                            fill
                            sizes="160px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="lg:col-span-4">
                        <h3 className="font-display text-lg group-hover:text-orange">
                          {profile.business_name}
                        </h3>
                        <p className="mt-0.5 text-xs text-ink-faint">{profile.founder_name}</p>
                      </div>
                      <p className="text-sm text-ink-soft lg:col-span-3">
                        {truncate(profile.current_challenge ?? profile.story, 90)}
                      </p>
                      <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-faint lg:col-span-2">
                        {CATEGORY_LABELS[profile.business_category]}
                        <br />
                        {[profile.city, profile.state].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-sm text-ink tabular lg:col-span-1 lg:text-right">
                        {profile.requested_amount_ngn
                          ? formatNaira(profile.requested_amount_ngn).replace("₦", "₦ ")
                          : "—"}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------------- sectors */}
        {categories.length > 0 && (
          <section className="border-b border-rule px-6 py-12 sm:px-10">
            <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              Sectors represented
            </h2>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {categories.map((row) => (
                <Link
                  key={row.category}
                  href={`/alajos?category=${row.category}`}
                  className="border border-muted-on-black/25 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  {CATEGORY_LABELS[row.category as BusinessCategory] ?? row.category}
                  <span className="ml-2 text-ink-faint tabular">{row.count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* --------------------------------------------------------- brands */}
        <section className="px-6 py-14 sm:px-10">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl">For brands and institutions</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Set a budget, define the sectors and states you want to reach, and select from
                businesses that have already been verified. Our team confirms every recipient before
                anything is announced.
              </p>
              <Link
                href="/brands"
                className="mt-6 inline-block border border-muted-on-black/25 px-5 py-2.5 text-sm transition-colors hover:border-ink"
              >
                Brand partnerships
              </Link>
            </div>
            <div className="lg:col-span-7 lg:border-l lg:border-rule lg:pl-8">
              <p className="max-w-md text-sm leading-relaxed text-ink-faint">
                Ajo Mercy is a discovery, verification and coordination platform. It does not process,
                hold, custody, escrow or transfer support funds. Registering does not guarantee
                selection or support; that depends on the relevant campaign, the verification process
                and final approval.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
