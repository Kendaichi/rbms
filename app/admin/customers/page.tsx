import { createClient } from "@/lib/supabase/server";
import { peso, kg } from "@/lib/format";

type CustomerRow = {
  id: string;
  name: string;
  contact_no: string | null;
  barangay: string | null;
  customer_type: string;
  no_of_orders: number;
  total_kg: number;
  total_spent: number;
  unpaid_balance: number;
  last_order: string | null;
};

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_summary")
    .select("*")
    .order("last_order", { ascending: false, nullsFirst: false });

  const customers = (data ?? []) as unknown as CustomerRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          {customers.length} customer{customers.length === 1 ? "" : "s"}. Totals
          update automatically from orders.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Barangay</th>
              <th className="px-3 py-2 text-right font-medium">Orders</th>
              <th className="px-3 py-2 text-right font-medium">Total kg</th>
              <th className="px-3 py-2 text-right font-medium">Spent</th>
              <th className="px-3 py-2 text-right font-medium">Unpaid</th>
              <th className="px-3 py-2 font-medium">Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2">{c.contact_no ?? "—"}</td>
                <td className="px-3 py-2">{c.barangay ?? "—"}</td>
                <td className="px-3 py-2 text-right">{Number(c.no_of_orders)}</td>
                <td className="px-3 py-2 text-right">{kg(Number(c.total_kg))}</td>
                <td className="px-3 py-2 text-right">{peso(Number(c.total_spent))}</td>
                <td className="px-3 py-2 text-right">
                  {Number(c.unpaid_balance) > 0 ? (
                    <span className="font-medium text-destructive">
                      {peso(Number(c.unpaid_balance))}
                    </span>
                  ) : (
                    peso(0)
                  )}
                </td>
                <td className="px-3 py-2">{c.last_order ?? "—"}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
