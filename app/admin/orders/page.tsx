import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { peso, kg } from "@/lib/format";
import { StatusBadge } from "@/components/admin/status-badge";

type OrderRow = {
  id: string;
  order_no: string;
  kg_ordered: number;
  delivery_date: string | null;
  status: string;
  payment_status: string;
  total_due: number;
  balance: number;
  source: string;
  customers: { name: string; contact_no: string | null } | null;
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_no, kg_ordered, delivery_date, status, payment_status, total_due, balance, source, customers(name, contact_no)",
    )
    .order("order_date", { ascending: false })
    .order("order_no", { ascending: false });

  const orders = (data ?? []) as unknown as OrderRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">
          {orders.length} order{orders.length === 1 ? "" : "s"}. Click a row to
          update status or record payment.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Kg</th>
              <th className="px-3 py-2 font-medium">Delivery</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Payment</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-b last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {o.order_no}
                  </Link>
                </td>
                <td className="px-3 py-2">{o.customers?.name ?? "—"}</td>
                <td className="px-3 py-2">{kg(Number(o.kg_ordered))}</td>
                <td className="px-3 py-2">{o.delivery_date ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge value={o.status} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge value={o.payment_status} />
                </td>
                <td className="px-3 py-2 text-right">
                  {peso(Number(o.total_due))}
                </td>
                <td className="px-3 py-2 text-right">
                  {peso(Number(o.balance))}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
