"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useCollection, refetchCollections } from "@/lib/store/useCollection";
import type { OrderRow, CustomerRow } from "@/lib/store/selectors";
import type { Row } from "@/lib/store/admin-store";
import { peso, kg } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { DataState } from "@/components/admin/data-state";
import { TableSkeleton } from "@/components/admin/skeletons";
import { ResponsiveTable, type Column } from "@/components/admin/responsive-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteOrder } from "@/app/actions/admin";
import { toast } from "@/lib/store/toast";
import { OrderForm } from "./order-form";
import { OrderRowActions } from "./order-row-actions";
import { PaymentDialog } from "./payment-dialog";

const FILTERS = ["All", "Pending", "Milled", "Delivered", "Cancelled"] as const;

export default function OrdersPage() {
  const orders = useCollection<OrderRow>("orders");
  const customers = useCollection<CustomerRow>("customers");
  const settings = useCollection<Row>("settings");

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OrderRow | null>(null);
  const [paying, setPaying] = useState<OrderRow | null>(null);
  const [deleting, setDeleting] = useState<OrderRow | null>(null);

  const defaultPrice = Number(settings.rows[0]?.default_price_per_kg ?? 60);

  const nameOf = useMemo(() => {
    const m = new Map<string, CustomerRow>();
    for (const c of customers.rows) m.set(c.id, c);
    return m;
  }, [customers.rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: orders.rows.length };
    for (const o of orders.rows) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders.rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.rows.filter((o) => {
      if (filter !== "All" && o.status !== filter) return false;
      if (!q) return true;
      const c = o.customer_id ? nameOf.get(o.customer_id) : undefined;
      return (
        o.order_no.toLowerCase().includes(q) ||
        (c?.name ?? "").toLowerCase().includes(q) ||
        (c?.contact_no ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders.rows, filter, query, nameOf]);

  const columns: Column<OrderRow>[] = [
    {
      key: "order",
      header: "Order",
      primary: true,
      cell: (o) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders/${o.id}`}
            className="font-medium text-primary hover:underline"
          >
            {o.order_no}
          </Link>
          {o.source === "storefront" && (
            <Badge variant="muted" className="font-normal">online</Badge>
          )}
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (o) => {
        const c = o.customer_id ? nameOf.get(o.customer_id) : undefined;
        return (
          <div className="min-w-0">
            <p className="truncate">{c?.name ?? "—"}</p>
            {c?.contact_no && (
              <p className="truncate text-xs text-muted-foreground">{c.contact_no}</p>
            )}
          </div>
        );
      },
    },
    { key: "kg", header: "Kg", align: "right", cell: (o) => kg(Number(o.kg_ordered)) },
    {
      key: "delivery",
      header: "Delivery",
      cell: (o) =>
        o.fulfillment_type === "pickup" ? "Pickup" : o.delivery_date ?? "—",
    },
    { key: "status", header: "Status", cell: (o) => <StatusBadge value={o.status} /> },
    {
      key: "payment",
      header: "Payment",
      cell: (o) => <StatusBadge value={o.payment_status} />,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (o) => peso(Number(o.total_due)),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      cell: (o) =>
        Number(o.balance) > 0 ? (
          <span className="font-medium text-destructive">{peso(Number(o.balance))}</span>
        ) : (
          peso(0)
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Orders" description="Create, track and update orders. Click an order number for full detail.">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New order
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
              <span className={cn("text-xs", filter === f ? "opacity-80" : "opacity-60")}>
                {counts[f] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order or customer…"
            className="pl-8"
          />
        </div>
      </div>

      <DataState
        loading={orders.loading}
        error={orders.error}
        onRetry={orders.refetch}
        skeleton={<TableSkeleton rows={6} cols={7} />}
      >
        <ResponsiveTable
          columns={columns}
          rows={filtered}
          actions={(o) => (
            <OrderRowActions
              order={o}
              onEdit={setEditing}
              onPay={setPaying}
              onDelete={setDeleting}
            />
          )}
          empty={
            <div className="space-y-2">
              <p className="text-sm font-medium">No orders here</p>
              <p className="text-sm text-muted-foreground">
                {query || filter !== "All"
                  ? "Try clearing the filter or search."
                  : "Create your first order or wait for an online order to arrive."}
              </p>
            </div>
          }
        />
      </DataState>

      {/* Create */}
      <OrderForm
        open={creating}
        onClose={() => setCreating(false)}
        customers={customers.rows}
        defaultPrice={defaultPrice}
      />
      {/* Edit */}
      {editing && (
        <OrderForm
          open
          onClose={() => setEditing(null)}
          customers={customers.rows}
          defaultPrice={defaultPrice}
          order={editing}
        />
      )}
      {/* Payment */}
      {paying && (
        <PaymentDialog open onClose={() => setPaying(null)} order={paying} />
      )}
      {/* Delete */}
      {deleting && (
        <ConfirmDialog
          open
          onClose={() => setDeleting(null)}
          title={`Delete ${deleting.order_no}?`}
          destructive
          confirmLabel="Delete order"
          body={
            <>
              This permanently removes the order. Orders already posted to the books
              can&rsquo;t be deleted — cancel them instead.
            </>
          }
          onConfirm={async () => {
            const r = await deleteOrder(deleting.id);
            if (r.error) {
              toast.error(r.error);
            } else {
              toast.success(`${deleting.order_no} deleted`);
              refetchCollections("orders");
            }
          }}
        />
      )}
    </div>
  );
}
