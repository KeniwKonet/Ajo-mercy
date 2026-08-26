"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/primitives";
import { AccountNav } from "@/components/site/account-nav";

const NAV = [
  { href: "/alajos", label: "Businesses" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/brands", label: "For brands" },
  { href: "/impact", label: "Impact" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[84rem] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="shrink-0 font-display text-xl tracking-tight">
          <span className="font-semibold text-forest">Ajo</span>
          <span className="italic text-terracotta"> Mercy</span>
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-7 lg:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "link-rule text-sm transition-colors",
                  active ? "font-medium text-ink" : "text-ink-soft hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <AccountNav className="link-rule text-sm text-ink-soft transition-colors hover:text-ink" />
          <Link
            href="/become-an-alajo"
            className="rounded-sm bg-forest px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-forest-deep"
          >
            Become an Alajo
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="ml-auto rounded-sm border border-rule-strong p-2 lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
            {open ? (
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-rule bg-paper lg:hidden">
          <nav aria-label="Main" className="flex flex-col px-5 py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-rule py-3.5 text-base text-ink last:border-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-rule px-5 py-4">
            <Link
              href="/become-an-alajo"
              className="rounded-sm bg-forest px-4 py-3 text-center text-sm font-medium text-paper"
            >
              Become an Alajo
            </Link>
            <AccountNav className="rounded-sm border border-rule-strong px-4 py-3 text-center text-sm font-medium text-ink" />
          </div>
        </div>
      )}
    </header>
  );
}
