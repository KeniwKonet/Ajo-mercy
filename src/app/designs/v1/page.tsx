import Image from "next/image";
import Link from "next/link";
import { getImpactStats, listFeaturedAlajos, listRecentAlajos, publicMediaUrl } from "@/lib/data/alajos";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatNairaCompact, truncate, yearsOperating } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * DIRECTION 01 — EDITORIAL / HUMAN
 *
 * Layout philosophy: a printed magazine. A masthead with an issue line, a
 * single dominant opening image, an asymmetric two-column body with a story
 * index in the margin, pull quotes set large, and generous whitespace. No
 * cards, no dashboards, no status pills. Type does the work: display serif at
 * every size, the grotesque only for captions and navigation.
 */
export default async function EditorialDirection() {
  const [featured, recent, stats] = await Promise.all([
    listFeaturedAlajos(4),
    listRecentAlajos(9),
    getImpactStats(),
  ]);

  const stories = featured.length > 0 ? featured : recent;
  const lead = stories[0];
  const secondary = stories.slice(1, 4);
  const index = recent.slice(0, 8);
  const coverUrl = publicMediaUrl(lead?.cover?.storage_path);

  return (
    <div className="bg-paper">
      {/* ------------------------------------------------------- masthead -- */}
      <header className="border-b-2 border-ink">
        <div className="mx-auto max-w-[80rem] px-5 sm:px-8">
          <div className="flex items-baseline justify-between gap-4 py-3 text-2xs uppercase tracking-[0.16em] text-ink-faint">
            <span className="font-mono">Lagos · Nigeria</span>
            <span className="hidden font-mono sm:inline">
              {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <Link href="/become-an-alajo" className="font-mono hover:text-ink">
              Submit your business
            </Link>
          </div>

          <div className="border-t border-rule py-8 text-center">
            <h1 className="font-display text-5xl leading-none tracking-[-0.03em] sm:text-7xl lg:text-[7rem]">
              Ajo Mercy
            </h1>
            <p className="mt-3 font-mono text-2xs uppercase tracking-[0.28em] text-ink-faint">
              The businesses behind the stories
            </p>
          </div>

          <nav
            aria-label="Sections"
            className="flex justify-center gap-7 border-t border-rule py-3 text-xs"
          >
            {["The stories", "Who is behind it", "How to take part", "Get in touch"].map((item) => (
              <span key={item} className="link-rule cursor-default text-ink-soft">
                {item}
              </span>
            ))}
          </nav>
        </div>
      </header>

      {/* ----------------------------------------------------------- lead -- */}
      <div className="mx-auto max-w-[80rem] px-5 sm:px-8">
        {lead ? (
          <article className="border-b border-rule py-10 sm:py-14">
            <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
              <div>
                {coverUrl ? (
                  <div className="relative aspect-[5/4] bg-paper-deep">
                    <Image
                      src={coverUrl}
                      alt={lead.business_name}
                      fill
                      priority
                      sizes="(min-width: 1024px) 55vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[5/4] items-center justify-center bg-forest-wash">
                    <span className="font-display text-6xl text-forest/30">
                      {lead.business_name.slice(0, 1)}
                    </span>
                  </div>
                )}
                <p className="mt-2 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                  {lead.founder_name}, {[lead.city, lead.state].filter(Boolean).join(", ")}
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <p className="font-mono text-2xs uppercase tracking-[0.16em] text-terracotta">
                  {CATEGORY_LABELS[lead.business_category]}
                </p>
                <h2 className="mt-4 font-display text-4xl leading-[1.04] tracking-[-0.02em] sm:text-5xl">
                  {lead.business_name}
                </h2>
                <p className="mt-6 text-lg leading-[1.65] text-ink-soft">
                  {truncate(lead.story, 340)}
                </p>
                <Link
                  href={`/alajos/${lead.slug}`}
                  className="mt-7 self-start border-b-2 border-ink pb-1 font-display text-lg transition-colors hover:border-terracotta hover:text-terracotta"
                >
                  Read the full story
                </Link>
              </div>
            </div>
          </article>
        ) : (
          <div className="border-b border-rule py-20 text-center">
            <p className="font-display text-3xl text-ink-faint">The first issue is being assembled.</p>
            <p className="mx-auto mt-3 max-w-md text-ink-soft">
              Applications are open and under review. Stories appear here as businesses are verified.
            </p>
          </div>
        )}

        {/* ------------------------------------- body: columns + margin --- */}
        <div className="grid gap-12 py-12 lg:grid-cols-[1fr_16rem] lg:gap-16">
          <div>
            {secondary.length > 0 && (
              <div className="grid gap-10 border-b border-rule pb-12 sm:grid-cols-3">
                {secondary.map((profile) => {
                  const url = publicMediaUrl(profile.cover?.storage_path);
                  return (
                    <article key={profile.id}>
                      {url && (
                        <div className="relative mb-3 aspect-[3/2] bg-paper-deep">
                          <Image
                            src={url}
                            alt={profile.business_name}
                            fill
                            sizes="30vw"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <p className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                        {CATEGORY_LABELS[profile.business_category]}
                      </p>
                      <h3 className="mt-1.5 font-display text-xl leading-snug">
                        <Link href={`/alajos/${profile.slug}`} className="hover:text-terracotta">
                          {profile.business_name}
                        </Link>
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                        {truncate(profile.current_challenge ?? profile.story, 120)}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Pull quote, set as a display line rather than in a box. */}
            <figure className="border-b border-rule py-14">
              <blockquote className="font-display text-3xl leading-[1.3] tracking-[-0.015em] sm:text-4xl">
                &ldquo;An argument about Ajo turned into a queue of people asking the same question:
                who actually needs it, and how do I know they are real?&rdquo;
              </blockquote>
              <figcaption className="mt-5 font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                Why this exists
              </figcaption>
            </figure>

            <div className="grid gap-10 py-12 sm:grid-cols-2">
              <div>
                <h3 className="font-display text-2xl">The process, briefly</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  A business applies. A person on the Ajo Mercy team reads it, looks at the
                  photographs and checks the identity document. Nothing goes live automatically.
                </p>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  Approved businesses appear here. Supporters and brands read the stories and choose
                  who to back. The team confirms before anyone is told they have been supported.
                </p>
              </div>
              <div>
                <h3 className="font-display text-2xl">What we do not do</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  We do not hold or transfer money. We do not charge to apply. We do not publish how
                  many people have selected a business, because that would make this a contest rather
                  than a choice.
                </p>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  Registering does not guarantee selection or support.
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ margin index -- */}
          <aside className="lg:border-l lg:border-rule lg:pl-8">
            <h3 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              In this issue
            </h3>
            {index.length === 0 ? (
              <p className="mt-4 text-sm text-ink-faint">Nothing published yet.</p>
            ) : (
              <ol className="mt-4">
                {index.map((profile, position) => (
                  <li key={profile.id} className="border-b border-rule py-3">
                    <Link href={`/alajos/${profile.slug}`} className="group flex gap-3">
                      <span className="font-mono text-2xs text-terracotta tabular">
                        {String(position + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-display text-sm leading-snug group-hover:text-terracotta">
                          {profile.business_name}
                        </span>
                        <span className="mt-0.5 block text-2xs text-ink-faint">
                          {[profile.city, profile.state].filter(Boolean).join(", ")}
                          {yearsOperating(profile.year_started)
                            ? ` · ${yearsOperating(profile.year_started)}`
                            : ""}
                          {profile.requested_amount_ngn
                            ? ` · ${formatNairaCompact(profile.requested_amount_ngn)}`
                            : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-8 border-t-2 border-ink pt-4">
              <p className="font-display text-lg leading-snug">Run a business?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                Tell us what you are building and what is standing in the way.
              </p>
              <Link
                href="/become-an-alajo"
                className="mt-3 inline-block border-b border-ink pb-0.5 text-sm font-medium hover:border-terracotta hover:text-terracotta"
              >
                Submit your business
              </Link>
            </div>

            <dl className="mt-8 border-t border-rule pt-4 font-mono text-2xs uppercase tracking-[0.1em]">
              {[
                ["Verified", stats.alajos_approved],
                ["Supported", stats.businesses_supported],
                ["States", stats.states_reached],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between border-b border-rule py-2">
                  <dt className="text-ink-faint">{label}</dt>
                  <dd className="text-ink tabular">{Number(value) === 0 ? "—" : String(value)}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>

      <footer className="border-t-2 border-ink py-8">
        <div className="mx-auto max-w-[80rem] px-5 text-center font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint sm:px-8">
          Ajo Mercy · A discovery and verification platform · We do not hold support funds
        </div>
      </footer>
    </div>
  );
}
