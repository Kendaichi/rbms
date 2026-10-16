import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { peso, kg } from "@/lib/format";
import { StatusBadge } from "@/components/admin/status-badge";
import { OrderActions } from "../order-actions";

type OrderFull = {
  id: string;
  order_no: string;
  status: string;
  payment_status: string;
  order_date: string;
  fulfillment_type: string;
  delivery_address: string | null;
  delivery_date: string | null;
  time_slot: string | null;
  mill_by: string | null;
  kg_ordered: number;
  price_per_kg: number;
  rice_amount: number;
  delivery_fee: number;
  total_due: number;
  amount_paid: number;
  balance: number;
  palay_to_mill_kg: number;
  milled_on: string | null;
  delivered_on: string | null;
  notes: string | null;
  source: string;
  customers: {
    name: string;
    contact_no: string | null;
    address: string | null;
    barangay: string | null;
  } | null;
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, customers(name, contact_no, address, barangay)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const o = data as unknown as OrderFull;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{o.order_no}</h1>
          <p className="text-sm text-muted-foreground">
            Placed {o.order_date} ·{" "}
            {o.source === "storefront" ? "online order" : "added by staff"}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge value={o.status} />
          <StatusBadge value={o.payment_status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Order</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label="Customer" value={o.customers?.name ?? "—"} />
            <Detail label="Contact" value={o.customers?.contact_no ?? "—"} />
            <Detail label="Kilograms" value={kg(Number(o.kg_ordered))} />
            <Detail label="Price / kg" value={peso(Number(o.price_per_kg))} />
            <Detail label="Rice amount" value={peso(Number(o.rice_amount))} />
            <Detail label="Delivery fee" value={peso(Number(o.delivery_fee))} />
            <Detail label="Total due" value={peso(Number(o.total_due))} />
            <Detail label="Paid" value={peso(Number(o.amount_paid))} />
            <Detail label="Balance" value={peso(Number(o.balance))} />
            <Detail label="Palay to mill" value={kg(Number(o.palay_to_mill_kg))} />
          </dl>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Fulfillment</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail
              label="Type"
              value={o.fulfillment_type === "delivery" ? "Delivery" : "Pickup"}
            />
            <Detail label="Mill by" value={o.mill_by ?? "—"} />
            <Detail label="Delivery date" value={o.delivery_date ?? "—"} />
            <Detail label="Time slot" value={o.time_slot ?? "—"} />
            <Detail label="Deliver to" value={o.delivery_address ?? "—"} />
            <Detail label="Barangay" value={o.customers?.barangay ?? "—"} />
            <Detail label="Milled on" value={o.milled_on ?? "—"} />
            <Detail label="Delivered on" value={o.delivered_on ?? "—"} />
          </dl>
          {o.notes && (
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">Notes: </span>
              {o.notes}
            </p>
          )}
        </div>
      </div>

      <OrderActions
        id={o.id}
        status={o.status}
        amountPaid={Number(o.amount_paid)}
        totalDue={Number(o.total_due)}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}
