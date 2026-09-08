import Link from "next/link";
import { cn } from "@/components/ui/primitives";
import { StatusBadge, type StatusKind } from "@/components/ui/trust";
import { formatRelative } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/types";

/**
 * The queue, kept beside the application being reviewed.
 *
 * Reviewing is a repeated task, and the old shape made it a round trip: open
 * an application, decide, go back to the list, find your place, open the next
 * one. Keeping the queue in view means a reviewer can move straight on, and
 * can see how many people are still waiting behind the one in front of them.
 *
 * Ordered oldest first, matching the queue page, so nobody is overtaken by
 * someone who applied later.
 */

export type RailItem = {
  id: string;
  business_name: string | null;
  founder_name: string | null;
  status: ApplicationStatus;
  submitted_at: string | null;
};

function statusKind(status: ApplicationStatus): StatusKind {
  switch (status) {
    case "draft":
      return "draft";
    case "submitted":
      return "submitted";
    case "under_review":
      return "review";
    case "more_information_required":
      return "needs_info";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    default:
      return "submitted";
  }
}

export function ReviewRail({
  items,
  currentId,
  total,
}: {
  items: RailItem[];
  currentId: string;
  total: number;
}) {
  const index = items.findIndex((i) => i.id === currentId);
  const previous = index > 0 ? items[index - 1] : undefined;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : undefined;

  return (
    <aside aria-label="Review queue" className="min-w-0 xl:sticky xl:top-6 xl:self-start">
      <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
        <h2 className="text-2xs font-bold uppercase tracking-[0.08em] text-ink-faint">
          Waiting
        </h2>
        <span className="tabular text-2xs text-ink-faint">
          {index >= 0 ? `${index + 1} of ${total}` : total}
        </span>
      </div>

      {/* Straight to the next one, without going back to the list. */}
      <div className="flex gap-2 border-b border-rule py-2.5">
        {previous ? (
          <Link
            href={`/admin/alajos/${previous.id}`}
            className="flex-1 rounded-sm border border-muted-on-black/25 px-2 py-1.5 text-center text-2xs font-semibold transition-colors hover:bg-widget-black-2"
          >
            Previous
          </Link>
        ) : (
          <span className="flex-1 rounded-sm border border-rule px-2 py-1.5 text-center text-2xs text-ink-faint">
            Previous
          </span>
        )}
        {next ? (
          <Link
            href={`/admin/alajos/${next.id}`}
            className="flex-1 rounded-sm border border-ink bg-ink px-2 py-1.5 text-center text-2xs font-semibold text-ivory-text transition-colors hover:bg-widget-black"
          >
            Next
          </Link>
        ) : (
          <span className="flex-1 rounded-sm border border-rule px-2 py-1.5 text-center text-2xs text-ink-faint">
            Next
          </span>
        )}
      </div>

      {/* Capped height so a long queue does not push the decision panel off
          the screen on a laptop. */}
      <ol className="max-h-[26rem] overflow-y-auto">
        {items.map((item) => {
          const active = item.id === currentId;
          return (
            <li key={item.id}>
              <Link
                href={`/admin/alajos/${item.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block border-b border-rule px-3 py-2.5 transition-colors",
                  active ? "bg-widget-black text-ivory-text" : "hover:bg-widget-black-2",
                )}
              >
                <p
                  className={cn(
                    "truncate text-sm font-semibold",
                    active ? "text-ivory-text" : "text-ink",
                  )}
                >
                  {item.business_name ?? "Untitled application"}
                </p>
                <p
                  className={cn(
                    "truncate text-2xs",
                    active ? "text-ivory-text/70" : "text-ink-faint",
                  )}
                >
                  {item.founder_name ?? "No name yet"}
                  {item.submitted_at ? ` · ${formatRelative(item.submitted_at)}` : ""}
                </p>
                {!active && (
                  <StatusBadge kind={statusKind(item.status)} size="sm" className="mt-1.5" />
                )}
              </Link>
            </li>
          );
        })}
      </ol>

      {items.length === 0 && (
        <p className="py-4 text-xs text-ink-faint">Nothing else is waiting.</p>
      )}
    </aside>
  );
}
