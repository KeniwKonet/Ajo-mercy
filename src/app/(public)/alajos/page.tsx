import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container, EmptyState, ButtonLink, Skeleton } from "@/components/ui/primitives";
import { BusinessCard, BusinessFeature } from "@/components/site/business-card";
import { PageHeader } from "@/components/ui/trust";
import { Reveal } from "@/components/ui/reveal";
import { DiscoveryFilters } from "./filters";
import { getCategoryCounts, getStateCounts, listAlajos } from "@/lib/data/alajos";
import { discoveryQuerySchema } from "@/lib/validation/schemas";
import { CATEGORY_LABELS, type BusinessCategory } from "@/lib/types";

export const revalidate = 120;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const state = typeof params.state === "string" ? params.state : undefined;

  const parts = [
    category ? CATEGORY_LABELS[category as BusinessCategory] : null,
    state ? `in ${state}` : null,
  ].filter(Boolean);

  const title = parts.length > 0 ? `Verified businesses ${parts.join(" ")}` : "Verified businesses";

  return {
    title,
    description:
      "Browse Nigerian businesses that have been verified by the Ajo Mercy team. Read their stories and choose who to support.",
    alternates: {
      // Filtered views share the canonical listing so they do not compete in search.
      canonical: "/alajos",
    },
  };
}

export default async function AlajosPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const parsed = discoveryQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : discoveryQuerySchema.parse({});

  const [result, categories, states] = await Promise.all([
    listAlajos(query),
    getCategoryCounts(),
    getStateCounts(),
  ]);

  const { profiles, total, page, pageCount } = result;
  const isFirstUnfilteredPage =
    page === 1 && !query.q && !query.category && !query.state && !query.need;

  // The lead treatment is only for the plain first page. Once someone has
  // filtered, every result is equally relevant and the grid is the honest shape.
  const lead = isFirstUnfilteredPage ? profiles[0] : undefined;
  const gridItems = lead ? profiles.slice(1) : profiles;

  return (
    <Container className="py-12 sm:py-16">
      <PageHeader
        eyebrow="Verified businesses"
        title={<span className="font-display text-4xl sm:text-5xl">Discover</span>}
        lead="Every business here applied, sent documents, and was read by a person before it appeared. Take your time. The stories are the point."
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <DiscoveryFilters categories={categories} states={states} total={total} />
          </Suspense>
        </aside>

        <div className="min-w-0">
          {profiles.length === 0 ? (
            <EmptyState
              title={total === 0 && isFirstUnfilteredPage ? "No verified businesses yet" : "Nothing matches that"}
              description={
                total === 0 && isFirstUnfilteredPage
                  ? "Applications are open and being reviewed. Verified businesses appear here as the team works through them."
                  : "Try removing a filter or searching for something broader."
              }
              action={
                total === 0 && isFirstUnfilteredPage ? (
                  <ButtonLink href="/become-an-alajo" variant="secondary">
                    Apply as a business
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/alajos" variant="secondary">
                    Clear filters
                  </ButtonLink>
                )
              }
            />
          ) : (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-3">
                <p className="text-sm font-semibold">
                  {total} {total === 1 ? "business" : "businesses"}
                </p>
                {pageCount > 1 && (
                  <p className="text-xs text-ink-faint">
                    Page {page} of {pageCount}
                  </p>
                )}
              </div>

              {/* The first result on an unfiltered page gets room; the rest run
                  as a grid. A uniform grid from the top reads as a directory
                  rather than a set of people. */}
              <div className="space-y-14 pt-9">
                {lead && <BusinessFeature profile={lead} priority />}
                {gridItems.length > 0 && (
                  <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                    {gridItems.map((profile, i) => (
                      <Reveal key={profile.id} delay={i * 50}>
                        <BusinessCard profile={profile} priority={!lead && i < 3} />
                      </Reveal>
                    ))}
                  </div>
                )}
              </div>

              <p className="mt-8 text-xs text-ink-faint">
                How many people have chosen a business is never published.
              </p>

              {pageCount > 1 && (
                <div className="mt-10">
                  <Pagination page={page} pageCount={pageCount} params={raw} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | string[] | undefined>;
}) {
  const build = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      next.set(key, Array.isArray(value) ? (value[0] ?? "") : value);
    }
    if (target > 1) next.set("page", String(target));
    return `/alajos${next.toString() ? `?${next}` : ""}`;
  };

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between border-t border-rule pt-6">
      {page > 1 ? (
        <Link href={build(page - 1)} rel="prev" className="link-rule text-sm text-ink">
          ← Previous
        </Link>
      ) : (
        <span className="text-sm text-ink-faint">← Previous</span>
      )}

      <span className="text-sm text-ink-faint tabular">
        Page {page} of {pageCount}
      </span>

      {page < pageCount ? (
        <Link href={build(page + 1)} rel="next" className="link-rule text-sm text-ink">
          Next →
        </Link>
      ) : (
        <span className="text-sm text-ink-faint">Next →</span>
      )}
    </nav>
  );
}
