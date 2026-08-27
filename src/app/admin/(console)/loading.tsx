import { Skeleton } from "@/components/ui/primitives";
import { StatsSkeleton, TableSkeleton } from "@/components/ui/loading-skeletons";

export default function Loading() {
  return (
    <div className="space-y-8 px-5 py-8 sm:px-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <StatsSkeleton />
      <TableSkeleton rows={6} />
    </div>
  );
}
