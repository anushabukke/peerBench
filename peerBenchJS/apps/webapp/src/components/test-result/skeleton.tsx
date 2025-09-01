import { Skeleton } from "@/components/ui/skeleton";

export default function TestResultSkeleton() {
  return (
    <div className="border-2 border-gray-200 rounded-xl bg-white dark:bg-gray-800">
      <div className="rounded-tl-xl rounded-tr-xl p-4 flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="w-6 h-6 rounded" />
        </div>
      </div>
    </div>
  );
}
