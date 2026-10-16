"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { batchSchema, millingSchema } from "@/lib/validation/inventory";

export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function issuesToMap(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0]?.toString() ?? "form";
    if (!m[k]) m[k] = i.message;
  }
  return m;
}

export async function addPalayBatch(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = batchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("palay_batches").insert({
    purchase_date: d.purchase_date,
    supplier: d.supplier || null,
    kg_purchased: d.kg_purchased,
    price_per_kg: d.price_per_kg,
    drying_cost: d.drying_cost,
    milling_cost: d.milling_cost,
    transport_cost: d.transport_cost,
    packaging_cost: d.packaging_cost,
    other_cost: d.other_cost,
    milling_method: d.milling_method,
    milling_recovery: d.milling_recovery,
    notes: d.notes || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}

export async function addMillingRun(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = millingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("milling_runs").insert({
    run_date: d.run_date,
    batch_id: d.batch_id || null,
    palay_kg_milled: d.palay_kg_milled,
    rice_kg_produced: d.rice_kg_produced,
    notes: d.notes || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
