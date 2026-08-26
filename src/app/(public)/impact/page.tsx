import type { Metadata } from "next";
import Link from "next/link";
import { Container, Display, EmptyState, ButtonLink, Stat } from "@/components/ui/primitives";
import { AlajoRow } from "@/components/site/alajo-cards";
import { getCategoryCounts, getImpactStats, getStateCounts, listRecentAlajos } from "@/lib/data/alajos";
import { formatNaira, formatNumber } from "@/lib/format";
import { CATEGORY_LABELS, type BusinessCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Impact",
  description:
    "Real numbers from the Ajo Mercy database: businesses verified, businesses supported, support facilitated and states reached.",
  alternates: { canonical: "/impact" },
};

export const revalidate = 300;

export default async function ImpactPage() {
  const [stats, categories, states, recent] = await Promise.all([
    getImpactStats(),
    getCategoryCounts(),
    getStateCounts(),
    listRecentAlajos(6),
  ]);

  const hasAnything = stats.alajos_registered > 0;
  const maxCategory = categories[0]?.count ?? 1;

  return (
    <>
      <Container className="py-14 sm:py-20">
        <div className="max-w-2xl">
          <Display size="lg">What has actually happened.</Display>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Every number on this page is counted from the platform database when the page loads.
            Where something has not happened yet, it shows a dash rather than a hopeful zero.
          </p>
        </div>
      </Container>

      <section className="border-y border-rule bg-paper-warm">
        <Container>
          <dl className="grid grid-cols-2 gap-x-8 lg:grid-cols-4">
            {[
              { label: "Businesses registered", value: formatNumber(stats.alajos_registered), raw: stats.alajos_registered, hint: "Applications submitted" },
              { label: "Businesses verified", value: formatNumber(stats.alajos_approved), raw: stats.alajos_approved, hint: "Approved and live" },
              { label: "Businesses supported", value: formatNumber(stats.businesses_supported), raw: stats.businesses_supported, hint: "Support confirmed" },
              { label: "Support facilitated", value: formatNaira(stats.support_facilitated_ngn), raw: stats.support_facilitated_ngn, hint: "Confirmed and announced" },
            ].map((item) => (
              <div key={item.label} className="border-b border-rule last:border-b-0 lg:border-b-0">
                <Stat
                  value={item.raw === 0 ? null : item.value}
                  label={item.label}
                  hint={item.hint}
                  className="py-7"
                />
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <Container className="py-14">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <section>
            <h2 className="border-b border-rule pb-3 font-display text-xl">By sector</h2>
            {categories.length === 0 ? (
              <p className="pt-5 text-sm text-ink-soft">
                No verified businesses yet, so there is nothing to break down.
              </p>
            ) : (
              <ul className="pt-3">
                {categories.map((row) => (
                  <li key={row.category} className="border-b border-rule py-3">
                    <Link
                      href={`/alajos?category=${row.category}`}
                      className="group flex items-center gap-4"
                    >
                      <span className="w-44 shrink-0 text-sm text-ink group-hover:text-terracotta">
                        {CATEGORY_LABELS[row.category as BusinessCategory] ?? row.category}
                      </span>
                      {/* A plain proportional bar; no chart library for one metric. */}
                      <span className="h-2 flex-1 bg-paper-deep">
                        <span
                          className="block h-full bg-forest"
                          style={{ width: `${Math.max(4, (row.count / maxCategory) * 100)}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right text-sm text-ink-faint tabular">
                        {row.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="border-b border-rule pb-3 font-display text-xl">By state</h2>
            {states.length === 0 ? (
              <p className="pt-5 text-sm text-ink-soft">
                No verified businesses yet, so there is nothing to map.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 pt-5">
                  {states.map((row) => (
                    <Link
                      key={row.state}
                      href={`/alajos?state=${encodeURIComponent(row.state)}`}
                      className="border border-rule-strong px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
                    >
                      {row.state}
                      <span className="ml-1.5 text-ink-faint tabular">{row.count}</span>
                    </Link>
                  ))}
                </div>
                <p className="mt-5 text-sm text-ink-soft">
                  {stats.states_reached} of Nigeria&rsquo;s 36 states and the FCT are represented.
                </p>
              </>
            )}

            <h2 className="mt-10 border-b border-rule pb-3 font-display text-xl">Who is taking part</h2>
            <dl className="pt-1">
              {[
                ["Approved supporters", formatNumber(stats.supporters_approved)],
                ["Brands participating", formatNumber(stats.brands_participating)],
                ["Sectors represented", formatNumber(stats.categories_supported)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between border-b border-rule py-3">
                  <dt className="text-sm text-ink-soft">{label}</dt>
                  <dd className="font-medium text-ink tabular">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </Container>

      <Container className="pb-16">
        <h2 className="border-b border-rule pb-3 font-display text-xl">Recently verified</h2>
        {recent.length === 0 ? (
          <div className="pt-6">
            <EmptyState
              title="Nothing verified yet"
              description="Businesses appear here as the review team works through applications."
              action={<ButtonLink href="/become-an-alajo" variant="secondary">Apply as a business</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="grid-rules pt-1">
            {recent.map((profile, index) => (
              <li key={profile.id}>
                <AlajoRow profile={profile} index={index} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
