"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Banknote, HandCoins, Clock, Wallet } from "lucide-react";
import { useCollection } from "@/lib/store/useCollection";
import type { Row } from "@/lib/store/admin-store";
import {
  dashboardStats,
  inventoryStats,
  monthlySales,
  statusCounts,
  topCustomers,
  deliveriesNext7,
  type OrderRow,
  type CustomerRow,
} from "@/lib/store/selectors";
import { peso, kg, pesoCompact } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataState } from "@/components/admin/data-state";
import { StatRowSkeleton, ChartSkeleton } from "@/components/admin/skeletons";
import { ScheduleCalendar } from "@/components/admin/schedule-calendar";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/charts/sparkline";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { OrderForm } from "../orders/order-form";

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border bg-card p-5 ${className ?? ""}`}>
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "var(--status-pending)",
  Milled: "var(--status-milled)",
  Delivered: "var(--status-delivered)",
  Cancelled: "var(--status-cancelled)",
};

export default function DashboardPage() {
  const orders = useCollection<OrderRow>("orders");
  const customers = useCollection<CustomerRow>("customers");
  const batches = useCollection<Row>("palay_batches");
  const runs = useCollection<Row>("milling_runs");
  const settings = useCollection<Row>("settings");

  const [creating, setCreating] = useState(false);

  const stats = useMemo(() => dashboardStats(orders.rows), [orders.rows]);
  const monthly = useMemo(() => monthlySales(orders.rows, 6), [orders.rows]);
  const statuses = useMemo(() => statusCounts(orders.rows), [orders.rows]);
  const top = useMemo(
    () => topCustomers(customers.rows, orders.rows, 5),
    [customers.rows, orders.rows],
  );
  const next7 = useMemo(() => deliveriesNext7(orders.rows), [orders.rows]);
  const inv = useMemo(
    () => inventoryStats(batches.rows, runs.rows, orders.rows),
    [batches.rows, runs.rows, orders.rows],
  );
  const recent = useMemo(() => orders.rows.slice(0, 6), [orders.rows]);
  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers.rows) m.set(c.id, c.name);
    return m;
  }, [customers.rows]);

  const defaultPrice = Number(settings.rows[0]?.default_price_per_kg ?? 60);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Live overview — orders, milling, deliveries, stock and money.">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New order
        </Button>
      </PageHeader>

      {/* KPIs */}
      <DataState
        loading={orders.loading}
        error={orders.error}
        onRetry={orders.refetch}
        skeleton={<StatRowSkeleton />}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total sales" value={peso(stats.total_sales)} tone="money" icon={Banknote}>
            <div className="mt-3 h-7 text-primary">
              <Sparkline data={monthly.map((m) => m.sales)} className="h-7 w-full" />
            </div>
          </StatCard>
          <StatCard label="Collected" value={peso(stats.collected)} icon={HandCoins}>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.total_sales > 0
                ? `${Math.round((stats.collected / stats.total_sales) * 100)}% of sales`
                : "—"}
            </p>
          </StatCard>
          <StatCard
            label="Unpaid (utang)"
            value={peso(stats.unpaid_balance)}
            tone={stats.unpaid_balance > 0 ? "warn" : "default"}
            icon={Wallet}
          />
          <StatCard
            label="Pending orders"
            value={String(stats.pending_orders)}
            hint={`${kg(stats.rice_to_mill_pending)} to mill`}
            icon={Clock}
          />
        </div>
      </DataState>

      {/* Trend + status */}
      <DataState
        loading={orders.loading}
        error={orders.error}
        onRetry={orders.refetch}
        skeleton={
          <div className="grid gap-4 lg:grid-cols-5">
            <ChartSkeleton className="h-56" />
            <ChartSkeleton className="h-56" />
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-5">
          <ChartCard title="Sales — last 6 months" className="lg:col-span-3">
            <AreaChart
              points={monthly.map((m) => ({ label: m.label, value: m.sales }))}
              format={pesoCompact}
              label="Monthly sales"
            />
          </ChartCard>
          <ChartCard title="Order status" className="lg:col-span-2">
            <DonutChart
              segments={statuses.map((s) => ({ ...s, color: STATUS_COLORS[s.label] }))}
              centerValue={String(orders.rows.length)}
              centerLabel="orders"
            />
          </ChartCard>
        </div>
      </DataState>

      {/* Top customers + deliveries */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top customers by spend">
          <BarChart data={top} format={peso} empty="No sales yet." />
        </ChartCard>
        <ChartCard title="Deliveries — next 7 days">
          <BarChart
            data={next7.map((d) => ({ label: d.label, value: d.value }))}
            format={(n) => `${n}`}
            color="var(--brand-gold)"
            empty="Nothing scheduled."
          />
        </ChartCard>
      </div>

      {/* Stock */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Palay on hand" value={kg(inv.palay_on_hand)} tone="money" />
        <StatCard label="Rice on hand" value={kg(inv.rice_on_hand)} tone="money" />
        <StatCard label="Deliveries today" value={String(stats.deliveries_today)} />
        <StatCard
          label="Overdue"
          value={String(stats.overdue_deliveries)}
          tone={stats.overdue_deliveries > 0 ? "warn" : "default"}
        />
      </div>

      {/* Calendar */}
      <ScheduleCalendar orders={orders.rows} />

      {/* Recent orders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent orders</h3>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          {recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-medium text-primary">{o.order_no}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {o.customer_id ? nameOf.get(o.customer_id) ?? "—" : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">
                        {kg(Number(o.kg_ordered))}
                      </span>
                      <span className="text-sm font-medium tabular-nums">
                        {peso(Number(o.total_due))}
                      </span>
                      <StatusBadge value={o.status} dot={false} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {creating && (
        <OrderForm
          open
          onClose={() => setCreating(false)}
          customers={customers.rows}
          defaultPrice={defaultPrice}
        />
      )}
    </div>
  );
}
