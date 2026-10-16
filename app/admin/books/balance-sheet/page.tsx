import { createClient } from "@/lib/supabase/server";
import { peso } from "@/lib/format";
import { cn } from "@/lib/utils";

function n(v: unknown) {
  return Number(v ?? 0);
}

function Line({
  label,
  value,
  bold,
  border,
  indent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  border?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 text-sm",
        border && "mt-1 border-t pt-2",
        bold && "font-semibold",
      )}
    >
      <span className={cn(indent && "pl-4")}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default async function BalanceSheetPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("balance_sheet")
    .select("*")
    .maybeSingle();

  if (!data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No data yet.
      </div>
    );
  }
  const b = data as Record<string, unknown>;

  const asOf = String(b.as_of ?? "");
  const cash = n(b.cash);
  const ar = n(b.accounts_receivable);
  const inventory = n(b.inventory);
  const ppeCost = n(b.ppe_cost);
  const accDep = n(b.accumulated_depreciation);
  const ppeNet = n(b.ppe_net);
  const ap = n(b.accounts_payable);
  const capital = n(b.capital);
  const retained = n(b.retained_earnings);
  const totalAssets = n(b.total_assets);
  const totalLE = n(b.total_liabilities_and_equity);
  const balanced = Boolean(b.is_balanced);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">As of {asOf}</p>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
            balanced
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {balanced ? "Balanced ✓" : "NOT balanced — check entries"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">Assets</h2>
          <Line label="Cash" value={peso(cash)} indent />
          <Line label="Accounts receivable (utang)" value={peso(ar)} indent />
          <Line label="Inventory (at cost)" value={peso(inventory)} indent />
          <Line label="Property, plant & equipment" value={peso(ppeCost)} indent />
          <Line
            label="Less: Accumulated depreciation"
            value={accDep ? `(${peso(accDep)})` : peso(0)}
            indent
          />
          <Line label="PPE, net" value={peso(ppeNet)} indent />
          <Line label="Total assets" value={peso(totalAssets)} bold border />
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">Liabilities &amp; equity</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Liabilities
          </p>
          <Line label="Accounts payable" value={peso(ap)} indent />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Owner&rsquo;s equity
          </p>
          <Line label="Capital (net of drawings)" value={peso(capital)} indent />
          <Line
            label="Retained earnings"
            value={peso(retained)}
            indent
          />
          <Line
            label="Total liabilities & equity"
            value={peso(totalLE)}
            bold
            border
          />
        </div>
      </div>

      {!balanced && (
        <p className="text-sm text-destructive">
          Assets ({peso(totalAssets)}) do not equal liabilities + equity (
          {peso(totalLE)}). Review the journal for a missing or double entry.
        </p>
      )}
    </div>
  );
}
