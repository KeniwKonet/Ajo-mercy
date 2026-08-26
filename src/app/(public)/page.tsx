import type { Metadata } from "next";
import Link from "next/link";
import { Container, Display, EmptyState, ButtonLink, Stat } from "@/components/ui/primitives";
import { AlajoFeature, AlajoRail } from "@/components/site/alajo-cards";
import { getImpactStats, listFeaturedAlajos, listRecentAlajos } from "@/lib/data/alajos";
import { formatNairaCompact, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Find a business worth backing",
  description:
    "Ajo Mercy verifies Nigerian business owners and connects them with individuals and brands who want to back them. Every profile is reviewed by a person.",
  alternates: { canonical: "/" },
};

export const revalidate = 300;

export default async function HomePage() {
  const [featured, recent, stats] = await Promise.all([
    listFeaturedAlajos(5),
    listRecentAlajos(8),
    getImpactStats(),
  ]);

  const lead = featured[0] ?? recent[0] ?? null;
  const rail = (featured.length > 1 ? featured.slice(1) : recent).slice(0, 4);
  const hasBusinesses = Boolean(lead);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="border-b border-rule">
        <Container className="py-16 sm:py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
            <div className="reveal">
              <Display size="xl" className="max-w-[15ch]">
                Find a business worth backing.
              </Display>
              <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-soft">
                Nigerian business owners tell us what they are building and what is in the way. We
                check it. Then people and brands who want to help choose who to back.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <ButtonLink href="/alajos" size="lg">
                  Browse businesses
                </ButtonLink>
                <ButtonLink href="/become-an-alajo" variant="secondary" size="lg">
                  Apply as a business
                </ButtonLink>
              </div>
              <p className="mt-5 text-xs text-ink-faint">
                Free to apply. Registering does not guarantee selection or support.
              </p>
            </div>

            {/* The process, stated plainly. This is the product's actual
                promise, so it sits in the hero rather than three scrolls down. */}
            <div className="reveal reveal-2 self-end border-t border-rule pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
              <ol className="space-y-7">
                {[
                  {
                    n: "01",
                    title: "A business applies",
                    body: "Owner, business, documents, and the story behind it.",
                  },
                  {
                    n: "02",
                    title: "A person reviews it",
                    body: "Woli Arole and the Ajo Mercy team check every application by hand. Nothing goes live automatically.",
                  },
                  {
                    n: "03",
                    title: "Supporters choose",
                    body: "Individuals and brands pick who they want to back. We confirm before anyone is told they have been supported.",
                  },
                ].map((step) => (
                  <li key={step.n} className="flex gap-5">
                    <span className="font-mono text-xs text-terracotta tabular">{step.n}</span>
                    <div>
                      <p className="font-display text-lg leading-snug">{step.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Container>
      </section>

      {/* ----------------------------------------------------------- stats */}
      <section aria-label="Platform numbers" className="border-b border-rule bg-paper-warm">
        <Container>
          <dl className="grid grid-cols-2 divide-rule sm:grid-cols-4 sm:divide-x">
            {[
              { label: "Businesses verified", value: stats.alajos_approved, hint: "Reviewed and live" },
              { label: "Businesses supported", value: stats.businesses_supported, hint: "Support confirmed" },
              {
                label: "Support facilitated",
                value: stats.support_facilitated_ngn,
                hint: "Confirmed and announced",
                money: true,
              },
              { label: "States reached", value: stats.states_reached, hint: "Across Nigeria" },
            ].map((item, index) => (
              <div key={item.label} className={index < 2 ? "sm:pl-6 first:sm:pl-0" : "sm:px-6"}>
                <Stat
                  value={
                    item.value === 0
                      ? null
                      : item.money
                        ? formatNairaCompact(item.value)
                        : formatNumber(item.value)
                  }
                  label={item.label}
                  hint={item.hint}
                  className="px-1 py-6 sm:px-0"
                />
              </div>
            ))}
          </dl>
          <p className="pb-6 text-xs text-ink-faint">
            Every number here is counted from the platform database. A dash means it has not happened yet.
          </p>
        </Container>
      </section>

      {/* --------------------------------------------------------- origin */}
      <section className="border-b border-rule">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.4fr_1fr] lg:gap-16">
            <p className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              Where this came from
            </p>
            <div className="prose-editorial">
              <p className="font-display text-2xl leading-[1.35] text-ink sm:text-3xl">
                An argument about Ajo turned into a queue of people asking the same question: who
                actually needs the money, and how do I know they are real?
              </p>
              <p className="mt-6 text-base leading-relaxed text-ink-soft">
                Brands started calling. Individuals started offering. Business owners started sending
                DMs. None of it had a system behind it, so most of it went nowhere.
              </p>
              <p className="mt-4 text-base leading-relaxed text-ink-soft">
                Ajo Mercy is the system. Applications get read. Documents get checked. Businesses that
                pass get a profile with their real story on it. Supporters and brands choose from
                those, and no one is told they have been supported until the team has confirmed it.
              </p>
              <p className="mt-6">
                <Link href="/how-it-works" className="link-rule text-sm font-medium text-ink">
                  Read the full process
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------ businesses */}
      <section className="border-b border-rule">
        <Container className="py-16 sm:py-20">
          <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-4">
            <h2 className="font-display text-2xl sm:text-3xl">The businesses</h2>
            <Link href="/alajos" className="link-rule shrink-0 text-sm text-ink-soft hover:text-ink">
              Browse all
            </Link>
          </div>

          {hasBusinesses && lead ? (
            <div className="space-y-16 pt-10">
              <AlajoFeature profile={lead} priority />
              {rail.length > 0 && <AlajoRail profiles={rail} title="More to read" href="/alajos" />}
            </div>
          ) : (
            <div className="pt-10">
              <EmptyState
                title="No verified businesses yet"
                description="Applications are open and under review. Verified businesses will appear here as the team works through them."
                action={
                  <ButtonLink href="/become-an-alajo" variant="secondary">
                    Apply as a business
                  </ButtonLink>
                }
              />
            </div>
          )}
        </Container>
      </section>

      {/* ----------------------------------------------------------- trust */}
      <section className="border-b border-rule bg-forest text-paper">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="font-display text-3xl leading-tight text-paper sm:text-4xl">
                Verification is the whole product.
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-paper/75">
                Anyone can build a page that collects names. The hard part is knowing that the
                business on the other end is real, that the story is theirs, and that support reaches
                the person it was meant for.
              </p>
            </div>
            <ul className="space-y-6">
              {[
                {
                  title: "Reviewed by a person, not a filter",
                  body: "Woli Arole is the Super Admin. He and the review team see every application, every document and every photograph before a profile goes live.",
                },
                {
                  title: "Selection is not confirmation",
                  body: "When a supporter picks a business, that business is told it is under consideration. Only after the team confirms does anyone hear the word confirmed.",
                },
                {
                  title: "We never touch the money",
                  body: "Ajo Mercy does not hold, escrow or transfer funds. Support is arranged directly, and we stay in the loop to make sure it lands.",
                },
              ].map((item) => (
                <li key={item.title} className="border-t border-paper/15 pt-5">
                  <p className="font-display text-lg text-paper">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/70">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section>
        <Container className="py-16 sm:py-24">
          <div className="grid gap-px overflow-hidden border border-rule bg-rule md:grid-cols-3">
            {[
              {
                title: "You run a business",
                body: "Tell us what you are building and what is in the way. Applications are read in the order they arrive.",
                cta: "Apply as an Alajo",
                href: "/become-an-alajo",
              },
              {
                title: "You want to help",
                body: "Register, get approved, then choose the businesses you want to back.",
                cta: "Support a business",
                href: "/support",
              },
              {
                title: "You represent a brand",
                body: "Set a budget, tell us what you are looking for, and pick from verified businesses.",
                cta: "Register your brand",
                href: "/brands",
              },
            ].map((card) => (
              <div key={card.title} className="flex flex-col bg-paper p-8">
                <h3 className="font-display text-xl">{card.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{card.body}</p>
                <Link
                  href={card.href}
                  className="mt-6 self-start border-b border-ink pb-0.5 text-sm font-medium text-ink transition-colors hover:border-terracotta hover:text-terracotta"
                >
                  {card.cta}
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
