"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { batchSchema, millingSchema } from "@/lib/validation/inventory";

export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
};
export type ActionResult = { ok?: boolean; error?: string };

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

function revalidateInventory() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/dashboard");
}

// Create or edit a palay batch. The DB generates the derived costs
// (total_batch_cost, expected_rice_kg, cost_per_kg_rice).
export async function saveBatch(
  values: unknown,
  id?: string,
): Promise<FormState> {
  const parsed = batchSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const payload = {
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
  };
  const res = id
    ? await supabase.from("palay_batches").update(payload).eq("id", id).select("id").single()
    : await supabase.from("palay_batches").insert(payload).select("id").single();
  if (res.error) return { error: res.error.message };
  revalidateInventory();
  return { ok: true, id: res.data.id };
}

// Delete a batch only if nothing depends on it (a milling run that drew from it,
// or a posted books entry). Otherwise it stays.
export async function deleteBatch(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const [{ data: runs }, { data: posted }] = await Promise.all([
    supabase.from("milling_runs").select("id").eq("batch_id", id).limit(1),
    supabase.from("transactions").select("id").eq("related_batch_id", id).limit(1),
  ]);
  if (runs && runs.length > 0) {
    return { error: "A milling run is linked to this batch — unlink it first." };
  }
  if (posted && posted.length > 0) {
    return { error: "This batch has posted books entries — delete those first." };
  }
  const { error } = await supabase.from("palay_batches").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateInventory();
  return { ok: true };
}

export async function saveMilling(
  values: unknown,
  id?: string,
): Promise<FormState> {
  const parsed = millingSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const payload = {
    run_date: d.run_date,
    batch_id: d.batch_id || null,
    palay_kg_milled: d.palay_kg_milled,
    rice_kg_produced: d.rice_kg_produced,
    notes: d.notes || null,
  };
  const res = id
    ? await supabase.from("milling_runs").update(payload).eq("id", id).select("id").single()
    : await supabase.from("milling_runs").insert(payload).select("id").single();
  if (res.error) return { error: res.error.message };
  revalidateInventory();
  return { ok: true, id: res.data.id };
}

export async function deleteMilling(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("milling_runs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateInventory();
  return { ok: true };
}
