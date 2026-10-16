"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validation/settings";

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

export async function updateSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: issuesToMap(parsed.error.issues),
    };
  }
  const d = parsed.data;
  const supabase = await createClient();

  // The singleton settings row (id = true).
  const { error: sErr } = await supabase
    .from("settings")
    .update({
      business_name: d.business_name,
      default_price_per_kg: d.default_price_per_kg,
      milling_recovery: d.milling_recovery,
      mill_days_before_delivery: d.mill_days_before_delivery,
    })
    .eq("id", true);
  if (sErr) return { error: sErr.message };

  // Keep the storefront product price aligned with the default selling price.
  const { error: pErr } = await supabase
    .from("products")
    .update({ price_per_kg: d.default_price_per_kg })
    .eq("slug", "nsic-rc-160");
  if (pErr) return { error: pErr.message };

  revalidatePath("/admin/settings");
  revalidatePath("/admin/costing");
  revalidatePath("/");
  revalidatePath("/order");
  return { ok: true };
}
