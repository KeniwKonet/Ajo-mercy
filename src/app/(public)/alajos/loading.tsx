import { Container, Skeleton } from "@/components/ui/primitives";
import { CardGridSkeleton } from "@/components/ui/loading-skeletons";

export default function Loading() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-3 w-full max-w-lg" />
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
        <div className="space-y-4">
          <Skeleton className="h-9" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <CardGridSkeleton rows={6} />
      </div>
    </Container>
  );
}
