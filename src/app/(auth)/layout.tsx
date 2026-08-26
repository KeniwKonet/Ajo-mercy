import Link from "next/link";

/**
 * Split layout: the form on the left, a plain statement of what the platform
 * does on the right. No stock photography, no testimonial carousel — the point
 * of this panel is to restate the rules before someone commits to an account.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_0.85fr]">
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <Link href="/" className="font-display text-xl tracking-tight">
          <span className="font-semibold text-forest">Ajo</span>
          <span className="italic text-terracotta"> Mercy</span>
        </Link>
        <main id="main" className="flex flex-1 items-center py-12">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <p className="text-xs text-ink-faint">
          Ajo Mercy does not hold or transfer support funds.
        </p>
      </div>

      <aside className="hidden flex-col justify-between bg-forest px-14 py-12 text-paper lg:flex">
        <p className="font-mono text-2xs uppercase tracking-[0.16em] text-paper/50">
          From the Ajo tussle to real impact
        </p>
        <div>
          <p className="font-display text-3xl leading-[1.25]">
            Every business here was read, checked and approved by a person before
            it appeared.
          </p>
          <ul className="mt-10 space-y-4 border-t border-paper/15 pt-8">
            {[
              "Applications are reviewed by hand, in the order they arrive.",
              "Being selected is not the same as being supported. We confirm first.",
              "Registering does not guarantee selection or support.",
            ].map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-relaxed text-paper/70">
                <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-paper/40" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-paper/40">Woli Arole is the Super Admin of this platform.</p>
      </aside>
    </div>
  );
}
