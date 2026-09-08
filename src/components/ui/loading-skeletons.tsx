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

/**
 * The discovery grid: a lead card over a run of smaller ones.
 *
 * It mirrors the listing's real shape, which is widget cards rather than the
 * ruled rows this used to draw, so the layout does not jump when the data
 * lands.
 */
export function CardGridSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="space-y-14">
      <div className="widget grid gap-6 sm:grid-cols-2">
        <Skeleton className="aspect-[4/3] rounded-lg" />
        <div className="space-y-3 py-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-2.5 w-2/5" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-4/5" />
        </div>
      </div>
      <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="widget space-y-3" style={{ animationDelay: `${i * 70}ms` }}>
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A dense admin table. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-hidden="true" className="widget !p-0 overflow-hidden">
      <div className="flex gap-4 border-b border-rule bg-widget-black-2 px-4 py-3">
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
    <div aria-hidden="true" className="grid gap-3.5 sm:grid-cols-4">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="widget space-y-2">
          <Skeleton className="h-7 w-12" style={{ animationDelay: `${i * 80}ms` }} />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}
