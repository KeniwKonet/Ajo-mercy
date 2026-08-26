"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/primitives";

/**
 * Floating switcher for comparing the design explorations side by side.
 * These routes are blocked in production by the middleware, so this bar never
 * reaches a real visitor.
 */
export function DesignSwitcher({
  base,
  versions,
}: {
  base: "/designs" | "/admin/designs";
  versions: Array<{ slug: string; name: string; note: string }>;
}) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2">
      <div className="flex items-stretch gap-px overflow-hidden rounded-sm border border-ink/15 bg-ink/90 text-paper shadow-panel backdrop-blur">
        <span className="hidden shrink-0 items-center px-3.5 font-mono text-2xs uppercase tracking-[0.14em] text-paper/50 sm:flex">
          {base === "/designs" ? "Landing" : "Dashboard"}
        </span>
        {versions.map((version) => {
          const href = `${base}/${version.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={version.slug}
              href={href}
              title={version.note}
              className={cn(
                "flex min-w-0 flex-1 flex-col justify-center px-3 py-2 transition-colors",
                active ? "bg-paper text-ink" : "hover:bg-paper/10",
              )}
            >
              <span className="font-mono text-2xs uppercase tracking-[0.1em] opacity-60">
                {version.slug}
              </span>
              <span className="truncate text-xs font-medium">{version.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
