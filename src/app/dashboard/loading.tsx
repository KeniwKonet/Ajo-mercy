import { PageSkeleton } from "@/components/ui/loading-skeletons";

export default function Loading() {
  return (
    <div className="px-5 py-8 sm:px-8">
      <PageSkeleton withRail />
    </div>
  );
}
