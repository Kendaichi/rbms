import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { kg } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/status-badge";

type Row = {
  id: string;
  order_no: string;
  delivery_date: string;
  time_slot: string | null;
  mill_by: string | null;
  status: string;
  kg_ordered: number;
  customers: { name: string; contact_no: string | null } | null;
};

function manilaToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}
function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const alertStyles: Record<string, string> = {
  Overdue: "bg-destructive/10 text-destructive",
  Today: "bg-brand-gold/15 text-brand-gold",
  Tomorrow: "bg-secondary text-secondary-foreground",
  Upcoming: "bg-muted text-muted-foreground",
};

export default async function DeliveriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_no, delivery_date, time_slot, mill_by, status, kg_ordered, customers(name, contact_no)",
    )
    .not("delivery_date", "is", null)
    .not("status", "in", "(Delivered,Cancelled)")
    .order("delivery_date", { ascending: true });

  const rows = (data ?? []) as unknown as Row[];
  const today = manilaToday();
  const tomorrow = addDays(today, 1);
  const plus7 = addDays(today, 7);

  const counts = {
    today: rows.filter((r) => r.delivery_date === today).length,
    tomorrow: rows.filter((r) => r.delivery_date === tomorrow).length,
    next7: rows.filter((r) => r.delivery_date >= today && r.delivery_date <= plus7)
      .length,
    overdue: rows.filter((r) => r.delivery_date < today).length,
  };

  const alertFor = (d: string) =>
    d < today ? "Overdue" : d === today ? "Today" : d === tomorrow ? "Tomorrow" : "Upcoming";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Delivery schedule</h1>
        <p className="text-sm text-muted-foreground">
          Orders with a delivery date that aren&rsquo;t delivered or cancelled yet.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { l: "Today", v: counts.today },
          { l: "Tomorrow", v: counts.tomorrow },
          { l: "Next 7 days", v: counts.next7 },
          { l: "Overdue", v: counts.overdue, warn: true },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold",
                s.warn && s.v > 0 && "text-destructive",
              )}
            >
              {s.v}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 text-right font-medium">Kg</th>
              <th className="px-3 py-2 font-medium">Time slot</th>
              <th className="px-3 py-2 font-medium">Mill by</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const a = alertFor(r.delivery_date);
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2">{r.delivery_date}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        alertStyles[a],
                      )}
                    >
                      {a}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/orders/${r.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.order_no}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.customers?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{kg(Number(r.kg_ordered))}</td>
                  <td className="px-3 py-2">{r.time_slot ?? "—"}</td>
                  <td className="px-3 py-2">{r.mill_by ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={r.status} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No scheduled deliveries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
