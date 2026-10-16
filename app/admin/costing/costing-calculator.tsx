"use client";

import { useMemo, useState } from "react";
import { computeCosting, type CostingInputs } from "@/lib/calc/costing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { peso, kg } from "@/lib/format";
import { cn } from "@/lib/utils";

function NumberField({
  label,
  value,
  onChange,
  step = "1",
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {suffix ? (
          <span className="font-normal text-muted-foreground"> ({suffix})</span>
        ) : null}
      </Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function CostingCalculator({ defaults }: { defaults: CostingInputs }) {
  const [inp, setInp] = useState<CostingInputs>(defaults);
  const r = useMemo(() => computeCosting(inp), [inp]);
  const upd = (k: keyof CostingInputs) => (v: number) =>
    setInp((p) => ({ ...p, [k]: v }));

  const rows: { label: string; mill: string; own: string; strong?: boolean }[] = [
    {
      label: "Milling price / kg",
      mill: peso(r.mill.millingPricePerKg),
      own: peso(r.own.millingPricePerKg),
    },
    {
      label: "Total batch cost",
      mill: peso(r.mill.totalBatchCost),
      own: peso(r.own.totalBatchCost),
    },
    { label: "Rice produced", mill: kg(r.mill.riceKg), own: kg(r.own.riceKg) },
    {
      label: "Cost per kg (break-even)",
      mill: peso(r.mill.costPerKg),
      own: peso(r.own.costPerKg),
      strong: true,
    },
    {
      label: "Profit per kg",
      mill: peso(r.mill.profitPerKg),
      own: peso(r.own.profitPerKg),
    },
    {
      label: "Sales if all sold",
      mill: peso(r.mill.salesIfAllSold),
      own: peso(r.own.salesIfAllSold),
    },
    {
      label: "Profit from batch",
      mill: peso(r.mill.profitFromBatch),
      own: peso(r.own.profitFromBatch),
      strong: true,
    },
  ];

  const ownBetter = r.own.profitFromBatch > r.mill.profitFromBatch;
  const payback = Number.isFinite(r.roi.batchesToPayback)
    ? `${r.roi.batchesToPayback.toFixed(1)} batches`
    : "—";
  const paybackKg = Number.isFinite(r.roi.palayKgToPayback)
    ? kg(r.roi.palayKgToPayback)
    : "—";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Inputs */}
      <div className="space-y-4 lg:col-span-3">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Palay &amp; batch</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Palay price / kg" suffix="₱" step="0.01" value={inp.palayPricePerKg} onChange={upd("palayPricePerKg")} />
            <NumberField label="Palay to buy" suffix="kg" value={inp.palayKg} onChange={upd("palayKg")} />
            <NumberField label="Drying (total)" suffix="₱" step="0.01" value={inp.dryingTotal} onChange={upd("dryingTotal")} />
            <NumberField label="Packaging (total)" suffix="₱" step="0.01" value={inp.packagingTotal} onChange={upd("packagingTotal")} />
            <NumberField label="Other (total)" suffix="₱" step="0.01" value={inp.otherTotal} onChange={upd("otherTotal")} />
            <NumberField label="Selling price / kg" suffix="₱" step="0.01" value={inp.sellingPricePerKg} onChange={upd("sellingPricePerKg")} />
            <NumberField label="Market price / kg" suffix="₱" step="0.01" value={inp.marketPricePerKg} onChange={upd("marketPricePerKg")} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Pay a rice mill</h2>
            <div className="space-y-3">
              <NumberField label="Milling price / kg" suffix="₱" step="0.01" value={inp.millMillingPricePerKg} onChange={upd("millMillingPricePerKg")} />
              <NumberField label="Transport (total)" suffix="₱" step="0.01" value={inp.millTransportTotal} onChange={upd("millTransportTotal")} />
              <NumberField label="Recovery" suffix="rice/palay" step="0.01" value={inp.millRecovery} onChange={upd("millRecovery")} />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Own mini miller</h2>
            <div className="space-y-3">
              <NumberField label="Miller price" suffix="₱" step="0.01" value={inp.millerPrice} onChange={upd("millerPrice")} />
              <NumberField label="Motor power" suffix="kW" step="0.1" value={inp.ownMotorKw} onChange={upd("ownMotorKw")} />
              <NumberField label="Electricity rate" suffix="₱/kWh" step="0.01" value={inp.ownElectricityRate} onChange={upd("ownElectricityRate")} />
              <NumberField label="Maintenance / kg" suffix="₱" step="0.01" value={inp.ownMaintenancePerKg} onChange={upd("ownMaintenancePerKg")} />
              <NumberField label="Capacity" suffix="kg/hr" value={inp.ownCapacityKgPerHr} onChange={upd("ownCapacityKgPerHr")} />
              <NumberField label="Transport (total)" suffix="₱" step="0.01" value={inp.ownTransportTotal} onChange={upd("ownTransportTotal")} />
              <NumberField label="Recovery" suffix="rice/palay" step="0.01" value={inp.ownRecovery} onChange={upd("ownRecovery")} />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4 lg:col-span-2">
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Metric</th>
                <th className="px-3 py-2 text-right font-medium">Pay a mill</th>
                <th className="px-3 py-2 text-right font-medium">Own miller</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b last:border-0",
                    row.strong && "bg-muted/30",
                  )}
                >
                  <td className="px-3 py-2">{row.label}</td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right",
                      row.strong && "font-semibold",
                    )}
                  >
                    {row.mill}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right",
                      row.strong && "font-semibold text-primary",
                    )}
                  >
                    {row.own}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Mini miller ROI</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label="Extra profit / batch" value={peso(r.roi.extraProfitPerBatch)} strong />
            <Detail label="Pays for itself in" value={payback} />
            <Detail label="Palay to break even" value={paybackKg} />
            <Detail label="Hours to mill batch" value={`${r.ownMilling.hoursToMill.toFixed(1)} hrs`} />
            <Detail label="Own milling / kg" value={peso(r.own.millingPricePerKg)} />
            <Detail label="Electricity / hr" value={peso(r.ownMilling.electricityCostPerHr)} />
          </dl>
          <p
            className={cn(
              "mt-4 rounded-lg px-3 py-2 text-sm",
              ownBetter
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {ownBetter
              ? `Owning the miller earns ${peso(r.roi.extraProfitPerBatch)} more per batch and pays for itself in ${payback}.`
              : "At these numbers, paying a rice mill is at least as profitable as owning one."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            To record an actual purchase, use Inventory → Add palay batch.
          </p>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", strong && "text-primary")}>{value}</dd>
    </div>
  );
}
