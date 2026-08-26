import Image from "next/image";
import Link from "next/link";
import { publicMediaUrl } from "@/lib/data/alajos";
import { CATEGORY_LABELS, type AlajoProfileWithMedia } from "@/lib/types";
import { formatNairaCompact, truncate, yearsOperating } from "@/lib/format";
import { cn } from "@/components/ui/primitives";

/**
 * Three presentations of the same record, used to build editorial rhythm
 * instead of an endless wall of identical cards.
 */

function MediaFrame({
  profile,
  className,
  sizes,
  priority = false,
}: {
  profile: AlajoProfileWithMedia;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  const src = publicMediaUrl(profile.cover?.storage_path);
  if (!src) {
    // No photograph yet. A tinted plate with the initials reads as intentional
    // rather than as a broken image.
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-forest-wash text-forest",
          className,
        )}
        aria-hidden="true"
      >
        <span className="font-display text-3xl opacity-40">
          {profile.business_name.slice(0, 1).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-paper-deep", className)}>
      <Image
        src={src}
        alt={`${profile.business_name} in ${profile.city ?? profile.state}`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.03]"
      />
    </div>
  );
}

function Meta({ profile, className }: { profile: AlajoProfileWithMedia; className?: string }) {
  const years = yearsOperating(profile.year_started);
  return (
    <p className={cn("font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint", className)}>
      {CATEGORY_LABELS[profile.business_category]}
      <span className="mx-1.5 text-rule-strong">/</span>
      {profile.city ? `${profile.city}, ` : ""}
      {profile.state}
      {years && (
        <>
          <span className="mx-1.5 text-rule-strong">/</span>
          {years}
        </>
      )}
    </p>
  );
}

/** Full-bleed lead story. One per section at most. */
export function AlajoFeature({
  profile,
  priority = false,
}: {
  profile: AlajoProfileWithMedia;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/alajos/${profile.slug}`}
      className="group grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-14"
    >
      <MediaFrame
        profile={profile}
        priority={priority}
        sizes="(min-width: 768px) 50vw, 100vw"
        className="aspect-[4/3] md:aspect-[5/6]"
      />
      <div className="flex flex-col justify-center">
        <Meta profile={profile} />
        <h3 className="mt-3 font-display text-3xl leading-[1.12] sm:text-4xl">
          {profile.business_name}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">{profile.founder_name}</p>
        <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
          {truncate(profile.current_challenge ?? profile.story, 240)}
        </p>
        <div className="mt-7 flex items-center gap-4">
          <span className="border-b border-ink pb-0.5 text-sm font-medium text-ink transition-colors group-hover:border-terracotta group-hover:text-terracotta">
            Read their story
          </span>
          {profile.requested_amount_ngn ? (
            <span className="text-sm text-ink-faint tabular">
              Looking for {formatNairaCompact(profile.requested_amount_ngn)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/** Standard grid card. */
export function AlajoCard({
  profile,
  priority = false,
}: {
  profile: AlajoProfileWithMedia;
  priority?: boolean;
}) {
  return (
    <Link href={`/alajos/${profile.slug}`} className="group flex flex-col">
      <div className="relative">
        <MediaFrame
          profile={profile}
          priority={priority}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="aspect-[4/3]"
        />
        {profile.status === "featured" && (
          <span className="absolute left-0 top-0 bg-ochre px-2 py-1 font-mono text-2xs uppercase tracking-[0.12em] text-ink">
            Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <Meta profile={profile} />
        <h3 className="mt-2 font-display text-xl leading-snug">{profile.business_name}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
          {truncate(profile.current_challenge ?? profile.story, 130)}
        </p>
        <p className="mt-4 border-t border-rule pt-3 text-xs text-ink-faint">
          {profile.requested_amount_ngn
            ? `Looking for ${formatNairaCompact(profile.requested_amount_ngn)}`
            : "Open to support"}
        </p>
      </div>
    </Link>
  );
}

/** Dense horizontal row for rails and sidebars. */
export function AlajoRow({ profile, index }: { profile: AlajoProfileWithMedia; index?: number }) {
  return (
    <Link href={`/alajos/${profile.slug}`} className="group flex items-start gap-4 py-4">
      {index !== undefined && (
        <span className="w-6 shrink-0 pt-1 font-mono text-xs text-ink-faint tabular">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
      <MediaFrame
        profile={profile}
        sizes="80px"
        className="aspect-square w-16 shrink-0 sm:w-20"
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base leading-snug transition-colors group-hover:text-terracotta">
          {profile.business_name}
        </h3>
        <Meta profile={profile} className="mt-1" />
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">
          {truncate(profile.current_challenge ?? profile.story, 110)}
        </p>
      </div>
    </Link>
  );
}

/** Horizontally scrolling rail on mobile, grid on desktop. */
export function AlajoRail({
  profiles,
  title,
  href,
}: {
  profiles: AlajoProfileWithMedia[];
  title: string;
  href?: string;
}) {
  if (profiles.length === 0) return null;
  return (
    <section aria-labelledby={`rail-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <h2
          id={`rail-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="font-display text-xl"
        >
          {title}
        </h2>
        {href && (
          <Link href={href} className="link-rule shrink-0 text-sm text-ink-soft hover:text-ink">
            See all
          </Link>
        )}
      </div>
      <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pt-6 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
        {profiles.slice(0, 4).map((profile) => (
          <div key={profile.id} className="w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-auto">
            <AlajoCard profile={profile} />
          </div>
        ))}
      </div>
    </section>
  );
}
