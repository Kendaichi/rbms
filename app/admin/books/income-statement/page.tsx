import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EndingInventoryForm } from "./is-forms";

function n(v: unknown) {
  return Number(v ?? 0);
}

function monthLabel(monthStr: string) {
  const d = new Date(`${monthStr}T00:00:00`);
  return d.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

function Line({
  label,
  value,
  indent,
  bold,
  border,
  tone,
}: {
  label: string;
  value: string;
  indent?: boolean;
  bold?: boolean;
  border?: boolean;
  tone?: "muted" | "profit" | "loss";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 text-sm",
        border && "mt-1 border-t pt-2",
        bold && "font-semibold",
      )}
    >
      <span className={cn(indent && "pl-4", tone === "muted" && "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          tone === "profit" && "text-primary",
          tone === "loss" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();

  const { data: mfData } = await supabase
    .from("monthly_financials")
    .select("*")
    .order("month", { ascending: true });

  const months = (mfData ?? []) as unknown as Record<string, unknown>[];

  if (months.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No financial activity recorded yet. Add entries in the Journal to build
        the income statement.
      </div>
    );
  }

  const monthValues = months.map((m) => String(m.month));
  const selected =
    monthParam && monthValues.includes(monthParam)
      ? monthParam
      : monthValues[monthValues.length - 1];
  const row = months.find((m) => String(m.month) === selected)!;

  // Itemise the cash operating expenses for the selected month.
  const { data: opexData } = await supabase
    .from("transactions")
    .select("amount, accounts(title, category)")
    .eq("month", selected);

  type TxRow = {
    amount: number;
    accounts:
      | { title: string; category: string }
      | { title: string; category: string }[]
      | null;
  };
  const opexItems: Record<string, number> = {};
  for (const t of (opexData ?? []) as unknown as TxRow[]) {
    const a = Array.isArray(t.accounts) ? t.accounts[0] : t.accounts;
    if (a?.category === "Operating Expenses") {
      opexItems[a.title] = (opexItems[a.title] ?? 0) + n(t.amount);
    }
  }

  const sales = n(row.sales);
  const otherIncome = n(row.other_income);
  const revenue = sales + otherIncome;
  const beginning = n(row.beginning_inventory);
  const purchases = n(row.purchases);
  const direct = n(row.direct_costs);
  const overhead = n(row.overhead_costs);
  const ending = n(row.ending_inventory);
  const cogs = n(row.cogs);
  const grossProfit = n(row.gross_profit);
  const depreciation = n(row.depreciation);
  const operatingExpenses = n(row.operating_expenses);
  const ebt = n(row.earnings_before_taxes);
  const taxes = n(row.taxes);
  const netProfit = n(row.net_profit);

  return (
    <div className="space-y-6">
      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Month</label>
          <select
            name="month"
            defaultValue={selected}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {monthValues.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
        >
          View
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">
            Income Statement — {monthLabel(selected)}
          </h2>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Revenue
          </p>
          <Line label="Sales" value={peso(sales)} indent />
          <Line label="Other income" value={peso(otherIncome)} indent />
          <Line label="Total revenue" value={peso(revenue)} bold border />

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cost of goods sold
          </p>
          <Line label="Beginning inventory" value={peso(beginning)} indent />
          <Line label="Add: Purchases of palay" value={peso(purchases)} indent />
          <Line label="Add: Direct processing costs" value={peso(direct)} indent />
          <Line label="Add: Production overhead" value={peso(overhead)} indent />
          <Line
            label="Less: Ending inventory"
            value={ending ? `(${peso(ending)})` : peso(0)}
            indent
            tone="muted"
          />
          <Line label="Cost of goods sold" value={peso(cogs)} bold border />

          <Line
            label="Gross profit"
            value={peso(grossProfit)}
            bold
            border
            tone={grossProfit >= 0 ? "profit" : "loss"}
          />

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Operating expenses
          </p>
          {Object.entries(opexItems).map(([title, amt]) => (
            <Line key={title} label={title} value={peso(amt)} indent />
          ))}
          <Line label="Depreciation" value={peso(depreciation)} indent />
          <Line
            label="Total operating expenses"
            value={peso(operatingExpenses)}
            bold
            border
          />

          <Line
            label="Operating income (EBT)"
            value={peso(ebt)}
            bold
            border
            tone={ebt >= 0 ? "profit" : "loss"}
          />
          <Line label="Taxes" value={peso(taxes)} indent />
          <Line
            label="Net profit (loss)"
            value={peso(netProfit)}
            bold
            border
            tone={netProfit >= 0 ? "profit" : "loss"}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">Month-end inventory</h3>
            <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
              Enter the cost of unsold palay/rice still on hand at the end of{" "}
              {monthLabel(selected)}. This lowers COGS (goods not yet sold) and
              carries over as next month&rsquo;s beginning inventory.
            </p>
            <EndingInventoryForm month={selected} current={ending} />
          </div>

          <div className="rounded-xl border bg-card p-5 text-sm">
            <h3 className="mb-2 text-sm font-semibold">How this is built</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>Revenue &amp; costs come from the Journal for this month.</li>
              <li>
                COGS = beginning inventory + purchases + processing − ending
                inventory.
              </li>
              <li>
                Depreciation is added automatically from the depreciation
                schedule — never typed as a transaction.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
