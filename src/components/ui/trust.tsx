import type { ReactNode } from "react";
import { cn } from "@/components/ui/primitives";

/**
 * The trust and status layer.
 *
 * Verification is the product's central claim, so it gets a real treatment
 * rather than a small green word. Status is the other half: a reviewer, an
 * applicant and a supporter all need to know where something stands, and each
 * of them reads a different screen.
 *
 * Two rules hold across everything here:
 *
 *   1. Never state through colour alone. Every badge carries a shape and a
 *      word as well as a hue, because roughly one man in twelve cannot tell
 *      the terracotta from the forest.
 *   2. Never claim a check that did not happen. The verification panel lists
 *      only what the review team actually did.
 */

/* ------------------------------------------------------------------ marks -- */

function TickIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" className={cn("size-3", className)} aria-hidden="true">
      <path
        d="M3 7.4 5.8 10 11 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The compact verification mark, for cards and listing rows.
 *
 * A business carries this only once its application has been approved by a
 * person, which is the single thing the mark asserts.
 */
export function VerifiedMark({ className }: { className?: string }) {
  return (
    <span className={cn("verified-mark", className)}>
      <TickIcon />
      Verified
    </span>
  );
}

/**
 * The expanded version, for a business profile.
 *
 * Each line names something the team genuinely does before a profile goes
 * live. If a check is ever added or dropped, this list has to change with it.
 */
export function VerificationPanel({
  approvedOn,
  className,
}: {
  approvedOn?: string | null;
  className?: string;
}) {
  const checks = [
    "A person read the application end to end",
    "Identity and business documents were opened and checked",
    "The story is the owner's own words, not copied from another profile",
  ];

  return (
    <section
      aria-labelledby="verification-heading"
      className={cn("rounded-lg border border-forest/20 bg-forest-wash p-6 sm:p-7", className)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-8 place-items-center rounded-sm bg-forest text-paper">
          <TickIcon className="size-4" />
        </span>
        <h2 id="verification-heading" className="text-base font-bold tracking-tight text-forest">
          Verified business
        </h2>
      </div>

      <ul className="mt-5 space-y-2.5">
        {checks.map((check) => (
          <li key={check} className="flex gap-2.5 text-sm leading-relaxed text-forest">
            <TickIcon className="mt-1 shrink-0 text-forest-soft" />
            <span>{check}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 border-t border-forest/15 pt-4 text-xs leading-relaxed text-forest/80">
        Verification says this business is real and the story is theirs.
        {approvedOn ? ` Reviewed ${approvedOn}.` : ""} It is not a recommendation, a rating, or any
        promise about what happens next.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- status -- */

export type StatusKind =
  | "draft"
  | "submitted"
  | "review"
  | "needs_info"
  | "approved"
  | "rejected"
  | "selected"
  | "confirmed"
  | "announced"
  | "suspended";

/**
 * One vocabulary for state, used on every surface.
 *
 * `meaning` is the part that matters. A status word on its own makes someone
 * guess; the sentence tells them what is true and what happens next. The
 * selected and confirmed entries are written to keep those two apart, which is
 * the most important distinction in the product.
 */
const STATUS: Record<
  StatusKind,
  { label: string; meaning: string; dot: string; text: string; bg: string; border: string }
> = {
  draft: {
    label: "Draft",
    meaning: "Started but not sent. Only you can see it.",
    dot: "bg-ink-faint",
    text: "text-ink-soft",
    bg: "bg-paper-deep",
    border: "border-rule-strong",
  },
  submitted: {
    label: "Submitted",
    meaning: "Received and waiting for a reviewer. Nothing is needed from you.",
    dot: "bg-info",
    text: "text-info",
    bg: "bg-info-wash",
    border: "border-info/25",
  },
  review: {
    label: "Under review",
    meaning: "A person is reading it now.",
    dot: "bg-info",
    text: "text-info",
    bg: "bg-info-wash",
    border: "border-info/25",
  },
  needs_info: {
    label: "Needs information",
    meaning: "The team has asked you for something before they can continue.",
    dot: "bg-terracotta",
    text: "text-terracotta-deep",
    bg: "bg-terracotta-wash",
    border: "border-terracotta/30",
  },
  approved: {
    label: "Approved",
    meaning: "Checked and live. The profile is public.",
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success-wash",
    border: "border-success/25",
  },
  rejected: {
    label: "Not approved",
    meaning: "The team could not verify this. The reason was sent by email.",
    dot: "bg-danger",
    text: "text-danger",
    bg: "bg-danger-wash",
    border: "border-danger/25",
  },
  selected: {
    label: "Under consideration",
    meaning: "Someone has chosen this business to look at. It is not support yet.",
    dot: "bg-ochre",
    text: "text-ink",
    bg: "bg-ochre-wash",
    border: "border-ochre/45",
  },
  confirmed: {
    label: "Support confirmed",
    meaning: "The team has confirmed support is real and told the business.",
    dot: "bg-forest",
    text: "text-forest",
    bg: "bg-forest-wash",
    border: "border-forest/25",
  },
  announced: {
    label: "Announced",
    meaning: "Confirmed and shared publicly.",
    dot: "bg-forest",
    text: "text-forest",
    bg: "bg-forest-wash",
    border: "border-forest/25",
  },
  suspended: {
    label: "Suspended",
    meaning: "Hidden from the public while the team looks into something.",
    dot: "bg-danger",
    text: "text-danger",
    bg: "bg-danger-wash",
    border: "border-danger/25",
  },
};

export function StatusBadge({
  kind,
  size = "md",
  className,
}: {
  kind: StatusKind;
  size?: "sm" | "md";
  className?: string;
}) {
  const s = STATUS[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
        s.bg,
        s.text,
        s.border,
        className,
      )}
    >
      {/* The dot is a second channel, so the badge still reads without colour. */}
      <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} aria-hidden="true" />
      {s.label}
    </span>
  );
}

/** Badge plus the sentence explaining it. Used wherever someone is waiting. */
export function StatusExplainer({ kind, className }: { kind: StatusKind; className?: string }) {
  const s = STATUS[kind];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      <StatusBadge kind={kind} />
      <p className="text-sm text-ink-soft">{s.meaning}</p>
    </div>
  );
}

export function statusMeaning(kind: StatusKind): string {
  return STATUS[kind].meaning;
}

/* --------------------------------------------------------------- headers -- */

/** The standard page opening: what this is, and why it matters. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-6", className)}>
      <div className="max-w-2xl">
        <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
        {/* The marker sits under the title, not floating above it in tiny caps. */}
        {eyebrow && (
          <p className="eyebrow mt-3 flex items-center gap-2.5">
            <span aria-hidden="true" className="h-px w-6 bg-rule-strong" />
            {eyebrow}
          </p>
        )}
        {lead && <p className="mt-5 text-lg leading-relaxed text-ink-soft">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  lead,
  aside,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-rule pb-4",
        className,
      )}
    >
      <div className="max-w-xl">
        <h2 className="text-xl sm:text-2xl">{title}</h2>
        {lead && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{lead}</p>}
      </div>
      {aside && <div className="shrink-0 text-sm text-ink-soft">{aside}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ error state -- */

/**
 * A failure that is not an empty result.
 *
 * The distinction matters most in admin, where a broken query and a clear
 * queue look identical unless the page says otherwise.
 */
export function ErrorState({
  title,
  description,
  action,
  reference,
  className,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  reference?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-danger/30 bg-danger-wash p-6 sm:p-8", className)}>
      <h3 className="text-base font-bold text-danger">{title}</h3>
      <div className="mt-2.5 max-w-prose text-sm leading-relaxed text-ink-soft">{description}</div>
      {action && <div className="mt-5 flex flex-wrap gap-3">{action}</div>}
      {reference && (
        <p className="mt-5 border-t border-danger/15 pt-3 font-mono text-2xs text-ink-faint">
          Reference {reference}
        </p>
      )}
    </div>
  );
}
