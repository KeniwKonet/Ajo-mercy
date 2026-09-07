import Image from "next/image";
import Link from "next/link";
import { cn } from "@/components/ui/primitives";
import { VerifiedMark } from "@/components/ui/trust";
import { publicMediaUrl } from "@/lib/data/media-url";
import { CATEGORY_LABELS } from "@/lib/types";
import type { AlajoProfileWithMedia } from "@/lib/types";
import { formatNairaCompact, initials, truncate, yearsOperating } from "@/lib/format";

/**
 * A business, as a person rather than a record.
 *
 * The order is deliberate and is the same on every surface: the photograph,
 * then the business name, then the person who runs it, then where they are,
 * then what they said. Somebody deciding whether to read further is deciding
 * about a person, so the person comes before the metadata.
 *
 * Never shown here, on purpose:
 *   - how many people have selected this business, which would turn discovery
 *     into a leaderboard
 *   - anything from the private side of the application
 */

function Photo({
  profile,
  className,
  sizes,
  priority,
}: {
  profile: AlajoProfileWithMedia;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  const src = publicMediaUrl(profile.cover?.storage_path ?? profile.avatar?.storage_path);

  return (
    <div className={cn("relative overflow-hidden rounded-md bg-paper-deep", className)}>
      {src ? (
        <Image
          src={src}
          alt={`${profile.business_name}, ${profile.city ?? profile.state}`}
          fill
          sizes={sizes}
          unoptimized
          priority={priority}
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.04]"
        />
      ) : (
        // No photograph yet. A monogram on warm paper is honest; a stock
        // image of somebody else's shop would not be.
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-4xl text-rule-strong">
            {initials(profile.business_name)}
          </span>
        </div>
      )}
      {profile.status === "featured" && (
        <span className="absolute left-3 top-3 rounded-sm bg-ochre px-2 py-1 text-2xs font-bold uppercase tracking-[0.08em] text-ink">
          Featured
        </span>
      )}
    </div>
  );
}

function Meta({ profile }: { profile: AlajoProfileWithMedia }) {
  const years = yearsOperating(profile.year_started);
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
      <span>{CATEGORY_LABELS[profile.business_category]}</span>
      <span aria-hidden="true" className="text-rule-strong">·</span>
      <span>{[profile.city, profile.state].filter(Boolean).join(", ")}</span>
      {years && (
        <>
          <span aria-hidden="true" className="text-rule-strong">·</span>
          <span>{years}</span>
        </>
      )}
    </p>
  );
}

export function BusinessCard({
  profile,
  priority,
  className,
}: {
  profile: AlajoProfileWithMedia;
  priority?: boolean;
  className?: string;
}) {
  const line = truncate(profile.current_challenge ?? profile.story ?? "", 118);

  return (
    <Link
      href={`/alajos/${profile.slug}`}
      className={cn("group flex flex-col focus-visible:outline-offset-4", className)}
    >
      <Photo
        profile={profile}
        priority={priority}
        sizes="(min-width: 1280px) 22rem, (min-width: 768px) 33vw, 100vw"
        className="aspect-[4/3]"
      />

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold leading-snug tracking-tight text-ink group-hover:text-terracotta">
            {profile.business_name}
          </h3>
          <VerifiedMark className="mt-0.5 shrink-0" />
        </div>

        <p className="mt-1 text-sm font-medium text-ink-soft">{profile.founder_name}</p>
        <Meta profile={profile} />

        {line && <p className="mt-3.5 flex-1 text-sm leading-relaxed text-ink-soft">{line}</p>}

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-rule pt-3.5">
          <span className="text-sm font-semibold text-ink group-hover:text-terracotta">
            Read their story
          </span>
          {profile.requested_amount_ngn && (
            <span className="tabular text-xs text-ink-faint">
              Seeking {formatNairaCompact(profile.requested_amount_ngn)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * The lead entry. Same information, given room to breathe, so a listing does
 * not open as a uniform grid.
 */
export function BusinessFeature({
  profile,
  priority,
}: {
  profile: AlajoProfileWithMedia;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/alajos/${profile.slug}`}
      className="group grid gap-7 md:grid-cols-2 md:items-center md:gap-12"
    >
      <Photo
        profile={profile}
        priority={priority}
        sizes="(min-width: 768px) 50vw, 100vw"
        className="aspect-[4/3] md:aspect-[5/4]"
      />

      <div>
        <VerifiedMark />
        <h3 className="mt-4 font-display text-3xl leading-[1.08] sm:text-4xl">
          {profile.business_name}
        </h3>
        <p className="mt-2 text-base font-medium text-ink-soft">{profile.founder_name}</p>
        <Meta profile={profile} />

        <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
          {truncate(profile.story ?? profile.current_challenge ?? "", 240)}
        </p>

        <span className="mt-7 inline-flex items-center gap-2 border-b-2 border-ink pb-1 text-sm font-semibold text-ink transition-colors group-hover:border-terracotta group-hover:text-terracotta">
          Read their story
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
      </div>
    </Link>
  );
}
