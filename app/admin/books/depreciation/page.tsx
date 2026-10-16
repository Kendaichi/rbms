import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";

function n(v: unknown) {
  return Number(v ?? 0);
}

type Ppe = {
  id: string;
  name: string;
  purchase_date: string;
  cost: number;
  useful_life_years: number;
  salvage_value: number;
  depreciation_per_year: number;
  depreciation_per_month: number;
  depreciation_starts: string;
};

// Mirrors the SQL accumulated_depreciation(): months since the depreciation
// start month (inclusive), capped at the useful life, × monthly depreciation.
function monthsElapsed(startStr: string, asOf: { y: number; m: number }, lifeMonths: number) {
  const d = new Date(`${startStr}T00:00:00`);
  const startY = d.getFullYear();
  const startM = d.getMonth() + 1;
  if (asOf.y < startY || (asOf.y === startY && asOf.m < startM)) return 0;
  const raw = (asOf.y - startY) * 12 + (asOf.m - startM) + 1;
  return Math.max(0, Math.min(raw, lifeMonths));
}

export default async function DepreciationPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ppe_items")
    .select(
      "id, name, purchase_date, cost, useful_life_years, salvage_value, depreciation_per_year, depreciation_per_month, depreciation_starts",
    )
    .order("purchase_date", { ascending: true });

  const items = (data ?? []) as unknown as Ppe[];

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
  const [ty, tm] = todayStr.split("-").map(Number);
  const asOf = { y: ty, m: tm };

  const rows = items.map((it) => {
    const lifeMonths = Math.round(n(it.useful_life_years) * 12);
    const months = monthsElapsed(it.depreciation_starts, asOf, lifeMonths);
    const perMonth = n(it.depreciation_per_month);
    const accumulated = months * perMonth;
    const netBook = n(it.cost) - accumulated;
    return { ...it, months, accumulated, netBook };
  });

  const totalCost = rows.reduce((s, r) => s + n(r.cost), 0);
  const totalPerMonth = rows.reduce((s, r) => s + n(r.depreciation_per_month), 0);
  const totalAccum = rows.reduce((s, r) => s + r.accumulated, 0);
  const totalNet = rows.reduce((s, r) => s + r.netBook, 0);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Straight-line depreciation on property, plant &amp; equipment. Monthly
        depreciation flows into the income statement automatically. Accumulated
        figures are as of {todayStr}.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Depreciation / month</p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {peso(totalPerMonth)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Accumulated to date
          </p>
          <p className="mt-1 text-2xl font-semibold">{peso(totalAccum)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Net book value</p>
          <p className="mt-1 text-2xl font-semibold">{peso(totalNet)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Asset</th>
              <th className="px-3 py-2 font-medium">Acquired</th>
              <th className="px-3 py-2 text-right font-medium">Cost</th>
              <th className="px-3 py-2 text-right font-medium">Salvage</th>
              <th className="px-3 py-2 text-right font-medium">Life (yrs)</th>
              <th className="px-3 py-2 text-right font-medium">Dep / yr</th>
              <th className="px-3 py-2 text-right font-medium">Dep / mo</th>
              <th className="px-3 py-2 text-right font-medium">Months</th>
              <th className="px-3 py-2 text-right font-medium">Accum.</th>
              <th className="px-3 py-2 text-right font-medium">Net book</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.purchase_date}</td>
                <td className="px-3 py-2 text-right">{peso(n(r.cost))}</td>
                <td className="px-3 py-2 text-right">{peso(n(r.salvage_value))}</td>
                <td className="px-3 py-2 text-right">{n(r.useful_life_years)}</td>
                <td className="px-3 py-2 text-right">
                  {peso(n(r.depreciation_per_year))}
                </td>
                <td className="px-3 py-2 text-right">
                  {peso(n(r.depreciation_per_month))}
                </td>
                <td className="px-3 py-2 text-right">{r.months}</td>
                <td className="px-3 py-2 text-right">{peso(r.accumulated)}</td>
                <td className="px-3 py-2 text-right">{peso(r.netBook)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No depreciable assets recorded.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t bg-muted/30 text-sm font-medium">
              <tr>
                <td className="px-3 py-2" colSpan={2}>
                  Totals
                </td>
                <td className="px-3 py-2 text-right">{peso(totalCost)}</td>
                <td className="px-3 py-2" colSpan={3} />
                <td className="px-3 py-2 text-right">{peso(totalPerMonth)}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right">{peso(totalAccum)}</td>
                <td className="px-3 py-2 text-right">{peso(totalNet)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
