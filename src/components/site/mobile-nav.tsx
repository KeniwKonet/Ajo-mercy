"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/primitives";

/**
 * Bottom navigation, phones only.
 *
 * Most people reach Ajo Mercy from a shared link on a phone, and the four
 * things they do are all one tap from here rather than behind a menu. It is
 * fixed to the bottom because that is where a thumb rests, and it carries a
 * safe-area inset so it clears the home indicator on an iPhone.
 *
 * Deliberately four items, not six. A bottom bar that holds every route is a
 * menu wearing a costume.
 */
const ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <path d="M3 9l7-6 7 6v8a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z" />
    ),
  },
  {
    href: "/alajos",
    label: "Discover",
    icon: (
      <>
        <circle cx="9" cy="9" r="5.5" />
        <path d="M13 13l4 4" />
      </>
    ),
  },
  {
    href: "/how-it-works",
    label: "How it works",
    icon: (
      <>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 14v-4M10 6.5v.01" />
      </>
    ),
  },
  {
    href: "/become-an-alajo",
    label: "Apply",
    icon: (
      <>
        <circle cx="10" cy="7" r="3.2" />
        <path d="M4 17c0-3.2 2.7-5 6-5s6 1.8 6 5" />
      </>
    ),
  },
];

export function MobileNav() {
  const pathname = usePathname();

  // The bar belongs to the public site. Private areas have their own shell,
  // and stacking two navigations would be worse than none.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return null;
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-panel-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-2xs font-semibold transition-colors",
                  active ? "text-ink" : "text-ink-faint",
                )}
              >
                <svg
                  viewBox="0 0 20 20"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {item.icon}
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
