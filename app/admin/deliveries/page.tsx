"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCollection } from "@/lib/store/useCollection";
import type { OrderRow, CustomerRow } from "@/lib/store/selectors";
import { manilaToday, addDays } from "@/lib/date";
import { kg } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataState } from "@/components/admin/data-state";
import { TableSkeleton, StatRowSkeleton } from "@/components/admin/skeletons";
import { ResponsiveTable, type Column } from "@/components/admin/responsive-table";
import { Badge } from "@/components/ui/badge";
import { DeliveryRowActions } from "./delivery-row-actions";

const alertVariant: Record<string, "danger" | "warning" | "secondary" | "muted"> = {
  Overdue: "danger",
  Today: "warning",
  Tomorrow: "secondary",
  Upcoming: "muted",
};

export default function DeliveriesPage() {
  const orders = useCollection<OrderRow>("orders");
  const customers = useCollection<CustomerRow>("customers");

  const today = manilaToday();
  const tomorrow = addDays(today, 1);
  const plus7 = addDays(today, 7);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers.rows) m.set(c.id, c.name);
    return m;
  }, [customers.rows]);

  const rows = useMemo(
    () =>
      orders.rows
        .filter(
          (o) =>
            o.delivery_date &&
            o.status !== "Delivered" &&
            o.status !== "Cancelled",
        )
        .sort((a, b) => String(a.delivery_date).localeCompare(String(b.delivery_date))),
    [orders.rows],
  );

  const alertFor = (d: string) =>
    d < today ? "Overdue" : d === today ? "Today" : d === tomorrow ? "Tomorrow" : "Upcoming";

  const counts = {
    today: rows.filter((r) => r.delivery_date === today).length,
    tomorrow: rows.filter((r) => r.delivery_date === tomorrow).length,
    next7: rows.filter(
      (r) => String(r.delivery_date) >= today && String(r.delivery_date) <= plus7,
    ).length,
    overdue: rows.filter((r) => String(r.delivery_date) < today).length,
  };

  const columns: Column<OrderRow>[] = [
    {
      key: "date",
      header: "Date",
      primary: true,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.delivery_date}</span>
          <Badge variant={alertVariant[alertFor(String(r.delivery_date))]} className="font-normal">
            {alertFor(String(r.delivery_date))}
          </Badge>
        </div>
      ),
    },
    {
      key: "order",
      header: "Order",
      cell: (r) => (
        <Link href={`/admin/orders/${r.id}`} className="font-medium text-primary hover:underline">
          {r.order_no}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (r) => (r.customer_id ? nameOf.get(r.customer_id) ?? "—" : "—"),
    },
    { key: "kg", header: "Kg", align: "right", cell: (r) => kg(Number(r.kg_ordered)) },
    { key: "slot", header: "Time slot", cell: (r) => r.time_slot ?? "—" },
    { key: "mill", header: "Mill by", cell: (r) => r.mill_by ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery schedule"
        description="Orders with a delivery date that aren't delivered or cancelled yet."
      />

      <DataState
        loading={orders.loading}
        error={orders.error}
        onRetry={orders.refetch}
        skeleton={<StatRowSkeleton />}
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Today" value={String(counts.today)} />
          <StatCard label="Tomorrow" value={String(counts.tomorrow)} />
          <StatCard label="Next 7 days" value={String(counts.next7)} />
          <StatCard
            label="Overdue"
            value={String(counts.overdue)}
            tone={counts.overdue > 0 ? "warn" : "default"}
          />
        </div>
      </DataState>

      <DataState
        loading={orders.loading}
        error={orders.error}
        onRetry={orders.refetch}
        skeleton={<TableSkeleton rows={5} cols={6} />}
      >
        <ResponsiveTable
          columns={columns}
          rows={rows}
          actions={(r) => <DeliveryRowActions order={r} />}
          empty={
            <div className="space-y-2">
              <p className="text-sm font-medium">No scheduled deliveries</p>
              <p className="text-sm text-muted-foreground">
                Orders with a delivery date appear here until they&rsquo;re delivered.
              </p>
            </div>
          }
        />
      </DataState>
    </div>
  );
}
