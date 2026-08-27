import type { Metadata } from "next";
import Link from "next/link";
import { Container, Display, EmptyState, ButtonLink } from "@/components/ui/primitives";
import { FolioHead, LedgerRegister, Tally } from "@/components/site/ledger";
import { Reveal } from "@/components/ui/reveal";
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

  // Featured entries open the register, then the rest in the order they were
  // verified. Duplicates are dropped so a featured business is not listed twice.
  const featuredIds = new Set(featured.map((p) => p.id));
  const entries = [...featured, ...recent.filter((p) => !featuredIds.has(p.id))].slice(0, 8);
  const hasEntries = entries.length > 0;

  return (
    <>
      {/* --------------------------------------------------------- opening */}
      <section className="border-b border-rule">
        <Container className="py-14 sm:py-20">
          <FolioHead
            book="Ajo Mercy · Register of verified businesses"
            note="Kept by hand. Nothing is entered automatically."
          />

          <div className="mt-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="reveal">
              <Display size="xl" className="max-w-[14ch]">
                Find a business worth backing.
              </Display>
              <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-soft">
                Nigerian business owners tell us what they are building and what is in the way. We
                check it. Then people and brands who want to help choose who to back.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <ButtonLink href="/alajos" size="lg">
                  Open the register
                </ButtonLink>
                <ButtonLink href="/become-an-alajo" variant="secondary" size="lg">
                  Apply as a business
                </ButtonLink>
              </div>
              <p className="mt-5 text-xs text-ink-faint">
                Free to apply. Registering does not guarantee selection or support.
              </p>
            </div>

            {/* The three stages, entered like a book: number in the margin,
                each line sitting on its own rule. */}
            <div className="reveal reveal-2 ledger-margin self-end [--ledger-gutter:0px]">
              <ol className="pl-6">
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
                  <li key={step.n} className="flex gap-5 border-b border-rule py-5 first:pt-0 last:border-b-0">
                    <span className="entry-no pt-1.5">{step.n}</span>
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

      {/* -------------------------------------------------------- register */}
      <section className="border-b border-rule">
        <Container className="py-14 sm:py-18">
          <div className="flex items-baseline justify-between gap-6 pb-4">
            <h2 className="font-display text-2xl sm:text-3xl">The register</h2>
            <Link href="/alajos" className="link-rule shrink-0 text-sm text-ink-soft hover:text-ink">
              Every entry
            </Link>
          </div>

          {hasEntries ? (
            <>
              <LedgerRegister profiles={entries} />
              <p className="mt-5 font-mono text-2xs text-ink-faint">
                Entry numbers are positional and change as the register grows. A business is
                identified by its profile, not its line.
              </p>
            </>
          ) : (
            <EmptyState
              title="No entries yet"
              description="Applications are open and under review. Verified businesses are written into the register as the team works through them."
              action={
                <ButtonLink href="/become-an-alajo" variant="secondary">
                  Apply as a business
                </ButtonLink>
              }
            />
          )}
        </Container>
      </section>

      {/* ------------------------------------------------------------ tally */}
      {/* A closing column, ruled and totalled the way a book closes a page. */}
      <section aria-label="Running totals" className="border-b border-rule bg-paper-warm">
        <Container className="py-12 sm:py-14">
          <Reveal>
          <FolioHead
            book="Running totals"
            note="Counted from the database. A dash means it has not happened yet."
          />
          {/* Two ruled columns, closed with a struck rule the way a book totals
              a page. The tally only appears while a number is small enough that
              a person would actually count it. */}
          <dl className="mt-6 grid gap-x-14 sm:grid-cols-2">
            {[
              { label: "Businesses verified", value: stats.alajos_approved, tally: true },
              { label: "Businesses supported", value: stats.businesses_supported, tally: true },
              {
                label: "Support facilitated",
                value: stats.support_facilitated_ngn,
                money: true,
              },
              { label: "States reached", value: stats.states_reached, tally: true },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-6 border-b border-rule py-4"
              >
                <dt className="text-sm text-ink-soft">{item.label}</dt>
                <dd className="flex items-baseline gap-5">
                  {item.tally && item.value > 0 && <Tally count={item.value} />}
                  <span className="tabular min-w-[6ch] text-right font-mono text-base text-ink">
                    {item.value === 0
                      ? "—"
                      : item.money
                        ? formatNairaCompact(item.value)
                        : formatNumber(item.value)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="ledger-total mt-8 py-2 font-mono text-2xs text-ink-faint">
            Figures are counted, never estimated. Nothing here is projected forward.
          </p>
          </Reveal>
        </Container>
      </section>

      {/* --------------------------------------------------------- origin */}
      <section className="border-b border-rule">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.4fr_1fr] lg:gap-16">
            <p className="font-mono text-2xs leading-relaxed text-ink-faint">
              Where this came from.
              <br />
              Written by the team.
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
                Ajo Mercy is the book. Applications get read. Documents get checked. Businesses that
                pass are written into the register with their real story on it. Supporters and brands
                choose from those, and no one is told they have been supported until the team has
                confirmed it.
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
                  n: "i",
                  title: "Reviewed by a person, not a filter",
                  body: "Woli Arole is the Super Admin. He and the review team see every application, every document and every photograph before an entry goes live.",
                },
                {
                  n: "ii",
                  title: "Selection is not confirmation",
                  body: "When a supporter picks a business, that business is told it is under consideration. Only after the team confirms does anyone hear the word confirmed.",
                },
                {
                  n: "iii",
                  title: "We never touch the money",
                  body: "Ajo Mercy does not hold, escrow or transfer funds. Support is arranged directly, and we stay in the loop to make sure it lands.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-5 border-t border-paper/15 pt-5">
                  <span className="pt-1 font-mono text-2xs text-ochre">{item.n}</span>
                  <div>
                    <p className="font-display text-lg text-paper">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/70">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section>
        <Container className="py-14 sm:py-20">
          <FolioHead book="Three ways into the book" />
          <div>
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
            ].map((row) => (
              <Link
                key={row.title}
                href={row.href}
                className="ledger-row group grid items-baseline gap-x-8 gap-y-2 border-b border-rule py-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]"
              >
                <h3 className="font-display text-xl text-ink group-hover:text-terracotta">
                  {row.title}
                </h3>
                <p className="max-w-prose text-sm leading-relaxed text-ink-soft">{row.body}</p>
                <span className="justify-self-start border-b border-ink pb-0.5 text-sm font-medium text-ink group-hover:border-terracotta group-hover:text-terracotta md:justify-self-end">
                  {row.cta}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
