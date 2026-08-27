import { Skeleton } from "@/components/ui/primitives";

/**
 * Loading states.
 *
 * These exist so a navigation never looks like nothing happened. Next streams
 * a route's shell immediately and fills it in when the data lands, but only if
 * a loading file is present. Without one the browser sits on the previous page
 * with no feedback, which reads as a broken link on a slow connection.
 *
 * Each skeleton mirrors the shape of the page it stands in for, so the layout
 * does not jump when the real content replaces it. They are aria-hidden: a
 * screen reader should hear the finished page, not a description of grey boxes.
 */

/** A ruled register, matching the ledger rows on the listing and home page. */
export function LedgerSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <div className="hidden border-b border-ink pb-2 md:grid md:grid-cols-[5.5rem_minmax(0,1fr)_10rem_8rem]">
        {["3rem", "5rem", "3.5rem", "4rem"].map((w, i) => (
          <Skeleton key={i} className="h-2.5" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="grid gap-x-4 gap-y-3 border-b border-rule py-4 md:grid-cols-[5.5rem_minmax(0,1fr)_10rem_8rem]"
          // A stagger stops five identical bars pulsing in lockstep, which
          // reads as a frozen pattern rather than activity.
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <Skeleton className="h-2.5 w-14" />
          <div className="flex gap-3.5">
            <Skeleton className="size-11 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-2.5 w-1/3" />
              <Skeleton className="h-2.5 w-3/4" />
            </div>
          </div>
          <Skeleton className="hidden h-2.5 w-24 md:block" />
          <Skeleton className="hidden h-2.5 w-16 justify-self-end md:block" />
        </div>
      ))}
    </div>
  );
}

/** A dense admin table. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-hidden="true" className="border border-rule">
      <div className="flex gap-4 border-b border-rule bg-paper-warm px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b border-rule px-4 py-3.5 last:border-b-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-3 flex-1" style={{ animationDelay: `${(r * cols + c) * 25}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A page heading plus body, for detail and form routes. */
export function PageSkeleton({ withRail = false }: { withRail?: boolean }) {
  return (
    <div aria-hidden="true" className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className={withRail ? "grid gap-10 lg:grid-cols-[1fr_18rem]" : ""}>
        <div className="space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton
              key={i}
              className="h-3"
              style={{ width: `${92 - i * 7}%`, animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        {withRail && (
          <div className="space-y-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-20" />
          </div>
        )}
      </div>
    </div>
  );
}

/** The counts band on the admin dashboard. */
export function StatsSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-px border border-rule bg-rule sm:grid-cols-4">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="space-y-2 bg-paper p-5">
          <Skeleton className="h-7 w-12" style={{ animationDelay: `${i * 80}ms` }} />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}
