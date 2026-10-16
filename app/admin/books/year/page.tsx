import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";
import { cn } from "@/lib/utils";

function n(v: unknown) {
  return Number(v ?? 0);
}

type YearRow = {
  year: number;
  sales: number;
  other_income: number;
  purchases: number;
  processing_cost: number;
  cogs: number;
  operating_expenses: number;
  earnings_before_taxes: number;
  taxes: number;
  net_profit: number;
};

const metrics: { key: keyof YearRow; label: string; emphasis?: boolean }[] = [
  { key: "sales", label: "Sales" },
  { key: "other_income", label: "Other income" },
  { key: "purchases", label: "Purchases of palay" },
  { key: "processing_cost", label: "Processing cost" },
  { key: "cogs", label: "Cost of goods sold", emphasis: true },
  { key: "operating_expenses", label: "Operating expenses" },
  { key: "earnings_before_taxes", label: "Earnings before taxes", emphasis: true },
  { key: "taxes", label: "Taxes" },
  { key: "net_profit", label: "Net profit (loss)", emphasis: true },
];

export default async function YearSummaryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("year_summary")
    .select("*")
    .order("year", { ascending: true });

  const years = (data ?? []) as unknown as YearRow[];

  if (years.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No full-year activity recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Each financial year rolled up from the monthly income statements.
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Metric</th>
              {years.map((y) => (
                <th key={y.year} className="px-3 py-2 text-right font-medium">
                  {y.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr
                key={m.key}
                className={cn(
                  "border-b last:border-0",
                  m.emphasis && "bg-muted/20 font-semibold",
                )}
              >
                <td className="px-3 py-2">{m.label}</td>
                {years.map((y) => {
                  const v = n(y[m.key]);
                  return (
                    <td
                      key={y.year}
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        m.key === "net_profit" &&
                          (v >= 0 ? "text-primary" : "text-destructive"),
                      )}
                    >
                      {peso(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
