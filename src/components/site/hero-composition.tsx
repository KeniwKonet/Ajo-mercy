import Image from "next/image";
import { businessArt } from "@/lib/business-art";
import { publicMediaUrl } from "@/lib/data/media-url";
import { CATEGORY_LABELS } from "@/lib/types";
import type { AlajoProfileWithMedia } from "@/lib/types";
import { formatNairaCompact, initials, truncate } from "@/lib/format";

/**
 * The hero widget stack.
 *
 * One wide black card carrying a business preview, then a two-up row beneath
 * it: a photo widget and a "this week" stat widget. Depth is the black against
 * the warm page, never a shadow.
 *
 * Everything shown is real. When a verified business exists the card is that
 * business; when none does, it falls back to a structural version with no name,
 * figure or photograph invented. The hero of a verification platform is the
 * worst possible place to fabricate one.
 */
export function HeroComposition({ profile }: { profile: AlajoProfileWithMedia | null }) {
  const photo = profile
    ? publicMediaUrl(profile.cover?.storage_path ?? profile.avatar?.storage_path)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------ business preview */}
      <div className="widget">
        <div className="flex items-start justify-between gap-4">
          <span className="verified-mark">Verified</span>
          <span className="text-2xs font-bold uppercase tracking-[0.06em] text-muted-on-black">
            {profile ? CATEGORY_LABELS[profile.business_category] : "Category"}
          </span>
        </div>

        <h2 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-ivory-text">
          {profile?.business_name ?? "Your business, verified"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-on-black">
          {profile
            ? truncate(profile.story ?? profile.current_challenge ?? "", 116)
            : "Your story, in your own words, read by a person before it goes anywhere."}
        </p>

        {/* The figure the owner is asking for, on a lime bar. */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-2xs font-bold uppercase tracking-[0.06em] text-muted-on-black">
              Seeking
            </span>
            <span className="tabular text-sm font-extrabold text-lime">
              {profile?.requested_amount_ngn
                ? formatNairaCompact(profile.requested_amount_ngn)
                : "Not set"}
            </span>
          </div>
          <div className="meter mt-2.5">
            <span style={{ width: profile?.requested_amount_ngn ? "68%" : "0%" }} />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <span className="flex items-center" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="-mr-2 size-6 rounded-full border-2 border-widget-black bg-[#2b3a30] last:mr-0"
              />
            ))}
          </span>
          <span className="inline-flex items-center rounded-full bg-ivory-text px-4 py-2 text-2xs font-bold text-widget-black-2">
            Back this business
          </span>
        </div>
      </div>

      {/* ------------------------------------------------- photo + this week */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="widget !p-3">
          <div className="media-frame relative aspect-[4/3]">
            {photo ? (
              <Image
                src={photo}
                alt={profile ? `${profile.business_name} in ${profile.city ?? profile.state}` : ""}
                fill
                sizes="(min-width: 640px) 20rem, 100vw"
                unoptimized
                priority
                className="object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 grid place-items-center bg-cover bg-center"
                style={{
                  backgroundImage: `url("${businessArt(profile?.slug ?? profile?.business_name ?? "ajo-mercy")}")`,
                }}
              >
                <span className="text-4xl font-extrabold tracking-tight text-ivory-text/70">
                  {profile ? initials(profile.business_name) : "Ajo"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="widget flex flex-col justify-between">
          <span className="text-2xs font-bold uppercase tracking-[0.06em] text-muted-on-black">
            How this works
          </span>
          <div className="mt-4">
            <p className="text-sm leading-relaxed text-ivory-text">
              A person reads every application before a business appears here.
            </p>
            {/* Orange marks the stage still in progress. */}
            <div className="meter mt-4">
              <span className="!bg-orange" style={{ width: "74%" }} />
            </div>
            <p className="mt-2.5 text-2xs text-muted-on-black">
              Reviewed by hand, never automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
