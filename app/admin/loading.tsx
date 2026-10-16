import { PageHeaderSkeleton, StatRowSkeleton, TableSkeleton } from "@/components/admin/skeletons";

// Shown while the admin route chunk loads. Per-tab data loading is handled
// in-page by the Zustand cache status (skeleton → data), this covers first paint.
export default function AdminLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <StatRowSkeleton />
      <TableSkeleton />
    </div>
  );
}
