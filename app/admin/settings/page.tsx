import { createClient } from "@/lib/supabase/server";
import { SettingsForm, type SettingsValues } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select(
      "business_name, default_price_per_kg, milling_recovery, mill_days_before_delivery, updated_at",
    )
    .eq("id", true)
    .maybeSingle();

  const values: SettingsValues = {
    business_name: data?.business_name ?? "Rice Business Management System",
    default_price_per_kg: Number(data?.default_price_per_kg ?? 60),
    milling_recovery: Number(data?.milling_recovery ?? 0.62),
    mill_days_before_delivery: Number(data?.mill_days_before_delivery ?? 1),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business-wide defaults for pricing, milling and scheduling.
          {data?.updated_at && (
            <> Last updated {new Date(data.updated_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}.</>
          )}
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border bg-card p-5">
        <SettingsForm values={values} />
      </div>

      <p className="max-w-2xl text-xs text-muted-foreground">
        These are the business defaults. Changing the selling price updates the
        storefront and the default on new orders only — every existing order
        keeps the price and recovery that were frozen onto it when it was placed.
      </p>
    </div>
  );
}
