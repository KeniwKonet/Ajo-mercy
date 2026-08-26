import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container, EmptyState, ButtonLink, Skeleton } from "@/components/ui/primitives";
import { AlajoCard, AlajoFeature } from "@/components/site/alajo-cards";
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

  // On the plain first page, the top result gets the full editorial treatment
  // so the listing does not open as a uniform grid.
  const lead = isFirstUnfilteredPage ? profiles[0] : undefined;
  const rest = lead ? profiles.slice(1) : profiles;

  return (
    <Container className="py-12 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl sm:text-5xl">The businesses</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          Every business here applied, sent documents, and was read by a person before it appeared.
          Take your time. The stories are the point.
        </p>
      </header>

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
            <div className="space-y-14">
              {lead && (
                <>
                  <AlajoFeature profile={lead} priority />
                  <hr className="border-rule" />
                </>
              )}

              <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                {rest.map((profile, index) => (
                  <AlajoCard key={profile.id} profile={profile} priority={!lead && index < 3} />
                ))}
              </div>

              {pageCount > 1 && <Pagination page={page} pageCount={pageCount} params={raw} />}
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
