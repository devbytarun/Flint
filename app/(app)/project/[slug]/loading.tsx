import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoading() {
  return (
    <div className="flex-1 py-8 lg:py-10">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        <Skeleton className="h-32 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
