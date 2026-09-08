import Image from "next/image";
import { publicMediaUrl } from "@/lib/data/media-url";
import { CATEGORY_LABELS } from "@/lib/types";
import type { AlajoProfileWithMedia } from "@/lib/types";
import { initials, truncate } from "@/lib/format";

/**
 * The hero composition.
 *
 * Layered rather than a single flat image: a photograph behind, a profile card
 * lifted off it, and floating labels marking the three things the platform
 * actually asserts about a business. It is the product's own object, shown at
 * rest, so the argument reads with the words removed.
 *
 * Everything here is real. The card shows a genuine verified business when one
 * exists; when none does yet, it falls back to a structural version with no
 * name, figure or photograph invented. Putting a made-up business in the hero
 * of a verification platform would be the worst possible place to fabricate.
 */
export function HeroComposition({ profile }: { profile: AlajoProfileWithMedia | null }) {
  const photo = profile
    ? publicMediaUrl(profile.cover?.storage_path ?? profile.avatar?.storage_path)
    : null;

  return (
    <div className="relative mx-auto w-full max-w-[30rem] lg:max-w-none">
      {/* Warm wash behind the stack, giving the cards something to lift from. */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-2xl bg-surface-warm/60 blur-[2px]"
      />

      {/* The photograph, tilted slightly so the stack reads as physical. */}
      <div className="media-frame relative aspect-[4/5] rotate-[-2deg] rounded-xl shadow-lg sm:aspect-[4/4.4]">
        {photo ? (
          <Image
            src={photo}
            alt={
              profile
                ? `${profile.business_name} in ${profile.city ?? profile.state}`
                : ""
            }
            fill
            sizes="(min-width: 1024px) 30rem, 100vw"
            unoptimized
            priority
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-surface-soft">
            <span className="font-display text-5xl text-rule-strong">
              {profile ? initials(profile.business_name) : "Ajo"}
            </span>
          </div>
        )}
      </div>

      {/* The profile card, overlapping the photograph's lower edge. */}
      <div className="surface relative -mt-20 ml-4 mr-8 rotate-[1deg] p-5 shadow-xl sm:-mt-24 sm:p-6">
        <span className="verified-mark">
          <svg viewBox="0 0 14 14" className="size-3" aria-hidden="true">
            <path
              d="M3 7.4 5.8 10 11 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Verified business
        </span>

        <h2 className="mt-3.5 text-xl font-bold leading-snug tracking-tight">
          {profile?.business_name ?? "Your business, verified"}
        </h2>
        <p className="mt-1 text-sm text-ink-faint">
          {profile
            ? `${CATEGORY_LABELS[profile.business_category]} · ${[profile.city, profile.state].filter(Boolean).join(", ")}`
            : "Category · Where you are"}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {profile
            ? truncate(profile.story ?? profile.current_challenge ?? "", 120)
            : "Your story, in your own words, read by a person before it goes anywhere."}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-sm font-semibold text-ink">
            {profile ? profile.founder_name : "The owner"}
          </span>
          <span className="inline-flex h-9 items-center rounded-full bg-terracotta px-4 text-xs font-semibold text-white">
            Back this business
          </span>
        </div>
      </div>

      {/* Floating labels: the three claims, and nothing more than that. */}
      <span className="float-chip absolute -left-3 top-[22%] hidden sm:inline-flex">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-forest" />
        Reviewed by a person
      </span>
      <span className="float-chip absolute -right-2 top-[8%] hidden sm:inline-flex">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-ochre" />
        Real story
      </span>
      <span className="float-chip absolute -right-4 bottom-[26%] hidden lg:inline-flex">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-terracotta" />
        We never hold the money
      </span>
    </div>
  );
}
