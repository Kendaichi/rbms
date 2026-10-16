import { Skeleton } from "@/components/ui/skeleton";

// Composed loading placeholders that mirror the real admin layouts, so the
// transition from skeleton → data doesn't jump. Shown while a cached collection
// is idle/loading (see useCollection) and by the route-level loading.tsx files.

export function StatSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-24" />
    </div>
  );
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ className = "h-64" }: { className?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className={`mt-4 w-full ${className}`} />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="border-b bg-muted/50 px-3 py-2.5">
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-3 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-4 flex-1"
                style={{ maxWidth: c === 0 ? 120 : undefined }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}
