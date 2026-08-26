import Image from "next/image";
import Link from "next/link";
import {
  getCategoryCounts,
  getStateCounts,
  listFeaturedAlajos,
  listRecentAlajos,
  publicMediaUrl,
} from "@/lib/data/alajos";
import { CATEGORY_LABELS, type BusinessCategory } from "@/lib/types";
import { formatNairaCompact, truncate, yearsOperating } from "@/lib/format";
import { NEED_BANDS } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * DIRECTION 04 — PRODUCT-FIRST / DISCOVERY
 *
 * Layout philosophy: the first interaction is browsing. A compact utility bar,
 * a search field and live filter rail directly under the headline, and results
 * starting above the fold. Density is the point — mixed tile sizes so the grid
 * has rhythm, but no long marketing runway before the product appears.
 */
export default async function DiscoveryDirection() {
  const [featured, recent, categories, states] = await Promise.all([
    listFeaturedAlajos(3),
    listRecentAlajos(12),
    getCategoryCounts(),
    getStateCounts(),
  ]);

  const spotlight = featured[0] ?? recent[0];
  const grid = recent.filter((profile) => profile.id !== spotlight?.id);

  return (
    <div className="min-h-dvh bg-paper">
      {/* --------------------------------------------------------- utility */}
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-5 px-5 sm:px-8">
          <span className="shrink-0 font-display text-base tracking-tight">
            <span className="font-semibold text-forest">Ajo</span>
            <span className="italic text-terracotta"> Mercy</span>
          </span>

          <div className="relative hidden min-w-0 flex-1 md:block">
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint"
            >
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search businesses, founders, towns"
              aria-label="Search businesses"
              className="h-9 w-full border border-rule-strong bg-card pl-9 pr-3 text-sm placeholder:text-ink-faint focus-visible:border-forest focus-visible:outline-none"
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link href="/login" className="link-rule text-xs text-ink-soft hover:text-ink">
              Sign in
            </Link>
            <Link
              href="/become-an-alajo"
              className="bg-forest px-3.5 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-forest-deep"
            >
              List your business
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[90rem] px-5 sm:px-8">
        {/* --------------------------------------------------------- intro */}
        <div className="grid gap-6 border-b border-rule py-9 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="max-w-[20ch] font-display text-3xl leading-[1.08] tracking-[-0.025em] sm:text-4xl">
              Discover businesses. Choose who to support.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
              Every business here was verified by a person before it appeared. Filter by what you
              care about, read the story, decide.
            </p>
          </div>
          <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint tabular">
            {recent.length > 0 ? `${recent.length}+ verified` : "Verification in progress"}
          </p>
        </div>

        {/* ------------------------------------------------------- filters */}
        <div className="flex gap-2 overflow-x-auto border-b border-rule py-3">
          <FilterPill label="All" active />
          {categories.slice(0, 6).map((row) => (
            <FilterPill
              key={row.category}
              label={`${CATEGORY_LABELS[row.category as BusinessCategory] ?? row.category} (${row.count})`}
              href={`/alajos?category=${row.category}`}
            />
          ))}
          {states.slice(0, 3).map((row) => (
            <FilterPill
              key={row.state}
              label={row.state}
              href={`/alajos?state=${encodeURIComponent(row.state)}`}
            />
          ))}
          {Object.entries(NEED_BANDS)
            .slice(0, 2)
            .map(([value, band]) => (
              <FilterPill key={value} label={band.label} href={`/alajos?need=${value}`} />
            ))}
        </div>

        {/* -------------------------------------------------------- results */}
        {!spotlight ? (
          <div className="border border-dashed border-rule-strong px-6 py-20 text-center">
            <p className="font-display text-2xl">No businesses are live yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
              Applications are open and being reviewed. Verified businesses appear here as the team
              works through them.
            </p>
            <Link
              href="/become-an-alajo"
              className="mt-6 inline-block border border-rule-strong px-4 py-2 text-sm hover:border-ink"
            >
              List your business
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 py-8 lg:grid-cols-12">
            {/* A single wide tile gives the grid rhythm without a hero. */}
            <Link
              href={`/alajos/${spotlight.slug}`}
              className="group relative flex min-h-[20rem] flex-col justify-end overflow-hidden bg-forest p-6 text-paper lg:col-span-8 lg:min-h-[26rem]"
            >
              {(() => {
                const url = publicMediaUrl(spotlight.cover?.storage_path);
                return url ? (
                  <Image
                    src={url}
                    alt={spotlight.business_name}
                    fill
                    priority
                    sizes="(min-width: 1024px) 66vw, 100vw"
                    className="object-cover opacity-55 transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : null;
              })()}
              <div className="relative max-w-lg">
                <span className="bg-ochre px-2 py-1 font-mono text-2xs uppercase tracking-[0.12em] text-ink">
                  {spotlight.status === "featured" ? "Featured" : "Recently verified"}
                </span>
                <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                  {spotlight.business_name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-paper/80">
                  {truncate(spotlight.current_challenge ?? spotlight.story, 160)}
                </p>
                <p className="mt-3 font-mono text-2xs uppercase tracking-[0.12em] text-paper/60">
                  {CATEGORY_LABELS[spotlight.business_category]}
                  <span className="mx-1.5">/</span>
                  {[spotlight.city, spotlight.state].filter(Boolean).join(", ")}
                  {spotlight.requested_amount_ngn && (
                    <>
                      <span className="mx-1.5">/</span>
                      {formatNairaCompact(spotlight.requested_amount_ngn)}
                    </>
                  )}
                </p>
              </div>
            </Link>

            {/* Compact list beside the spotlight. */}
            <div className="lg:col-span-4">
              <p className="border-b border-rule pb-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                Also looking for support
              </p>
              <ul>
                {grid.slice(0, 5).map((profile) => (
                  <li key={profile.id} className="border-b border-rule">
                    <Link href={`/alajos/${profile.slug}`} className="group flex gap-3 py-3">
                      <div className="relative size-14 shrink-0 bg-paper-deep">
                        {(() => {
                          const url = publicMediaUrl(profile.cover?.storage_path);
                          return url ? (
                            <Image
                              src={url}
                              alt={profile.business_name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : null;
                        })()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink group-hover:text-terracotta">
                          {profile.business_name}
                        </p>
                        <p className="mt-0.5 text-2xs text-ink-faint">
                          {CATEGORY_LABELS[profile.business_category]}
                          {" · "}
                          {profile.state}
                          {yearsOperating(profile.year_started)
                            ? ` · ${yearsOperating(profile.year_started)}`
                            : ""}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-ink-soft">
                          {truncate(profile.current_challenge ?? profile.story, 60)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* The main grid. */}
            {grid.slice(5).map((profile) => {
              const url = publicMediaUrl(profile.cover?.storage_path);
              return (
                <Link
                  key={profile.id}
                  href={`/alajos/${profile.slug}`}
                  className="group flex flex-col lg:col-span-3"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
                    {url ? (
                      <Image
                        src={url}
                        alt={profile.business_name}
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-forest-wash font-display text-3xl text-forest/30">
                        {profile.business_name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col pt-3">
                    <p className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                      {CATEGORY_LABELS[profile.business_category]}
                      <span className="mx-1.5 text-rule-strong">/</span>
                      {profile.state}
                    </p>
                    <h3 className="mt-1.5 font-display text-lg leading-snug group-hover:text-terracotta">
                      {profile.business_name}
                    </h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">
                      {truncate(profile.current_challenge ?? profile.story, 90)}
                    </p>
                    <p className="mt-3 border-t border-rule pt-2 text-xs text-ink-faint tabular">
                      {profile.requested_amount_ngn
                        ? `Looking for ${formatNairaCompact(profile.requested_amount_ngn)}`
                        : "Open to support"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* -------------------------------------------------------- footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule py-8">
          <p className="max-w-xl text-xs leading-relaxed text-ink-faint">
            Ajo Mercy verifies businesses and coordinates support. We do not hold or transfer funds,
            and selecting a business does not guarantee it will be supported.
          </p>
          <Link href="/alajos" className="link-rule shrink-0 text-sm font-medium text-ink">
            See all businesses
          </Link>
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active = false,
  href,
}: {
  label: string;
  active?: boolean;
  href?: string;
}) {
  const className = `shrink-0 whitespace-nowrap border px-3 py-1.5 text-xs transition-colors ${
    active
      ? "border-forest bg-forest text-paper"
      : "border-rule-strong text-ink-soft hover:border-ink hover:text-ink"
  }`;

  if (!href) return <span className={className}>{label}</span>;
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
