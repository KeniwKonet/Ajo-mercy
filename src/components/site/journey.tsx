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

/** DISCOVER, VERIFY, BACK, AMPLIFY each keep the same accent everywhere. */
const STAGE_ACCENT = ["text-lime", "text-orange", "text-ochre", "text-lime"];

export function JourneyStrip({ className }: { className?: string }) {
  return (
    <ol className={cn("grid gap-4 md:grid-cols-4", className)}>
      {STAGES.map((stage, i) => (
        <li key={stage.n} className="widget card-interactive relative">
          {/* Each stage carries the accent of its own step, so DISCOVER,
              VERIFY, BACK and AMPLIFY are colour-coded consistently. */}
          <span
            className={cn(
              "text-2xs font-extrabold uppercase tracking-[0.08em]",
              STAGE_ACCENT[i] ?? "text-lime",
            )}
          >
            {stage.n} · {stage.actor}
          </span>

          <h3 className="mt-4 text-base font-bold leading-snug tracking-tight text-ivory-text">
            {stage.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-on-black">{stage.body}</p>
        </li>
      ))}
    </ol>
  );
}
