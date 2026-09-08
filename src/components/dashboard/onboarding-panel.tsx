import { STAGES } from "@/components/site/journey";

/**
 * The editorial panel beside the application form.
 *
 * A long form is intimidating, and the thing that makes it bearable is knowing
 * why somebody is asking. So the panel holds the emotional framing on the left
 * while the form does the work on the right, and it restates the two promises
 * that matter most to an applicant: it is free, and nothing is published until
 * a person has read it.
 *
 * Deep forest rather than the cream workspace, because this is a moment in the
 * product rather than a page of it.
 */
export function OnboardingPanel() {
  return (
    <aside className="relative hidden overflow-hidden rounded-xl bg-widget-black p-9 text-ivory-text lg:flex lg:flex-col lg:justify-between">

      <div className="relative">
        <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-ochre">Become an Alajo</p>
        <h2 className="mt-6 font-display text-4xl leading-[1.06] text-ivory-text">
          Tell us what you are building.
        </h2>
        <p className="mt-5 max-w-sm text-base leading-relaxed text-ivory-text/75">
          Your story, your business and what is standing in the way. It takes one sitting, it saves
          as you go, and it costs nothing.
        </p>
      </div>

      {/* What happens after they press send, so the wait is not a mystery. */}
      <div className="relative mt-12">
        <p className="eyebrow text-ivory-text/50">What happens next</p>
        <ol className="mt-4 space-y-4">
          {STAGES.slice(1, 4).map((stage) => (
            <li key={stage.n} className="flex gap-4">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-paper/12 text-2xs font-bold text-ochre">
                {stage.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-ivory-text">{stage.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ivory-text/60">{stage.actor}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-9 border-t border-paper/15 pt-5 text-xs leading-relaxed text-ivory-text/60">
          Nothing you write is published until a person has read it. Applying does not guarantee
          selection or support, and Ajo Mercy never holds or transfers money.
        </p>
      </div>
    </aside>
  );
}
