import Link from "next/link";

/**
 * Two widgets side by side, as the handoff has it: the form in one, a plain
 * statement of the rules in the other. No stock photography and no testimonial
 * carousel — the second panel exists to restate what the platform does and
 * does not do before someone commits to an account.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-[76rem]">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-sm font-extrabold tracking-tight text-ink"
        >
          <span aria-hidden="true" className="size-5 rounded-md bg-lime" />
          <span>
            Ajo<span className="text-orange">Mercy</span>
          </span>
        </Link>

        <div className="mt-8 grid items-start gap-4 lg:grid-cols-[1fr_0.85fr]">
          <main id="main" className="widget p-7 sm:p-10">
            <div className="w-full max-w-md">{children}</div>
          </main>

          <aside className="widget hidden flex-col justify-between p-8 sm:p-10 lg:flex">
            <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-muted-on-black">
              From the Ajo tussle to real impact
            </p>
            <div className="mt-10">
              <p className="text-2xl font-extrabold leading-[1.2] tracking-[-0.02em] text-ivory-text">
                Every business here was read, checked and approved by a person before it appeared.
              </p>
              <ul className="widget-rule mt-9 space-y-4 border-t pt-8">
                {[
                  "Applications are reviewed by hand, in the order they arrive.",
                  "Being selected is not the same as being supported. We confirm first.",
                  "Registering does not guarantee selection or support.",
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-sm leading-relaxed text-muted-on-black">
                    <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-lime" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-10 text-xs text-muted-on-black">
              Woli Arole is the Super Admin of this platform.
            </p>
          </aside>
        </div>

        <p className="mt-6 text-xs text-ink-faint">
          Ajo Mercy does not hold or transfer support funds.
        </p>
      </div>
    </div>
  );
}
