import { Skeleton } from "@/components/ui/skeleton"

export function FileSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded bg-card shadow p-2">
      <Skeleton className="h-6 w-6 rounded-lg" />
      <Skeleton className="h-4 w-[50%]" />
    </div>
  )
}