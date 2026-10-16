import { createClient } from "@/lib/supabase/server";
import { peso, kg } from "@/lib/format";

function n(v: unknown): number {
  return Number(v ?? 0);
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "money";
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "warn"
            ? "mt-1 text-2xl font-semibold text-destructive"
            : tone === "money"
              ? "mt-1 text-2xl font-semibold text-primary"
              : "mt-1 text-2xl font-semibold"
        }
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: d }, { data: inv }] = await Promise.all([
    supabase.from("dashboard_summary").select("*").maybeSingle(),
    supabase.from("inventory_summary").select("*").maybeSingle(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live overview of orders, milling, deliveries, stock and money.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Orders &amp; milling
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Pending orders" value={String(n(d?.pending_orders))} />
          <Stat
            label="Rice to mill (pending)"
            value={kg(n(d?.rice_to_mill_pending))}
          />
          <Stat
            label="Palay to mill (pending)"
            value={kg(n(d?.palay_to_mill_pending))}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Deliveries
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Today" value={String(n(d?.deliveries_today))} />
          <Stat label="Tomorrow" value={String(n(d?.deliveries_tomorrow))} />
          <Stat label="Next 7 days" value={String(n(d?.deliveries_next_7))} />
          <Stat
            label="Overdue"
            value={String(n(d?.overdue_deliveries))}
            tone={n(d?.overdue_deliveries) > 0 ? "warn" : "default"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Stock
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Palay on hand" value={kg(n(inv?.palay_on_hand))} />
          <Stat label="Rice on hand" value={kg(n(inv?.rice_on_hand))} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Money</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Total sales" value={peso(n(d?.total_sales))} tone="money" />
          <Stat label="Collected" value={peso(n(d?.collected))} />
          <Stat
            label="Unpaid (utang)"
            value={peso(n(d?.unpaid_balance))}
            tone={n(d?.unpaid_balance) > 0 ? "warn" : "default"}
          />
        </div>
      </section>
    </div>
  );
}
