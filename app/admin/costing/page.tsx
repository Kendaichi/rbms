import { createClient } from "@/lib/supabase/server";
import { defaultCostingInputs, type CostingInputs } from "@/lib/calc/costing";
import { CostingCalculator } from "./costing-calculator";

export default async function CostingPage() {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("settings")
    .select("default_price_per_kg, milling_recovery")
    .eq("id", true)
    .maybeSingle();

  const defaults: CostingInputs = {
    ...defaultCostingInputs,
    sellingPricePerKg: Number(
      s?.default_price_per_kg ?? defaultCostingInputs.sellingPricePerKg,
    ),
    marketPricePerKg: Number(
      s?.default_price_per_kg ?? defaultCostingInputs.marketPricePerKg,
    ),
    millRecovery: Number(s?.milling_recovery ?? defaultCostingInputs.millRecovery),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Costing calculator</h1>
        <p className="text-sm text-muted-foreground">
          Plan a batch and compare paying a rice mill vs. owning a mini miller.
          Figures update as you type; nothing is saved.
        </p>
      </div>
      <CostingCalculator defaults={defaults} />
    </div>
  );
}
