import Image from "next/image";
import Link from "next/link";
import { publicMediaUrl } from "@/lib/data/media-url";
import { CATEGORY_LABELS } from "@/lib/types";
import type { AlajoProfileWithMedia } from "@/lib/types";
import { formatNairaCompact, initials, truncate } from "@/lib/format";

/**
 * The register.
 *
 * An ajo is a contribution book before it is a platform, so businesses are
 * entries in a ruled ledger rather than tiles in a grid. Entry numbers hang in
 * the margin, figures sit in a tabular column so they can be read down the
 * page, and the only image is a small photograph tipped into the row the way
 * one would be pasted into a real book.
 *
 * Deliberately absent: any count of how many people have selected a business.
 * Publishing that would turn the register into a leaderboard.
 */

/** Register numbers are positional, not identifiers. The slug is the identity. */
function entryNumber(index: number): string {
  return `ALJ-${String(index + 1).padStart(4, "0")}`;
}

function Thumb({ profile }: { profile: AlajoProfileWithMedia }) {
  const src = publicMediaUrl(profile.avatar?.storage_path ?? profile.cover?.storage_path);

  if (!src) {
    return (
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center border border-rule bg-paper-deep font-display text-sm text-ink-faint"
      >
        {initials(profile.business_name)}
      </span>
    );
  }

  return (
    <span className="relative size-11 shrink-0 overflow-hidden border border-rule bg-paper-deep">
      <Image
        src={src}
        alt=""
        fill
        sizes="44px"
        unoptimized
        className="object-cover"
      />
    </span>
  );
}

/* The column rules are what make a ledger a ledger. They run through the head
   and every entry at the same offsets, so the eye can read straight down a
   column. Hairlines only: they should register as ruling, not as a table. */
const COLS = "md:grid md:grid-cols-[5.5rem_minmax(0,1fr)_10rem_8rem]";
const RULE = "md:border-l md:border-rule md:pl-4";

export function LedgerHead() {
  return (
    <div className={`ledger-head hidden items-end border-b border-ink pb-2 pl-3 ${COLS}`}>
      <span>Entry</span>
      <span className={RULE}>Business</span>
      <span className={RULE}>Where</span>
      <span className={`${RULE} text-right`}>Seeking</span>
    </div>
  );
}

export function LedgerEntry({
  profile,
  index,
}: {
  profile: AlajoProfileWithMedia;
  index: number;
}) {
  const where = [profile.city, profile.state].filter(Boolean).join(", ");
  const line = truncate(profile.current_challenge ?? profile.story ?? "", 120);

  return (
    <Link
      href={`/alajos/${profile.slug}`}
      className={`ledger-row group grid gap-y-2 border-b border-rule py-4 pl-3 pr-3 md:items-stretch ${COLS}`}
    >
      <span className="entry-no md:pt-1.5">{entryNumber(index)}</span>

      <span className={`flex min-w-0 gap-3.5 ${RULE}`}>
        <Thumb profile={profile} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="font-display text-lg leading-tight text-ink group-hover:text-terracotta">
              {profile.business_name}
            </span>
            {profile.status === "featured" && (
              <span className="border border-forest px-1.5 py-px font-mono text-2xs uppercase tracking-[0.08em] text-forest">
                Featured
              </span>
            )}
          </span>
          <span className="mt-0.5 block font-mono text-2xs text-ink-faint">
            {profile.founder_name}
            <span className="mx-1.5 text-rule-strong">/</span>
            {CATEGORY_LABELS[profile.business_category]}
          </span>
          {line && (
            <span className="mt-1.5 block max-w-prose text-sm leading-relaxed text-ink-soft">
              {line}
            </span>
          )}
        </span>
      </span>

      <span className={`pl-[3.9rem] text-sm text-ink-soft ${RULE} md:pt-1`}>{where || "—"}</span>

      {/* Figures align down the column, which is the whole point of a ledger. */}
      <span
        className={`tabular pl-[3.9rem] font-mono text-sm text-ink ${RULE} md:pt-1 md:text-right`}
      >
        {profile.requested_amount_ngn ? formatNairaCompact(profile.requested_amount_ngn) : "—"}
      </span>
    </Link>
  );
}

export function LedgerRegister({
  profiles,
  startIndex = 0,
}: {
  profiles: AlajoProfileWithMedia[];
  startIndex?: number;
}) {
  return (
    <div>
      <LedgerHead />
      {profiles.map((profile, i) => (
        <LedgerEntry key={profile.id} profile={profile} index={startIndex + i} />
      ))}
    </div>
  );
}

/**
 * Hand tally, five to a gate.
 *
 * Used only where a number is small enough that a person would genuinely count
 * it. Above the cap it falls back to the figure, because drawing ninety strokes
 * is a decoration pretending to be information.
 */
export function Tally({ count, max = 25 }: { count: number; max?: number }) {
  if (count <= 0) {
    return <span className="font-mono text-sm text-ink-faint">none yet</span>;
  }
  if (count > max) {
    return <span className="tabular font-mono text-sm text-ink">{count}</span>;
  }

  const gates = Math.floor(count / 5);
  const remainder = count % 5;

  return (
    <span className="tally" role="img" aria-label={`${count}`}>
      {Array.from({ length: gates }, (_, g) => (
        <span key={`gate-${g}`} className="tally">
          <i />
          <i />
          <i />
          <i />
          <i data-gate="true" />
        </span>
      ))}
      {remainder > 0 && (
        <span className="tally">
          {Array.from({ length: remainder }, (_, r) => (
            <i key={`mark-${r}`} />
          ))}
        </span>
      )}
    </span>
  );
}

/**
 * The head of a ledger page: what book this is, and which page you are on.
 * Everything here is a fact about the page itself, never an invented metric.
 */
export function FolioHead({
  book,
  folio,
  note,
}: {
  book: string;
  folio?: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink pb-2">
      <span className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-soft">{book}</span>
      {note && <span className="font-mono text-2xs text-ink-faint">{note}</span>}
      {folio && <span className="font-mono text-2xs text-ink-faint">{folio}</span>}
    </div>
  );
}
