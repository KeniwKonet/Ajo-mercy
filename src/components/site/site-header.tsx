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
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex w-full max-w-[84rem] items-center gap-4 rounded-full bg-widget-black p-2 pl-5">
        <Link href="/" className="shrink-0 font-display text-xl tracking-tight text-ivory-text">
          <span>Ajo</span>
          <span className="italic text-lime"> Mercy</span>
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2.5 text-sm font-bold transition-colors",
                  active
                    ? "bg-ivory-text text-widget-black-2"
                    : "text-muted-on-black hover:text-ivory-text",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2.5 lg:flex">
          <AccountNav className="px-2 text-sm font-semibold text-muted-on-black transition-colors hover:text-ivory-text" />
          <Link
            href="/become-an-alajo"
            className="press rounded-full bg-lime px-5 py-2.5 text-sm font-extrabold text-widget-black-2 transition-[filter] hover:brightness-95"
          >
            Join Ajo Mercy
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="ml-auto rounded-full bg-widget-black-2 p-2.5 text-ivory-text lg:hidden"
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
        <div id="mobile-nav" className="mx-auto mt-2 w-full max-w-[84rem] rounded-lg bg-widget-black p-2 lg:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="widget-rule border-b px-4 py-3.5 text-base font-semibold text-ivory-text last:border-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="widget-rule flex flex-col gap-2 border-t p-3">
            <Link
              href="/become-an-alajo"
              className="rounded-full bg-lime px-4 py-3 text-center text-sm font-extrabold text-widget-black-2"
            >
              Join Ajo Mercy
            </Link>
            <AccountNav className="rounded-full bg-widget-black-2 px-4 py-3 text-center text-sm font-semibold text-ivory-text" />
          </div>
        </div>
      )}
    </header>
  );
}
