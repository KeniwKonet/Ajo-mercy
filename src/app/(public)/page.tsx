import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState, ButtonLink } from "@/components/ui/primitives";
import { SectionHeader } from "@/components/ui/trust";
import { BusinessCard, BusinessFeature } from "@/components/site/business-card";
import { JourneyStrip } from "@/components/site/journey";
import { HeroComposition } from "@/components/site/hero-composition";
import { Reveal } from "@/components/ui/reveal";
import { getImpactStats, listFeaturedAlajos, listRecentAlajos } from "@/lib/data/alajos";
import { formatNairaCompact, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Good businesses deserve to be seen",
  description:
    "Ajo Mercy verifies Nigerian business owners and connects them with individuals and brands who want to back them. Every business here was read by a person before it appeared.",
  alternates: { canonical: "/" },
};

export const revalidate = 300;

export default async function HomePage() {
  const [featured, recent, stats] = await Promise.all([
    listFeaturedAlajos(5),
    listRecentAlajos(8),
    getImpactStats(),
  ]);

  const featuredIds = new Set(featured.map((p) => p.id));
  const all = [...featured, ...recent.filter((p) => !featuredIds.has(p.id))];
  const lead = all[0] ?? null;
  const rest = all.slice(1, 7);
  const hasBusinesses = Boolean(lead);

  return (
    <>
      {/* ------------------------------------------------------------ hero
          Answers what this is, who it is for, and what you can do, above the
          fold. The diagram carries the same argument without the words. */}
      <section className="overflow-x-clip border-b border-rule">
        <Container className="py-14 sm:py-20 lg:py-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div className="reveal">
              {/* Manrope 800 at 64px, per the handoff. The word "verified" is
                  set in an outlined pill carrying a lime check, so the claim
                  the platform actually makes is the thing the eye lands on. */}
              <h1 className="text-[clamp(2.5rem,6.4vw,4rem)] font-extrabold leading-[0.98] tracking-[-0.02em] text-ink">
                Discover the
                <br />
                people behind
                <br />
                <span className="inline-flex items-center gap-2.5 rounded-full border-[2.5px] border-widget-black-2 py-1.5 pl-2.5 pr-5 align-middle">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime">
                    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                      <path
                        d="M3 7.4 5.8 10 11 4"
                        fill="none"
                        stroke="var(--color-widget-black-2)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  verified
                </span>{" "}
                businesses.
              </h1>

              <p className="mt-6 max-w-[26rem] text-base leading-[1.65] text-ink-soft">
                Nigerian business owners tell us what they are building. A person checks every one.
                Then people and brands who want to help choose who to back.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ButtonLink
                  href="/alajos"
                  className="!bg-widget-black-2 !px-7 !py-4 !text-ivory-text hover:!brightness-125"
                >
                  Discover Businesses →
                </ButtonLink>
                <ButtonLink href="/become-an-alajo" variant="secondary" className="!px-6 !py-4">
                  Become an Alajo
                </ButtonLink>
              </div>

              <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-faint">
                Free to apply. Ajo Mercy never holds or transfers money, and registering does not
                guarantee selection or support.
              </p>
            </div>

            <div className="reveal reveal-2 lg:pl-4">
              <HeroComposition profile={lead} />
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------------------------------------------------- journey
          Four pills straight after the hero, per the handoff. No band and no
          heading: the numbered stages are their own label. */}
      <section>
        <Container className="pt-14 sm:pt-16">
          <Reveal>
            <JourneyStrip />
          </Reveal>
        </Container>
      </section>

      {/* ------------------------------------------------------- businesses
          Discovery comes before explanation. Someone who arrives cold should
          meet a real person's business before they meet an argument. */}
      <section className="border-b border-rule">
        <Container className="py-16 sm:py-20">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="text-[0.9375rem] font-extrabold tracking-tight text-ink">Discover</h2>
            <Link href="/alajos" className="link-rule text-sm font-bold text-ink">
              See all businesses
            </Link>
          </div>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
            Every one of them applied, sent documents, and was read by a person before it
            appeared here.
          </p>

          {hasBusinesses && lead ? (
            <div className="space-y-16 pt-10">
              <BusinessFeature profile={lead} priority />
              {rest.length > 0 && (
                <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((profile, i) => (
                    <Reveal key={profile.id} delay={i * 60}>
                      <BusinessCard profile={profile} />
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="pt-10">
              <EmptyState
                title="No verified businesses yet"
                description="Applications are open and under review. Businesses appear here as the team finishes checking them, and never before."
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

      {/* ------------------------------------------------------------ trust */}
      <section className="border-b border-rule bg-widget-black text-ivory-text">
        <Container className="py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
            <div>
              <h2 className="text-3xl font-extrabold leading-[1.04] tracking-[-0.02em] text-ivory-text sm:text-4xl">
                Anyone can collect names. The hard part is knowing they are real.
              </h2>
              <p className="mt-7 max-w-md text-base leading-relaxed text-ivory-text/75">
                Verification is not a feature of this product. It is the product. Everything else
                exists to make a checked business easier to find and easier to back.
              </p>
            </div>

            <ul className="space-y-7">
              {[
                {
                  title: "Reviewed by a person, not a filter",
                  body: "Woli Arole is the Super Admin. He and the review team see every application, every document and every photograph before a business goes live.",
                },
                {
                  title: "Choosing is not confirming",
                  body: "When a supporter picks a business, that business is told it is under consideration and nothing more. Only after the team confirms does anyone hear that support is real.",
                },
                {
                  title: "We never touch the money",
                  body: "Ajo Mercy does not hold, escrow or transfer funds at any point. Support is arranged directly between the two sides, and we stay in the loop to make sure it lands.",
                },
                {
                  title: "No leaderboards",
                  body: "How many people have chosen a business is never published. Attention should follow the story, not the scoreboard.",
                },
              ].map((item, i) => (
                <li key={item.title} className="flex gap-5 border-t border-paper/15 pt-6">
                  <span className="tabular pt-1 text-2xs font-bold text-ochre">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ivory-text">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ivory-text/70">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* ----------------------------------------------------------- counts
          Counted from the database. A dash where nothing has happened yet. */}
      <section aria-label="Platform numbers" className="border-b border-rule">
        <Container className="py-14">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Businesses verified", value: stats.alajos_approved, hint: "Reviewed and live" },
              { label: "Businesses supported", value: stats.businesses_supported, hint: "Support confirmed" },
              { label: "Support facilitated", value: stats.support_facilitated_ngn, money: true, hint: "Confirmed and announced" },
              { label: "States reached", value: stats.states_reached, hint: "Across Nigeria" },
            ].map((item) => (
              <div key={item.label} className="widget">
                <dd
                  className={
                    item.value === 0
                      ? "tabular font-display text-5xl leading-none text-muted-on-black"
                      : "tabular font-display text-5xl leading-none text-lime"
                  }
                >
                  {item.value === 0
                    ? "—"
                    : item.money
                      ? formatNairaCompact(item.value)
                      : formatNumber(item.value)}
                </dd>
                <dt className="mt-4 text-sm font-semibold text-ivory-text">{item.label}</dt>
                <p className="mt-1 text-xs text-muted-on-black">{item.hint}</p>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-xs text-ink-faint">
            Every figure is counted from the platform database. A dash means it has not happened yet.
          </p>
        </Container>
      </section>

      {/* ------------------------------------------------------------- ways in */}
      <section>
        <Container className="py-16 sm:py-20">
          <SectionHeader title="Three ways in" className="border-b-0 pb-0" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "You run a business",
                body: "Tell us what you are building and what is in the way. Applications are read in the order they arrive.",
                cta: "Become an Alajo",
                href: "/become-an-alajo",
              },
              {
                title: "You want to help",
                body: "Register, get approved, then choose as many businesses as you want to back.",
                cta: "Support a business",
                href: "/support",
              },
              {
                title: "You represent a brand",
                body: "Set a budget, tell us what you are looking for, and choose from verified businesses.",
                cta: "Register your brand",
                href: "/brands",
              },
            ].map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="widget card-interactive group flex flex-col"
              >
                <h3 className="text-xl font-bold tracking-tight text-ivory-text">{card.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-on-black">{card.body}</p>
                <span className="mt-7 inline-flex items-center gap-2 self-start rounded-full bg-lime px-4 py-2.5 text-sm font-extrabold text-widget-black-2 transition-[filter] group-hover:brightness-95">
                  {card.cta}
                  <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                    <path
                      d="M3 8h9M8.5 4l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
