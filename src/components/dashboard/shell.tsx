"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/components/ui/primitives";
import { signOutAction } from "@/app/(auth)/actions";

export interface NavItem {
  href: string;
  label: string;
  /** Rendered as a count chip; omit or pass 0 to hide. */
  badge?: number;
  exact?: boolean;
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
}

/**
 * Shared shell for every signed-in area. The sidebar collapses to a horizontal
 * scroller on mobile rather than hiding behind a menu, because the dashboard
 * sections are few and switching between them is the main thing people do here.
 */
export function DashboardShell({
  groups,
  userName,
  roleLabel,
  children,
  homeHref = "/",
}: {
  groups: NavGroup[];
  userName: string;
  roleLabel: string;
  children: ReactNode;
  homeHref?: string;
}) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="widget !rounded-none !p-0 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:!m-3 lg:!rounded-3xl lg:!p-2">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <Link href={homeHref} className="font-display text-xl tracking-tight text-paper">
            <span>Ajo</span>
            <span className="italic text-lime"> Mercy</span>
          </Link>
          <p className="mt-0 text-2xs font-bold uppercase tracking-[0.09em] text-muted-on-black lg:mt-1">
            {roleLabel}
          </p>
        </div>

        <nav
          aria-label="Dashboard"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-6"
        >
          {groups.map((group, groupIndex) => (
            <div key={group.heading ?? groupIndex} className="flex gap-1 lg:mt-5 lg:flex-col lg:first:mt-0">
              {group.heading && (
                <p className="hidden px-3 pb-2 pt-1 text-2xs font-bold uppercase tracking-[0.09em] text-muted-on-black lg:block">
                  {group.heading}
                </p>
              )}
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-sm px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-lime font-extrabold text-widget-black-2"
                        : "text-muted-on-black hover:bg-widget-black-2 hover:text-ivory-text",
                    )}
                  >
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-2xs font-semibold tabular",
                          active ? "bg-widget-black-2 text-lime" : "bg-orange text-widget-black-2",
                        )}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="widget-rule hidden border-t px-5 py-4 lg:block">
          <p className="truncate text-sm font-semibold text-ivory-text">{userName}</p>
          <form
            action={signOutAction}
            onSubmit={() => setSigningOut(true)}
            className="mt-2"
          >
            <button
              type="submit"
              disabled={signingOut}
              className="link-rule text-xs text-muted-on-black hover:text-ivory-text disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </form>
        </div>
      </aside>

      <main id="main" className="min-w-0">
        {children}
      </main>
    </div>
  );
}

/** Consistent page framing inside the shell. */
export function DashboardPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-xl text-sm text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="pt-7">{children}</div>
    </div>
  );
}
