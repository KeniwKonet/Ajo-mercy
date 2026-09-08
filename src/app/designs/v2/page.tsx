import Image from "next/image";
import Link from "next/link";
import { getImpactStats, listRecentAlajos, publicMediaUrl } from "@/lib/data/alajos";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatNumber, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * DIRECTION 02 — MOVEMENT / CULTURAL
 *
 * Layout philosophy: a campaign, not a website. Full-bleed statement panels
 * that alternate ink and paper, type set at poster scale and tightly tracked,
 * a running marquee, and a numbered manifesto. Navigation is a single line at
 * the top rather than a bar. Motion is used once, on the marquee, and the whole
 * thing still has to read as credible rather than as a meme.
 */
export default async function MovementDirection() {
  const [profiles, stats] = await Promise.all([listRecentAlajos(6), getImpactStats()]);

  return (
    <div className="bg-ink text-ivory-text">
      {/* --------------------------------------------------------- top bar */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <span className="font-display text-lg tracking-tight">
          Ajo<span className="italic text-ochre"> Mercy</span>
        </span>
        <Link
          href="/become-an-alajo"
          className="border border-paper/30 px-3.5 py-1.5 text-xs transition-colors hover:bg-paper hover:text-ink"
        >
          Enter your business
        </Link>
      </div>

      {/* ----------------------------------------------------------- hero */}
      <section className="border-y border-paper/15 px-5 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-2xs uppercase tracking-[0.24em] text-ivory-text/40">
          From the Ajo tussle to real impact
        </p>

        <h1 className="mt-8 max-w-[18ch] font-display text-[3.25rem] leading-[0.92] tracking-[-0.035em] sm:text-[5.5rem] lg:text-[7.5rem]">
          The Ajo tussle started a conversation.
        </h1>

        <p className="mt-10 max-w-[20ch] font-display text-3xl leading-[1.05] tracking-[-0.02em] text-ochre sm:text-5xl lg:text-6xl">
          We are turning it into something useful.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            href="/alajos"
            className="bg-paper px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-ochre"
          >
            See the businesses
          </Link>
          <Link
            href="/support"
            className="border border-paper/30 px-6 py-3.5 text-sm transition-colors hover:border-paper"
          >
            Back one of them
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------------- marquee */}
      <div className="overflow-hidden border-b border-paper/15 py-4" aria-hidden="true">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-mono text-2xs uppercase tracking-[0.2em] text-ivory-text/45">
          {Array.from({ length: 2 }).map((_, copy) => (
            <span key={copy} className="flex gap-10">
              {[
                "Applications are read by a person",
                "Selection is not confirmation",
                "We never hold your money",
                "Applying is free",
                "Registering does not guarantee support",
                "Verified before published",
              ].map((line) => (
                <span key={line} className="flex items-center gap-10">
                  {line}
                  <span className="text-ochre">◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------- manifesto */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="font-mono text-2xs uppercase tracking-[0.2em] text-ivory-text/40">What changed</h2>
        <ol className="mt-8 grid gap-px bg-paper/15 md:grid-cols-3">
          {[
            {
              n: "01",
              head: "Everyone wanted to help",
              body: "Brands calling. Individuals offering. Business owners sending voice notes describing what they were up against.",
            },
            {
              n: "02",
              head: "Nobody could verify anything",
              body: "No way to check which business was real, which story belonged to whom, or whether help ever arrived.",
            },
            {
              n: "03",
              head: "So we built the checking",
              body: "Applications read by hand. Documents examined. Recipients confirmed before anyone is congratulated.",
            },
          ].map((item) => (
            <li key={item.n} className="bg-ink p-7">
              <span className="font-mono text-sm text-ochre tabular">{item.n}</span>
              <h3 className="mt-4 font-display text-2xl leading-tight">{item.head}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ivory-text/60">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------ the businesses -- */}
      <section className="border-t border-paper/15 bg-paper px-5 py-16 text-ink sm:px-8 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-[14ch] font-display text-4xl leading-[0.98] tracking-[-0.03em] sm:text-6xl">
            Real people. Real businesses.
          </h2>
          <Link href="/alajos" className="link-rule text-sm font-medium">
            All of them
          </Link>
        </div>

        {profiles.length === 0 ? (
          <p className="mt-12 max-w-md font-display text-2xl text-ink-faint">
            The first businesses are in review. This is where they will appear.
          </p>
        ) : (
          <div className="mt-12 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => {
              const url = publicMediaUrl(profile.cover?.storage_path);
              return (
                <Link
                  key={profile.id}
                  href={`/alajos/${profile.slug}`}
                  className="group relative flex min-h-[22rem] flex-col justify-end overflow-hidden bg-widget-black p-6 text-ivory-text"
                >
                  {url && (
                    <Image
                      src={url}
                      alt={profile.business_name}
                      fill
                      sizes="(min-width: 1024px) 33vw, 50vw"
                      className="object-cover opacity-45 transition-all duration-700 group-hover:scale-105 group-hover:opacity-60"
                    />
                  )}
                  <div className="relative">
                    <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ochre">
                      {CATEGORY_LABELS[profile.business_category]}
                    </p>
                    <h3 className="mt-2 font-display text-2xl leading-tight">{profile.business_name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ivory-text/75">
                      {truncate(profile.current_challenge ?? profile.story, 100)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- the count */}
      <section className="border-t border-paper/15 px-5 py-16 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          {[
            ["Verified businesses", stats.alajos_approved],
            ["Businesses supported", stats.businesses_supported],
            ["States reached", stats.states_reached],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="font-display text-6xl leading-none tracking-[-0.03em] text-ochre tabular sm:text-7xl">
                {Number(value) === 0 ? "—" : formatNumber(Number(value))}
              </p>
              <p className="mt-3 font-mono text-2xs uppercase tracking-[0.16em] text-ivory-text/50">
                {label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-lg text-sm leading-relaxed text-ivory-text/45">
          Counted from the database, not written by hand. A dash means it has not happened yet, and
          we would rather show you that than a number we made up.
        </p>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      <section className="border-t border-paper/15 px-5 py-20 text-center sm:px-8">
        <h2 className="mx-auto max-w-[16ch] font-display text-4xl leading-[0.98] tracking-[-0.03em] sm:text-6xl">
          Your turn.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/become-an-alajo"
            className="bg-ochre px-7 py-4 text-sm font-medium text-ink transition-colors hover:bg-paper"
          >
            Enter your business
          </Link>
          <Link
            href="/support"
            className="border border-paper/30 px-7 py-4 text-sm transition-colors hover:border-paper"
          >
            Back a business
          </Link>
          <Link
            href="/brands"
            className="border border-paper/30 px-7 py-4 text-sm transition-colors hover:border-paper"
          >
            Bring a brand
          </Link>
        </div>
        <p className="mx-auto mt-10 max-w-md text-2xs leading-relaxed text-ivory-text/40">
          Applying is free. Registering does not guarantee selection or support. Ajo Mercy does not
          hold, custody or transfer support funds.
        </p>
      </section>
    </div>
  );
}
