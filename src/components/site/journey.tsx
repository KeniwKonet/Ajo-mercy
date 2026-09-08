import { cn } from "@/components/ui/primitives";

/**
 * Discover, verify, back, amplify.
 *
 * The product is a sequence, and the sequence is the thing most people fail to
 * understand from a paragraph. So it is drawn: four stages on a single line,
 * joined by a connector, each one saying who acts and what they are told.
 *
 * The fourth stage is written carefully. Selecting a business is not support,
 * and a business hears nothing definite until a person on the team confirms
 * it. That distinction is the product's most important promise, so it appears
 * here rather than being left to the small print.
 */

export type Stage = {
  n: string;
  title: string;
  body: string;
  actor: string;
};

export const STAGES: Stage[] = [
  {
    n: "01",
    title: "A business steps forward",
    actor: "The owner",
    body: "They tell us what they run, what they are building, and what is standing in the way. Applying is free and takes one sitting.",
  },
  {
    n: "02",
    title: "A person verifies it",
    actor: "The review team",
    body: "Woli Arole and the reviewers read every application and open every document by hand. Nothing goes live automatically.",
  },
  {
    n: "03",
    title: "People discover it",
    actor: "Supporters and brands",
    body: "Verified businesses appear publicly with their own story. Anyone can read them; approved supporters can choose the ones they want to back.",
  },
  {
    n: "04",
    title: "The story moves forward",
    actor: "The team, again",
    body: "A choice is not a promise. The team confirms with both sides before the business is told anything is real, and only then can it be announced.",
  },
];

export function JourneyStrip({ className }: { className?: string }) {
  return (
    <ol className={cn("grid gap-4 md:grid-cols-4", className)}>
      {STAGES.map((stage, i) => (
        <li key={stage.n} className="surface card-interactive relative p-6 sm:p-7">
          <span className="grid size-9 place-items-center rounded-full bg-surface-green text-sm font-bold text-forest">
            {stage.n}
          </span>

          <h3 className="mt-4 text-base font-bold leading-snug tracking-tight">{stage.title}</h3>
          <p className="eyebrow mt-1.5">{stage.actor}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{stage.body}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * The hero's visual argument.
 *
 * Rather than a stock photograph, the hero shows the product's own objects: an
 * application becoming a verified profile, then being chosen, then being
 * confirmed. It should still read with the words removed.
 *
 * Everything in it is structural. No business name, figure or photograph is
 * invented, because inventing one here would be inventing a business.
 */
export function JourneyDiagram({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      {/* Stage 1: the application */}
      <div className="rounded-lg border border-rule bg-card p-5 shadow-lift">
        <p className="eyebrow">Application</p>
        <div className="mt-3 space-y-2">
          <span className="block h-2 w-2/3 rounded-full bg-paper-deep" />
          <span className="block h-2 w-full rounded-full bg-paper-deep" />
          <span className="block h-2 w-4/5 rounded-full bg-paper-deep" />
        </div>
        <div className="mt-4 flex gap-2">
          <span className="h-8 w-8 rounded-sm bg-paper-deep" />
          <span className="h-8 w-8 rounded-sm bg-paper-deep" />
          <span className="h-8 w-8 rounded-sm bg-paper-deep" />
        </div>
      </div>

      <span className="connector mx-auto block h-6 w-px [background-image:linear-gradient(to_bottom,var(--color-rule-strong)_0_6px,transparent_6px_12px)] [background-size:1px_12px]" />

      {/* Stage 2: verified, and now public */}
      <div className="ml-6 rounded-lg border border-forest/25 bg-forest-wash p-5 sm:ml-10">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-forest">Verified profile</p>
          <span className="grid size-6 place-items-center rounded-sm bg-forest text-paper">
            <svg viewBox="0 0 14 14" className="size-3">
              <path
                d="M3 7.4 5.8 10 11 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <div className="mt-3 flex gap-3">
          <span className="size-12 shrink-0 rounded-sm bg-forest/15" />
          <div className="flex-1 space-y-2 pt-1">
            <span className="block h-2.5 w-3/5 rounded-full bg-forest/25" />
            <span className="block h-2 w-2/5 rounded-full bg-forest/15" />
          </div>
        </div>
      </div>

      <span className="connector mx-auto block h-6 w-px [background-image:linear-gradient(to_bottom,var(--color-rule-strong)_0_6px,transparent_6px_12px)] [background-size:1px_12px]" />

      {/* Stage 3 and 4, side by side: the choice, then the confirmation that
          the choice is deliberately not the same as. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-ochre/50 bg-ochre-wash p-4">
          <p className="eyebrow text-ink">Chosen</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            Under consideration. Not support yet.
          </p>
        </div>
        <div className="rounded-lg border border-forest/25 bg-forest p-4 text-paper">
          <p className="eyebrow text-ochre">Confirmed</p>
          <p className="mt-1.5 text-xs leading-relaxed text-paper/75">
            A person checks, then the business is told.
          </p>
        </div>
      </div>
    </div>
  );
}
