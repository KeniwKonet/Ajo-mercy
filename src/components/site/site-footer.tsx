import Link from "next/link";

const COLUMNS: Array<{ heading: string; links: Array<{ href: string; label: string }> }> = [
  {
    heading: "Discover",
    links: [
      { href: "/alajos", label: "All businesses" },
      { href: "/impact", label: "Impact" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    heading: "Take part",
    links: [
      { href: "/become-an-alajo", label: "Become an Alajo" },
      { href: "/support", label: "Support a business" },
      { href: "/brands", label: "For brands" },
    ],
  },
  {
    heading: "Ajo Mercy",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule bg-widget-black-2">
      <div className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <p className="font-display text-2xl">
              <span className="font-semibold text-lime">Ajo</span>
              <span className="italic text-orange"> Mercy</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              A conversation about Ajo turned into a queue of people wanting to help and no way to
              organise it. This is that missing piece: verified businesses, reviewed by hand, matched
              with people and brands who want to back them.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                {column.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="link-rule text-sm text-ink-soft hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-rule pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-ink-faint">
            Ajo Mercy is a discovery, verification and coordination platform. We do not hold, custody,
            escrow or transfer support funds, and registering does not guarantee selection or support.
            Nobody from Ajo Mercy will ever ask you for a fee to be considered.
          </p>
          <p className="mt-4 text-xs text-ink-faint">
            © {new Date().getFullYear()} Ajo Mercy. Built in Nigeria.
          </p>
        </div>
      </div>
    </footer>
  );
}
